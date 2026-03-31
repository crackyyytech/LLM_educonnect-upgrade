import { useRef, useEffect, useState, useCallback } from 'react';

const QUICK_QUESTIONS = {
  'தமிழ்':           ['இந்த பாடத்தின் சுருக்கம் என்ன?', 'முக்கிய கவிஞர்கள் யார்?', 'இலக்கண விதிகள் விளக்கு'],
  'English':          ['Summarize this lesson', 'Explain the grammar rule', 'Key vocabulary words?'],
  'கணிதம்':          ['Explain this concept step by step', 'Give me a practice problem', 'What is the formula?'],
  'அறிவியல்':        ['Explain this experiment', 'What are the key concepts?', 'Real-life applications?'],
  'இயற்பியல்':       ['Explain this law/theorem', 'Derivation steps?', 'Numerical example?'],
  'வேதியியல்':       ['Explain this reaction', 'Balancing equation help?', 'Key properties?'],
  'தாவரவியல்':       ['Explain this process', 'Diagram description?', 'Classification?'],
  'விலங்கியல்':      ['Explain this system', 'Key differences?', 'Life cycle?'],
  'சமூக அறிவியல்':  ['Key historical events?', 'Map-based question help', 'Important dates?'],
  'கணினி அறிவியல்': ['Explain this algorithm', 'Code example?', 'Key concepts?'],
  default:            ['Explain this topic', 'Give me a summary', 'Practice question?'],
};

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, (_,c) => `<pre><code>${c.replace(/^[a-z]*\n/,'')}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^\d+\. (.+)$/gm, '<li style="list-style:decimal;margin-left:18px">$1</li>')
    .replace(/^[-•] (.+)$/gm, '<li style="list-style:disc;margin-left:18px">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default function Tutor({
  messages, setMessages, input, setInput,
  loading, setLoading, lang, setLang,
  configured, setConfigured,
  selectedSubject, selectedClass, activeVideo,
}) {
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const [copied, setCopied] = useState(null);
  const MAX = 500;

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const quickQs = QUICK_QUESTIONS[selectedSubject?.name] || QUICK_QUESTIONS.default;

  const copyMsg = (text, idx) => {
    navigator.clipboard?.writeText(text).then(() => { setCopied(idx); setTimeout(() => setCopied(null), 1800); });
  };

  const ask = useCallback(async (override) => {
    const q = (override || input).trim();
    if (!q || loading) return;
    setInput('');
    inputRef.current?.focus();
    const userMsg = { role: 'user', text: q, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    const history = messages.slice(-12).map(m => ({ role: m.role === 'user' ? 'user' : 'ai', text: m.text }));
    try {
      const token = localStorage.getItem('kalvi_token');
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          question: q, subject: selectedSubject?.name || 'General',
          classNum: selectedClass?.class, classLabel: selectedClass?.label,
          videoTitle: activeVideo?.title, videoDescription: activeVideo?.description,
          history, lang,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        if (res.status === 503) setConfigured(false);
        setMessages(prev => [...prev, { role: 'ai', text: err.error || 'Error', ts: Date.now(), isError: true }]);
        setLoading(false); return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';
      const aiId = Date.now();
      setMessages(prev => [...prev, { role: 'ai', text: '', ts: aiId, streaming: true }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const { text, error } = JSON.parse(data);
            if (error) { aiText += '\n⚠️ ' + error; break; }
            if (text) { aiText += text; setMessages(prev => prev.map(m => m.ts === aiId ? { ...m, text: aiText } : m)); }
          } catch {}
        }
      }
      setMessages(prev => prev.map(m => m.ts === aiId ? { ...m, streaming: false } : m));
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '⚠️ Network error. Check server.', ts: Date.now(), isError: true }]);
    } finally { setLoading(false); }
  }, [input, loading, messages, lang, selectedSubject, selectedClass, activeVideo]);

  return (
    <div className="tutor-panel">
      <div className="tutor-header">
        <div className="tutor-title">
          🤖 AI Tutor
          <span className="tutor-badge">Gemini</span>
        </div>
        <div className="flex items-center gap-2">
          <select className="tutor-lang-select" value={lang} onChange={e => setLang(e.target.value)}>
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
          </select>
          {messages.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={() => setMessages([])} title="Clear chat">🗑</button>
          )}
        </div>
      </div>

      {!configured && (
        <div className="tutor-not-configured">
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔑</div>
          <div style={{ fontWeight: 700, color: 'var(--warn)', marginBottom: 6 }}>Setup Required</div>
          <div>Add <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4, fontSize: '0.75rem' }}>GEMINI_API_KEY=your_key</code> to <code style={{ background: 'var(--bg3)', padding: '1px 5px', borderRadius: 4, fontSize: '0.75rem' }}>server/.env</code><br />
          Get a free key at <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>aistudio.google.com</a></div>
        </div>
      )}

      <div className="tutor-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🎓</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6, fontFamily: 'Noto Sans Tamil, sans-serif' }}>
              {lang === 'ta' ? 'வணக்கம்! நான் உங்கள் AI ஆசிரியர்.' : "Hello! I'm your AI Tutor."}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text3)', marginBottom: 16, fontFamily: 'Noto Sans Tamil, sans-serif', lineHeight: 1.6 }}>
              {lang === 'ta' ? `${selectedSubject?.name || 'இந்த பாடம்'} பற்றி எந்த கேள்வியும் கேளுங்கள்.` : `Ask me anything about ${selectedSubject?.name || 'this subject'}.`}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {quickQs.map((q, i) => (
                <button key={i} onClick={() => ask(q)} style={{ padding: '8px 12px', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', cursor: 'pointer', fontSize: '0.73rem', color: 'var(--text2)', textAlign: 'left', transition: 'all 0.15s', fontFamily: 'Noto Sans Tamil, sans-serif' }}
                  onMouseEnter={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text2)'; }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`tutor-msg${msg.role === 'user' ? ' tutor-msg-user' : ''}${msg.isError ? ' tutor-msg-error' : ''}`}>
            <div className={`tutor-msg-avatar${msg.role === 'ai' ? ' tutor-msg-avatar-ai' : ' tutor-msg-avatar-user'}`}>
              {msg.role === 'ai' ? '🤖' : '👤'}
            </div>
            <div>
              <div className={`tutor-msg-bubble${msg.role === 'user' ? ' tutor-msg-user' : ' tutor-msg-ai'}`}>
                {msg.streaming
                  ? <>{msg.text}<span className="tutor-cursor" style={{ display: 'inline-block', animation: 'blink 0.7s step-end infinite', color: 'var(--accent)', fontWeight: 700 }}>▋</span></>
                  : <span dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }} />
                }
              </div>
              {!msg.streaming && msg.text && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="tutor-msg-time">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.role === 'ai' && (
                    <button onClick={() => copyMsg(msg.text, i)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 7px', cursor: 'pointer', fontSize: '0.62rem', color: 'var(--text3)', transition: 'all 0.15s' }}>
                      {copied === i ? '✓ Copied' : '⎘ Copy'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role !== 'ai' && (
          <div className="tutor-msg">
            <div className="tutor-msg-avatar tutor-msg-avatar-ai">🤖</div>
            <div className="tutor-msg-bubble tutor-msg-ai">
              <div className="tutor-typing"><div className="tutor-dot" /><div className="tutor-dot" /><div className="tutor-dot" /></div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="tutor-input-wrap">
        <textarea
          ref={inputRef}
          className="tutor-input"
          placeholder={lang === 'ta' ? 'கேள்வி கேளுங்கள்...' : 'Ask a question... (Enter to send)'}
          value={input}
          onChange={e => setInput(e.target.value.slice(0, MAX))}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(); } }}
          rows={2} disabled={loading}
        />
        <button className="tutor-send" onClick={() => ask()} disabled={loading || !input.trim()}>
          {loading ? <span className="login-spinner" /> : '➤'}
        </button>
      </div>
      {input.length > 0 && (
        <div style={{ padding: '2px 12px 8px', fontSize: '0.62rem', color: input.length > MAX * 0.9 ? 'var(--warn)' : 'var(--text3)', textAlign: 'right' }}>
          {input.length}/{MAX}
        </div>
      )}
    </div>
  );
}
