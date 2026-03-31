require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const axios    = require('axios');
const mongoose = require('mongoose');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { seed: seedLocalDb }  = require('./localDb');

const app      = express();
const PORT     = process.env.PORT || 5000;
const YT_KEY   = process.env.YOUTUBE_API_KEY;
const YT_BASE  = 'https://www.googleapis.com/youtube/v3';

// ── MongoDB with local fallback ──
let usingLocalDb = false;
mongoose.connect(process.env.MONGO_URI || '', {
  serverSelectionTimeoutMS: 8000,
  connectTimeoutMS: 8000,
  socketTimeoutMS: 30000,
})
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => {
    console.warn('⚠️  MongoDB unreachable:', err.message);
    console.log('📁 Using local JSON database...');
    usingLocalDb = true;
    seedLocalDb();
  });

// ── Gemini AI ──
const genAI = process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your_')
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ── In-memory cache (TTL: 45 min) ──
const cache    = new Map();
const CACHE_TTL = 45 * 60 * 1000;
const cacheGet = (k) => { const e = cache.get(k); if (!e) return null; if (Date.now() - e.ts > CACHE_TTL) { cache.delete(k); return null; } return e.data; };
const cacheSet = (k, d) => cache.set(k, { data: d, ts: Date.now() });

// ── Simple rate limiter (per IP, per minute) ──
const rateLimits = new Map();
function rateLimit(max = 60) {
  return (req, res, next) => {
    const ip  = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const key = `${ip}:${Math.floor(now / 60000)}`;
    const cnt = (rateLimits.get(key) || 0) + 1;
    rateLimits.set(key, cnt);
    if (cnt > max) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' });
    next();
  };
}
// Clean old rate limit entries every 2 min
setInterval(() => {
  const cutoff = Math.floor(Date.now() / 60000) - 1;
  for (const k of rateLimits.keys()) {
    if (Number(k.split(':')[1]) < cutoff) rateLimits.delete(k);
  }
}, 120000);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Auth routes ──
const authRouter = require('./routes/auth');
app.use('/api/auth', (req, res, next) => {
  if (mongoose.connection.readyState !== 1 && !usingLocalDb)
    return res.status(503).json({ error: 'Database not ready.' });
  next();
});
app.use('/api/auth', (req, res, next) => { req.usingLocalDb = usingLocalDb; next(); });
app.use('/api/auth', authRouter);

// ── YouTube helper ──
function ytError(err) {
  const msg = err.response?.data?.error?.message || err.message || 'YouTube API error';
  const status = err.response?.status || 500;
  if (status === 403 && msg.includes('quota')) return { status: 429, msg: 'YouTube API quota exceeded. Try again tomorrow.' };
  if (status === 400) return { status: 400, msg: 'Invalid playlist or video ID.' };
  return { status, msg };
}

// GET /api/playlist/:id
app.get('/api/playlist/:playlistId', rateLimit(120), async (req, res) => {
  const { playlistId } = req.params;
  const { pageToken = '' } = req.query;
  const key = `pl:${playlistId}:${pageToken}`;
  const cached = cacheGet(key);
  if (cached) return res.json({ ...cached, fromCache: true });
  try {
    const [plRes, itemsRes] = await Promise.all([
      axios.get(`${YT_BASE}/playlists`, { params: { part: 'snippet', id: playlistId, key: YT_KEY } }),
      axios.get(`${YT_BASE}/playlistItems`, {
        params: { part: 'snippet,contentDetails', playlistId, maxResults: 20, pageToken, key: YT_KEY },
      }),
    ]);
    const playlistInfo = plRes.data.items?.[0]?.snippet || null;
    const videos = itemsRes.data.items
      .filter(i => !['Deleted video', 'Private video'].includes(i.snippet.title))
      .map(i => ({
        videoId:      i.contentDetails.videoId,
        title:        i.snippet.title,
        description:  i.snippet.description,
        thumbnail:    i.snippet.thumbnails?.medium?.url || i.snippet.thumbnails?.default?.url,
        publishedAt:  i.snippet.publishedAt,
        channelTitle: i.snippet.channelTitle,
        position:     i.snippet.position,
      }));
    const result = { playlistInfo, videos, nextPageToken: itemsRes.data.nextPageToken || null, totalResults: itemsRes.data.pageInfo?.totalResults || 0 };
    cacheSet(key, result);
    res.json(result);
  } catch (err) {
    const { status, msg } = ytError(err);
    res.status(status).json({ error: msg });
  }
});

