import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import defaultData from './data/playlists.json';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useToast } from './hooks/useToast';
import { useAuth } from './context/useAuth.js';
import Header from './components/Header.jsx';
import VideoPlayer from './components/VideoPlayer.jsx';
import Sidebar from './components/Sidebar.jsx';
import Modals from './components/Modals.jsx';
import ManagePanel from './components/ManagePanel.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import TeacherPanel from './components/TeacherPanel.jsx';

const DEFAULT_CLASSES = defaultData.classes;
const DATA_VERSION    = defaultData.version || 1;

// Clear stale localStorage classesData when data version changes
const storedVersion = parseInt(localStorage.getItem('classesDataVersion') || '0');
if (storedVersion < DATA_VERSION) {
  localStorage.removeItem('classesData');
  localStorage.setItem('classesDataVersion', String(DATA_VERSION));
}

function buildSearchIndex(classes) {
  return classes.flatMap(cls =>
    cls.subjects.map(sub => ({ classNum: cls.class, classLabel: cls.label, ...sub }))
  );
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function calcStreak(days) {
  if (!days?.length) return 0;
  const sorted = [...new Set(days)].sort().reverse();
  let streak = 0;
  for (const d of sorted) {
    const diff = Math.round((new Date(sorted[0]) - new Date(d)) / 86400000);
    if (diff === streak) streak++;
    else break;
  }
  return streak;
}

export default function App() {
  const [classesData, setClassesData] = useLocalStorage('classesData', DEFAULT_CLASSES);
  const CLASSES = classesData;
  const SEARCH_INDEX = buildSearchIndex(CLASSES);

  const [showManage, setShowManage]           = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showTeacherPanel, setShowTeacherPanel] = useState(false);

  const { user, logout, syncProgress } = useAuth();

  // ── Core state ──
  const [view, setView]                   = useState('home');
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [videos, setVideos]               = useState([]);
  const [playlistInfo, setPlaylistInfo]   = useState(null);
  const [activeVideo, setActiveVideo]     = useState(null);
  const [activeIndex, setActiveIndex]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [nextPageToken, setNextPageToken] = useState(null);
  const [totalResults, setTotalResults]   = useState(0);
  const [currentPlId, setCurrentPlId]     = useState('');

  // ── Persisted state ──
  const [theme, setTheme]                 = useLocalStorage('theme', 'dark');
  const [favorites, setFavorites]         = useLocalStorage('favorites', []);
  const [watchedIds, setWatchedIds]       = useLocalStorage('watchedIds', []);
  const [continueWatching, setContinueWatching] = useLocalStorage('continueWatching', []);
  const [notes, setNotes]                 = useLocalStorage('notes', {});
  const [autoplay, setAutoplay]           = useLocalStorage('autoplay', true);
  const [recentlyWatched, setRecentlyWatched] = useLocalStorage('recentlyWatched', []);
  const [watchStats, setWatchStats]       = useLocalStorage('watchStats', { totalWatched: 0, subjectsCovered: [] });
  const [shuffle, setShuffle]             = useLocalStorage('shuffle', false);
  const [sleepAfter, setSleepAfter]       = useLocalStorage('sleepAfter', 0);
  const [repeatMode, setRepeatMode]       = useLocalStorage('repeatMode', 'none');
  const [playbackSpeed, setPlaybackSpeed] = useLocalStorage('playbackSpeed', 1);
  const [queue, setQueue]                 = useLocalStorage('queue', []);
  const [streakDays, setStreakDays]       = useLocalStorage('streakDays', []);
  const [completedSubjects, setCompletedSubjects] = useLocalStorage('completedSubjects', []);
  const [tutorLang, setTutorLang]         = useLocalStorage('tutorLang', 'en');

  // ── UI state ──
  const [sidebarTab, setSidebarTab]       = useState('playlist');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [showNotes, setShowNotes]         = useState(false);
  const [noteText, setNoteText]           = useState('');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showStats, setShowStats]         = useState(false);
  const [showHistory, setShowHistory]     = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearch, setGlobalSearch]   = useState('');
  const [sleepCount, setSleepCount]       = useState(0);
  const [showSleepMenu, setShowSleepMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [focusMode, setFocusMode]         = useState(false);
  const [showQueue, setShowQueue]         = useState(false);
  const [isOnline, setIsOnline]           = useState(navigator.onLine);
  const [swipeHint, setSwipeHint]         = useState(null);
  const [videoEnded, setVideoEnded]       = useState(false);
  const [miniPlayer, setMiniPlayer]       = useState(null);
  const [homeSearch, setHomeSearch]       = useState('');

  // ── AI Tutor state ──
  const [tutorMessages, setTutorMessages] = useState([]);
  const [tutorInput, setTutorInput]       = useState('');
  const [tutorLoading, setTutorLoading]   = useState(false);
  const [tutorConfigured, setTutorConfigured] = useState(true);

  const { toasts, show: toast, dismiss } = useToast();
  const sidebarRef      = useRef(null);
  const globalSearchRef = useRef(null);
  const swipeRef        = useRef({ x: 0, y: 0 });
  const activeVideoRef  = useRef(null);
  const activeIndexRef  = useRef(0);

  useEffect(() => { activeVideoRef.current = activeVideo; }, [activeVideo]);
  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
  useEffect(() => { if (activeVideo) setNoteText(notes[activeVideo.videoId] || ''); }, [activeVideo?.videoId]);

  // Auto-open student's class on login
  useEffect(() => {
    if (user?.role === 'student' && user?.classNum && view === 'home') {
      const cls = CLASSES.find(c => c.class === user.classNum);
      if (cls) openClass(cls);
    }
  }, [user?.role, user?.classNum]);

  // Online/offline
  useEffect(() => {
    const on  = () => { setIsOnline(true);  toast('🌐 Back online', 'success'); };
    const off = () => { setIsOnline(false); toast('📵 You are offline', 'warn'); };
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // Load YT IFrame API once
  useEffect(() => {
    if (window.YT?.Player) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
  }, []);

  // ── Streak ──
  const recordStreak = useCallback(() => {
    const today = todayStr();
    setStreakDays(prev => prev.includes(today) ? prev : [...prev, today]);
  }, []);

  // ── Sync progress to server ──
  useEffect(() => {
    const t = setTimeout(() => {
      syncProgress({ watchedIds, completedSubjects, streakDays });
    }, 2000);
    return () => clearTimeout(t);
  }, [watchedIds, completedSubjects, streakDays]);

  // ── Video end handler ──
  const handleVideoEnd = useCallback(() => {
    const vid = activeVideoRef.current;
    const idx = activeIndexRef.current;
    if (!vid) return;
    setWatchedIds(prev => {
      const already = prev.includes(vid.videoId);
      const next = already ? prev : [...prev, vid.videoId];
      if (!already) {
        setWatchStats(s => ({ ...s, totalWatched: next.length }));
        recordStreak();
        toast('✅ பாடம் முடிந்தது! அடுத்த பாடம் திறக்கப்பட்டது.', 'success');
      }
      setVideoEnded(true);
      setAutoplay(autoOn => {
        if (autoOn) {
          setVideos(vids => {
            if (idx < vids.length - 1) {
              setTimeout(() => { setActiveVideo(vids[idx + 1]); setActiveIndex(idx + 1); }, 1500);
            }
            return vids;
          });
        }
        return autoOn;
      });
      return next;
    });
  }, [recordStreak]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const h = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape') closeModals();
      if (e.key === '?') setShowShortcuts(s => !s);
      if (e.key === '/') { e.preventDefault(); setShowGlobalSearch(true); setTimeout(() => globalSearchRef.current?.focus(), 50); }
      if (e.key === 'q') setShowQueue(s => !s);
      if (view !== 'player') return;
      if (e.key === 'ArrowRight' || e.key === 'n') nextVideo();
      if (e.key === 'ArrowLeft'  || e.key === 'p') prevVideo();
      if (e.key === 'f') toggleFavorite(activeVideo);
      if (e.key === 'z') setFocusMode(s => !s);
      if (e.key === 'm' || e.key === 'M') markCurrentWatched();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [view, activeVideo, activeIndex, videos]);

  // ── Data fetching ──
  const fetchPlaylist = useCallback(async (id, pageToken = '') => {
    setLoading(true); setError('');
    try {
      const res = await axios.get(`/api/playlist/${id}${pageToken ? '?pageToken=' + pageToken : ''}`);
      if (pageToken) {
        setVideos(prev => [...prev, ...res.data.videos]);
        toast(`+${res.data.videos.length} videos loaded`, 'info');
      } else {
        const vids = res.data.videos;
        setVideos(vids); setActiveVideo(vids[0] || null); setActiveIndex(0);
        setPlaylistInfo(res.data.playlistInfo); setCurrentPlId(id); setView('player');
        setMiniPlayer(null);
        if (vids[0]) saveCW(id, vids[0], res.data.playlistInfo?.title);
        toast(`${vids.length} videos loaded`, 'success');
      }
      setNextPageToken(res.data.nextPageToken); setTotalResults(res.data.totalResults);
    } catch (err) {
      setError(err.response?.data?.error || 'பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.');
    } finally { setLoading(false); }
  }, []);

  // ── Core actions ──
  const saveCW = (plId, video, plTitle) => {
    if (!video) return;
    setContinueWatching(prev => [{ plId, plTitle, video }, ...prev.filter(x => x.plId !== plId)].slice(0, 6));
  };
  const addRecent = (video, plTitle) => {
    if (!video) return;
    setRecentlyWatched(prev => [{ ...video, plTitle, watchedAt: Date.now() }, ...prev.filter(x => x.videoId !== video.videoId)].slice(0, 30));
  };
  const selectVideo = (video, index) => {
    setActiveVideo(video); setActiveIndex(index); setVideoEnded(false);
    saveCW(currentPlId, video, playlistInfo?.title);
    addRecent(video, playlistInfo?.title || selectedSubject?.name);
    if (selectedSubject) {
      setWatchStats(s => ({
        ...s,
        subjectsCovered: s.subjectsCovered.includes(selectedSubject.name)
          ? s.subjectsCovered : [...s.subjectsCovered, selectedSubject.name],
      }));
    }
    sidebarRef.current?.querySelectorAll('.vitem')[index]?.scrollIntoView({ block: 'nearest' });
  };
  const toggleFavorite = (video) => {
    if (!video) return;
    setFavorites(prev => {
      const exists = prev.find(v => v.videoId === video.videoId);
      if (exists) { toast('Removed from favorites', 'warn'); return prev.filter(v => v.videoId !== video.videoId); }
      toast('⭐ Added to favorites', 'success');
      return [video, ...prev].slice(0, 50);
    });
  };
  const isFav = (id) => favorites.some(v => v.videoId === id);
  const addToQueue = (video) => {
    setQueue(prev => {
      if (prev.find(v => v.videoId === video.videoId)) { toast('Already in queue', 'warn'); return prev; }
      toast('➕ Added to queue', 'success');
      return [...prev, video];
    });
  };
  const saveNote = () => {
    if (!activeVideo) return;
    setNotes(prev => ({ ...prev, [activeVideo.videoId]: noteText }));
    toast('💾 Note saved', 'success');
  };
  const exportNotes = () => {
    const entries = Object.entries(notes);
    if (!entries.length) { toast('No notes to export', 'warn'); return; }
    const text = entries.map(([id, n]) => `Video: ${id}\n${n}\n${'─'.repeat(40)}`).join('\n\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })),
      download: 'suct-educonnect-notes.txt',
    });
    a.click(); URL.revokeObjectURL(a.href);
    toast('📥 Notes exported', 'success');
  };
  const shareVideo = () => {
    const url = `https://www.youtube.com/watch?v=${activeVideo?.videoId}`;
    navigator.clipboard?.writeText(url).then(() => toast('🔗 Link copied!', 'success')).catch(() => toast(`Copy: ${url}`, 'info'));
  };
  const markSubjectComplete = (subName) => {
    setCompletedSubjects(prev => prev.includes(subName) ? prev : [...prev, subName]);
    toast('🏆 Subject marked complete!', 'success');
  };
  const markAllWatched = () => {
    const ids = videos.map(v => v.videoId);
    setWatchedIds(prev => {
      const merged = [...new Set([...prev, ...ids])];
      setWatchStats(s => ({ ...s, totalWatched: merged.length }));
      return merged;
    });
    toast('✓ All marked as watched', 'success');
  };
  const downloadPlaylist = () => {
    const dl = { playlist: playlistInfo?.title || selectedSubject?.name, videos: videos.map(v => ({ id: v.videoId, title: v.title })) };
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([JSON.stringify(dl, null, 2)], { type: 'application/json' })),
      download: 'playlist.json',
    });
    a.click(); URL.revokeObjectURL(a.href);
    toast('📥 Playlist downloaded', 'success');
  };
  const clearHistory = () => { setRecentlyWatched([]); toast('History cleared', 'info'); };
  const removeCW = (plId) => { setContinueWatching(prev => prev.filter(x => x.plId !== plId)); };
  const handleCustomPlaylist = (id) => {
    setSelectedSubject({ name: `Playlist: ${id}`, id });
    setSelectedClass(null);
    setVideos([]); setNextPageToken(null);
    fetchPlaylist(id);
  };
  const markCurrentWatched = () => {
    const vid = activeVideoRef.current;
    if (!vid) return;
    setWatchedIds(prev => {
      if (prev.includes(vid.videoId)) { toast('Already marked watched', 'info'); return prev; }
      const next = [...prev, vid.videoId];
      setWatchStats(s => ({ ...s, totalWatched: next.length }));
      recordStreak();
      toast('✅ Marked as watched', 'success');
      return next;
    });
  };
  const closeModals = () => {
    setShowShortcuts(false); setShowStats(false); setShowHistory(false);
    setShowGlobalSearch(false); setShowSleepMenu(false); setShowSpeedMenu(false);
    setShowQueue(false); setGlobalSearch('');
  };
  const getClassProgress = (cls) => {
    const covered = watchStats.subjectsCovered.filter(s => cls.subjects.some(sub => sub.name === s)).length;
    return cls.subjects.length > 0 ? Math.round((covered / cls.subjects.length) * 100) : 0;
  };

  // ── Navigation ──
  const openClass = (cls) => { setSelectedClass(cls); setView('subjects'); setError(''); };
  const openSubject = (sub) => {
    setSelectedSubject(sub); setVideos([]); setNextPageToken(null);
    setSidebarSearch(''); setSidebarTab('playlist');
    if (activeVideo && view === 'player') {
      setMiniPlayer({ video: activeVideo, plId: currentPlId, plTitle: playlistInfo?.title || selectedSubject?.name });
    }
    fetchPlaylist(sub.id);
  };
  const goHome = () => {
    if (activeVideo && view === 'player') {
      setMiniPlayer({ video: activeVideo, plId: currentPlId, plTitle: playlistInfo?.title || selectedSubject?.name });
    }
    setView('home'); setSelectedClass(null); setSelectedSubject(null);
    setVideos([]); setActiveVideo(null); setPlaylistInfo(null); setError('');
  };
  const goSubjects = () => {
    if (activeVideo && view === 'player') {
      setMiniPlayer({ video: activeVideo, plId: currentPlId, plTitle: playlistInfo?.title || selectedSubject?.name });
    }
    setView('subjects'); setVideos([]); setActiveVideo(null); setPlaylistInfo(null); setError('');
  };
  const resumeMiniPlayer = () => {
    if (!miniPlayer) return;
    setSelectedSubject({ name: miniPlayer.plTitle, id: miniPlayer.plId });
    setVideos([]); setNextPageToken(null);
    fetchPlaylist(miniPlayer.plId);
    setMiniPlayer(null);
  };

  // ── Playback ──
  const isUnlocked = (index) => index === 0 || watchedIds.includes(videos[index - 1]?.videoId);
  const trySelectVideo = (video, index) => {
    if (index < 0) return;
    if (!isUnlocked(index)) {
      toast('🔒 Watch the previous lesson first!', 'warn');
      sidebarRef.current?.querySelectorAll('.vitem')[index - 1]?.scrollIntoView({ block: 'nearest' });
      return;
    }
    selectVideo(video, index);
    if (sleepAfter > 0) {
      const next = sleepCount + 1;
      setSleepCount(next);
      if (next >= sleepAfter) { setSleepCount(0); setSleepAfter(0); toast('😴 Sleep timer — stopping', 'info'); }
    }
  };
  const nextVideo = () => {
    if (sleepAfter > 0 && sleepCount + 1 >= sleepAfter) { setSleepCount(0); setSleepAfter(0); toast('😴 Sleep timer reached', 'info'); return; }
    if (queue.length > 0) {
      const next = queue[0]; setQueue(prev => prev.slice(1));
      trySelectVideo(next, videos.findIndex(v => v.videoId === next.videoId));
      return;
    }
    if (shuffle) {
      let idx; do { idx = Math.floor(Math.random() * videos.length); } while (idx === activeIndex && videos.length > 1);
      trySelectVideo(videos[idx], idx); return;
    }
    if (repeatMode === 'one') { selectVideo(videos[activeIndex], activeIndex); return; }
    if (activeIndex < videos.length - 1) trySelectVideo(videos[activeIndex + 1], activeIndex + 1);
    else if (repeatMode === 'all') { trySelectVideo(videos[0], 0); toast('🔁 Playlist restarted', 'info'); }
  };
  const prevVideo = () => {
    if (activeIndex > 0) selectVideo(videos[activeIndex - 1], activeIndex - 1);
    else if (repeatMode === 'all') selectVideo(videos[videos.length - 1], videos.length - 1);
  };
  const cycleRepeat = () => {
    const modes = ['none', 'all', 'one'];
    const next = modes[(modes.indexOf(repeatMode) + 1) % 3];
    setRepeatMode(next);
    toast(next === 'none' ? 'Repeat off' : next === 'all' ? '🔁 Repeat all' : '🔂 Repeat one', 'info');
  };

  // ── Swipe ──
  const onTouchStart = (e) => { swipeRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const onTouchEnd   = (e) => {
    const dx = e.changedTouches[0].clientX - swipeRef.current.x;
    const dy = e.changedTouches[0].clientY - swipeRef.current.y;
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) { nextVideo(); setSwipeHint('left');  setTimeout(() => setSwipeHint(null), 700); }
    else        { prevVideo(); setSwipeHint('right'); setTimeout(() => setSwipeHint(null), 700); }
  };

  // ── Derived ──
  const globalResults = globalSearch.trim().length > 1
    ? SEARCH_INDEX.filter(i =>
        i.name.toLowerCase().includes(globalSearch.toLowerCase()) ||
        i.classLabel.toLowerCase().includes(globalSearch.toLowerCase()) ||
        String(i.classNum).includes(globalSearch))
    : [];
  const filteredVideos = sidebarSearch.trim()
    ? videos.filter(v => v.title.toLowerCase().includes(sidebarSearch.toLowerCase()))
    : videos;
  const progressPct = totalResults > 0
    ? Math.round((watchedIds.filter(id => videos.some(v => v.videoId === id)).length / Math.min(totalResults, videos.length)) * 100)
    : 0;
  const streak = calcStreak(streakDays);

  return (
    <div className={`app${focusMode ? ' focus-mode' : ''}`}>
      {!isOnline && <div className="offline-banner">📵 நீங்கள் ஆஃப்லைனில் உள்ளீர்கள் — சில அம்சங்கள் வேலை செய்யாது</div>}

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`} onClick={() => dismiss(t.id)}>
            {t.msg}
          </div>
        ))}
      </div>

      {miniPlayer && (
        <div className="mini-player">
          <img src={miniPlayer.video.thumbnail} alt={miniPlayer.video.title} className="mini-thumb" />
          <div className="mini-info">
            <div className="mini-title">{miniPlayer.video.title.slice(0, 45)}</div>
            <div className="mini-sub">{miniPlayer.plTitle}</div>
          </div>
          <button className="mini-resume" onClick={resumeMiniPlayer}>▶ Resume</button>
          <button className="mini-close" onClick={() => setMiniPlayer(null)}>✕</button>
        </div>
      )}

      <Header
        theme={theme} setTheme={setTheme}
        selectedClass={selectedClass} selectedSubject={selectedSubject}
        view={view} goHome={goHome} goSubjects={goSubjects}
        streak={streak} isOnline={isOnline}
        onSearch={() => { setShowGlobalSearch(true); setTimeout(() => globalSearchRef.current?.focus(), 50); }}
        onStats={() => setShowStats(true)}
        onHistory={() => setShowHistory(true)}
        onExportNotes={exportNotes}
        onShortcuts={() => setShowShortcuts(s => !s)}
        queue={queue}
        onCustomPlaylist={handleCustomPlaylist}
        onManage={() => setShowManage(true)}
        onTeacherPanel={() => setShowTeacherPanel(true)}
        onAdminDashboard={() => setShowAdminDashboard(true)}
        user={user}
        onLogout={logout}
      />

      {loading && <div className="progress"><div className="progress-bar" /></div>}
      {error && (
        <div className="error-box">
          <span>⚠️ {error}</span>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {currentPlId && <button className="err-retry" onClick={() => fetchPlaylist(currentPlId)}>🔄 Retry</button>}
            <button className="err-close" onClick={() => setError('')}>✕</button>
          </div>
        </div>
      )}

      {/* ── HOME ── */}
      {view === 'home' && (
        <main className="page">
          <div className="hero">
            <h1>சமச்சீர் கல்வி வீடியோக்கள்</h1>
            {user?.role === 'student'
              ? <p>வணக்கம் {user.name.split(' ')[0]}!{user.classNum ? ` வகுப்பு ${user.classNum} —` : ''} Suct EduConnect</p>
              : user?.role === 'teacher'
              ? <p>வணக்கம் {user.name.split(' ')[0]}!{user.subject ? ` ${user.subject} —` : ''} Suct EduConnect</p>
              : <p>Suct EduConnect — வகுப்பை தேர்ந்தெடுக்கவும்</p>
            }
            {streak > 0 && <div className="streak-hero">🔥 {streak} day streak — keep it up!</div>}

            {/* Live stats row */}
            <div className="hero-stats">
              <div className="hero-stat">
                <div className="hero-stat-num">{watchStats.totalWatched}</div>
                <div className="hero-stat-lbl">Videos Watched</div>
              </div>
              <div className="hero-stat-sep" />
              <div className="hero-stat">
                <div className="hero-stat-num">{completedSubjects.length}</div>
                <div className="hero-stat-lbl">Completed</div>
              </div>
              <div className="hero-stat-sep" />
              <div className="hero-stat">
                <div className="hero-stat-num">{favorites.length}</div>
                <div className="hero-stat-lbl">Favorites</div>
              </div>
              <div className="hero-stat-sep" />
              <div className="hero-stat">
                <div className="hero-stat-num">{CLASSES.length}</div>
                <div className="hero-stat-lbl">Classes</div>
              </div>
            </div>

            <input
              className="home-search"
              placeholder="🔍 வகுப்பு அல்லது பாடம் தேடவும்... (e.g. 10, கணிதம்)"
              value={homeSearch}
              onChange={e => setHomeSearch(e.target.value)}
            />
          </div>

          {continueWatching.length > 0 && (
            <section className="section">
              <div className="section-title">▶ தொடர்ந்து பார்க்கவும்</div>
              <div className="cw-grid">
                {continueWatching.map(cw => (
                  <div key={cw.plId} className="cw-card-wrap">
                    <button className="cw-card" onClick={() => {
                      setSelectedSubject({ name: cw.plTitle, id: cw.plId });
                      setVideos([]); fetchPlaylist(cw.plId);
                    }}>
                      <img src={cw.video.thumbnail} alt={cw.video.title} className="cw-thumb" />
                      <div className="cw-info">
                        <p className="cw-title">{cw.video.title}</p>
                        <p className="cw-pl">{cw.plTitle}</p>
                      </div>
                    </button>
                    <button className="cw-remove" onClick={() => removeCW(cw.plId)} title="Remove">✕</button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {favorites.length > 0 && (
            <section className="section">
              <div className="section-title">⭐ பிடித்தவை — {favorites.length} videos</div>
              <div className="fav-strip">
                {favorites.slice(0, 8).map(v => (
                  <button key={v.videoId} className="fav-chip" onClick={() => { setActiveVideo(v); setView('player'); }}>
                    <img src={v.thumbnail} alt={v.title} />
                    <span>{v.title.slice(0, 40)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="section">
            <div className="section-title">📚 வகுப்புகள் — Class 1 to 12</div>
            <div className="class-grid">
              {CLASSES.filter(cls => {
                if (user?.role === 'student' && user?.classNum) return cls.class === user.classNum;
                if (!homeSearch.trim()) return true;
                return (
                  String(cls.class).includes(homeSearch) ||
                  cls.label.toLowerCase().includes(homeSearch.toLowerCase()) ||
                  cls.subjects.some(s => s.name.toLowerCase().includes(homeSearch.toLowerCase()))
                );
              }).map(cls => {
                const pct = getClassProgress(cls);
                const isStudentClass = user?.role === 'student' && user?.classNum === cls.class;
                return (
                  <button key={cls.class} className={`class-card${isStudentClass ? ' class-card-mine' : ''}`} onClick={() => openClass(cls)}>
                    <span className="class-num">{cls.class}</span>
                    <span className="class-label">{cls.label}</span>
                    <span className="class-sub">{cls.subjects.length} பாடங்கள்</span>
                    {isStudentClass && <span className="class-mine-badge">உங்கள் வகுப்பு</span>}
                    {pct > 0 && (
                      <>
                        <div className="class-progress"><div className="class-progress-fill" style={{ width: pct + '%' }} /></div>
                        <span className="class-progress-label">{pct}% covered</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      )}

      {/* ── SUBJECTS ── */}
      {view === 'subjects' && selectedClass && (
        <main className="page">
          <div className="page-header">
            <div>
              <div className="page-title">{selectedClass.label}</div>
              <div className="page-sub">பாடத்தை தேர்ந்தெடுக்கவும் — {selectedClass.subjects.length} subjects</div>
            </div>
          </div>
          <div className="subject-grid">
            {selectedClass.subjects.map(sub => (
              <button
                key={sub.name}
                className={`subject-card${completedSubjects.includes(sub.name) ? ' sub-complete' : ''}`}
                onClick={() => openSubject(sub)}
                disabled={loading}
              >
                <span className="sub-icon">{sub.icon}</span>
                <div className="sub-body">
                  <span className="sub-name">{sub.name}</span>
                  {completedSubjects.includes(sub.name) && <span className="sub-badge">🏆 Done</span>}
                  {watchStats.subjectsCovered.includes(sub.name) && !completedSubjects.includes(sub.name) && (
                    <div className="sub-progress-wrap">
                      <div className="sub-progress-track"><div className="sub-progress-fill" style={{ width: '50%' }} /></div>
                      <span className="sub-progress-label">In progress</span>
                    </div>
                  )}
                </div>
                <span className="sub-arrow">›</span>
              </button>
            ))}
          </div>
        </main>
      )}

      {/* ── PLAYER ── */}
      {view === 'player' && (
        <main className={`player-layout${focusMode ? ' player-focus' : ''}`}>
          <section className="player-col">
            <VideoPlayer
              activeVideo={activeVideo} activeIndex={activeIndex} videos={videos}
              watchedIds={watchedIds} favorites={favorites} queue={queue}
              notes={notes} noteText={noteText} setNoteText={setNoteText}
              showNotes={showNotes} setShowNotes={setShowNotes}
              autoplay={autoplay} setAutoplay={setAutoplay}
              shuffle={shuffle} setShuffle={setShuffle}
              repeatMode={repeatMode} cycleRepeat={cycleRepeat}
              playbackSpeed={playbackSpeed} setPlaybackSpeed={setPlaybackSpeed}
              sleepAfter={sleepAfter} setSleepAfter={setSleepAfter}
              sleepCount={sleepCount} setSleepCount={setSleepCount}
              showSleepMenu={showSleepMenu} setShowSleepMenu={setShowSleepMenu}
              showSpeedMenu={showSpeedMenu} setShowSpeedMenu={setShowSpeedMenu}
              focusMode={focusMode} setFocusMode={setFocusMode}
              swipeHint={swipeHint} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
              videoEnded={videoEnded} setVideoEnded={setVideoEnded}
              selectedSubject={selectedSubject} completedSubjects={completedSubjects}
              isFav={isFav} toggleFavorite={toggleFavorite}
              addToQueue={addToQueue} shareVideo={shareVideo}
              saveNote={saveNote} exportNotes={exportNotes}
              nextVideo={nextVideo} prevVideo={prevVideo}
              handleVideoSelect={trySelectVideo}
              markSubjectComplete={markSubjectComplete}
              markCurrentWatched={markCurrentWatched}
              loading={loading}
              onVideoEnd={handleVideoEnd}
              toast={toast}
            />
          </section>
          <Sidebar
            sidebarRef={sidebarRef}
            sidebarTab={sidebarTab} setSidebarTab={setSidebarTab}
            videos={videos} filteredVideos={filteredVideos}
            activeVideo={activeVideo} activeIndex={activeIndex}
            watchedIds={watchedIds} favorites={favorites}
            notes={notes} setNotes={setNotes}
            queue={queue} setQueue={setQueue}
            recentlyWatched={recentlyWatched}
            playlistInfo={playlistInfo} selectedSubject={selectedSubject}
            totalResults={totalResults} nextPageToken={nextPageToken} currentPlId={currentPlId}
            loading={loading}
            sidebarSearch={sidebarSearch} setSidebarSearch={setSidebarSearch}
            progressPct={progressPct}
            isUnlocked={isUnlocked} trySelectVideo={trySelectVideo}
            isFav={isFav} toggleFavorite={toggleFavorite} addToQueue={addToQueue}
            markAllWatched={markAllWatched} downloadPlaylist={downloadPlaylist}
            fetchPlaylist={fetchPlaylist}
            exportNotes={exportNotes}
            toast={toast}
            tutorMessages={tutorMessages} setTutorMessages={setTutorMessages}
            tutorInput={tutorInput} setTutorInput={setTutorInput}
            tutorLoading={tutorLoading} setTutorLoading={setTutorLoading}
            tutorLang={tutorLang} setTutorLang={setTutorLang}
            tutorConfigured={tutorConfigured} setTutorConfigured={setTutorConfigured}
            selectedClass={selectedClass}
          />
        </main>
      )}

      <Modals
        showShortcuts={showShortcuts} showStats={showStats}
        showHistory={showHistory} showGlobalSearch={showGlobalSearch} showQueue={showQueue}
        closeModals={closeModals}
        globalSearch={globalSearch} setGlobalSearch={setGlobalSearch}
        globalSearchRef={globalSearchRef} globalResults={globalResults}
        CLASSES={CLASSES} setSelectedClass={setSelectedClass} openSubject={openSubject}
        watchStats={watchStats} favorites={favorites} notes={notes}
        streak={streak} completedSubjects={completedSubjects} streakDays={streakDays}
        watchedIds={watchedIds} setWatchedIds={setWatchedIds}
        setWatchStats={setWatchStats} setStreakDays={setStreakDays}
        setCompletedSubjects={setCompletedSubjects}
        recentlyWatched={recentlyWatched} clearHistory={clearHistory}
        queue={queue} setQueue={setQueue}
        setActiveVideo={setActiveVideo} setView={setView}
        exportNotes={exportNotes}
        toast={toast}
      />

      {showManage && (
        <ManagePanel
          classes={CLASSES}
          onSave={(data) => { setClassesData(data); toast('✅ Subjects saved', 'success'); }}
          onClose={() => setShowManage(false)}
          defaultClasses={DEFAULT_CLASSES}
          userRole={user?.role}
        />
      )}

      {showAdminDashboard && user?.role === 'admin' && (
        <AdminDashboard
          onClose={() => setShowAdminDashboard(false)}
          toast={toast}
        />
      )}

      {showTeacherPanel && (user?.role === 'teacher' || user?.role === 'admin') && (
        <TeacherPanel
          onClose={() => setShowTeacherPanel(false)}
          user={user}
          classesData={CLASSES}
          toast={toast}
        />
      )}
    </div>
  );
}