// GET /api/search?q=...&type=video|playlist
app.get('/api/search', rateLimit(30), async (req, res) => {
  const { q, type = 'video', maxResults = 10 } = req.query;
  if (!q?.trim()) return res.status(400).json({ error: 'Query required' });
  const key = `search:${q}:${type}:${maxResults}`;
  const cached = cacheGet(key);
  if (cached) return res.json({ ...cached, fromCache: true });
  try {
    const r = await axios.get(`${YT_BASE}/search`, {
      params: { part: 'snippet', q, type, maxResults, key: YT_KEY, relevanceLanguage: 'ta', regionCode: 'IN' },
    });
    const items = r.data.items.map(i => ({
      id:           i.id.videoId || i.id.playlistId,
      type:         i.id.kind.includes('video') ? 'video' : 'playlist',
      title:        i.snippet.title,
      description:  i.snippet.description,
      thumbnail:    i.snippet.thumbnails?.medium?.url,
      channelTitle: i.snippet.channelTitle,
      publishedAt:  i.snippet.publishedAt,
    }));
    const result = { items, totalResults: r.data.pageInfo?.totalResults || 0 };
    cacheSet(key, result);
    res.json(result);
  } catch (err) {
    const { status, msg } = ytError(err);
    res.status(status).json({ error: msg });
  }
});

// GET /api/video/:videoId — with view count & duration
app.get('/api/video/:videoId', rateLimit(60), async (req, res) => {
  const { videoId } = req.params;
  const key = `vid:${videoId}`;
  const cached = cacheGet(key);
  if (cached) return res.json({ ...cached, fromCache: true });
  try {
    const r = await axios.get(`${YT_BASE}/videos`, {
      params: { part: 'snippet,statistics,contentDetails', id: videoId, key: YT_KEY },
    });
    const video = r.data.items?.[0];
    if (!video) return res.status(404).json({ error: 'Video not found' });
    cacheSet(key, video);
    res.json(video);
  } catch (err) {
    const { status, msg } = ytError(err);
    res.status(status).json({ error: msg });
  }
});

// GET /api/cache/stats
app.get('/api/cache/stats', (_req, res) => {
  res.json({ entries: cache.size, keys: [...cache.keys()].slice(0, 20) });
});

// DELETE /api/cache — admin cache clear
app.delete('/api/cache', (_req, res) => {
  cache.clear();
  res.json({ message: 'Cache cleared' });
});

// POST /api/tutor — Gemini AI streaming
app.post('/api/tutor', rateLimit(40), async (req, res) => {
  if (!genAI) return res.status(503).json({ error: 'AI Tutor not configured. Add GEMINI_API_KEY to server/.env' });

  const { question, subject, classNum, classLabel, videoTitle, videoDescription, history, lang } = req.body;
  if (!question?.trim()) return res.status(400).json({ error: 'Question is required' });

  const isTamil = lang === 'ta';
  const systemPrompt = `You are an expert AI tutor for Tamil Nadu Samacheer Kalvi curriculum (Suct EduConnect).
You are helping a student with: ${classLabel || `Class ${classNum}`} — ${subject}.
${videoTitle ? `The student is watching: "${videoTitle}".` : ''}
${videoDescription ? `Video context: ${videoDescription.slice(0, 400)}` : ''}

Rules:
- Answer ONLY questions related to this subject and Samacheer Kalvi syllabus.
- If asked about unrelated topics, politely redirect to the subject.
- Be encouraging, clear, and student-friendly.
- Use simple language appropriate for the class level.
- ${isTamil ? 'Respond in Tamil (தமிழில் பதில் அளிக்கவும்). Use Tamil script.' : 'Respond in English.'}
- For math/science, show step-by-step solutions with clear formatting.
- Use **bold** for key terms, numbered lists for steps, bullet points for lists.
- Keep answers focused and complete (max 400 words).`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 1024 },
    });
    const chatHistory = (history || []).slice(-8).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));
    const chat = model.startChat({ history: chatHistory });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const result = await chat.sendMessageStream(question);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Tutor error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'AI Tutor error' });
    else { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); }
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    db: usingLocalDb ? 'local-json' : 'mongodb',
    ai: genAI ? 'gemini-configured' : 'not-configured',
    cache: cache.size,
    uptime: Math.round(process.uptime()),
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Suct EduConnect Server → http://localhost:${PORT}`);
  console.log(`   DB: ${usingLocalDb ? '📁 Local JSON' : '🍃 MongoDB'}`);
  console.log(`   AI: ${genAI ? '🤖 Gemini ready' : '⚠️  No Gemini key'}\n`);
});
