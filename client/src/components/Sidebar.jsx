import { useState, useCallback } from 'react';
import Tutor from './Tutor.jsx';

const TABS = [
  { id: 'playlist',  label: 'Playlist' },
  { id: 'favorites', label: 'Saved' },
  { id: 'notes',     label: 'Notes' },
  { id: 'queue',     label: 'Queue' },
  { id: 'tutor',     label: '🤖 AI' },
];

export default function Sidebar({
  sidebarRef, sidebarTab, setSidebarTab,
  videos, filteredVideos, activeVideo, activeIndex,
  watchedIds, favorites, notes, setNotes,
  queue, setQueue, recentlyWatched,
  playlistInfo, selectedSubject, selectedClass,
  totalResults, nextPageToken, currentPlId, loading,
  sidebarSearch, setSidebarSearch, progressPct,
  isUnlocked, trySelectVideo, isFav, toggleFavorite, addToQueue,
  markAllWatched, downloadPlaylist, fetchPlaylist, exportNotes, toast,
  tutorMessages, setTutorMessages, tutorInput, setTutorInput,
  tutorLoading, setTutorLoading, tutorLang, setTutorLang,
  tutorConfigured, setTutorConfigured,
}) {
  const [wide, setWide] = useState(false);

  const scrollToCurrent = useCallback(() => {
    if (!sidebarRef.current || activeIndex < 0) return;
    sidebarRef.current.querySelectorAll('.vitem')[activeIndex]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeIndex]);

  const counts = { playlist: videos.length, favorites: favorites.length, notes: Object.keys(notes).length, queue: queue.length, tutor: 0 };

  return (
    <aside className={`sidebar${wide ? ' sidebar-wide' : ''}`} style={wide ? { minWidth: 460 } : {}}>
      {/* Tabs */}
      <div className="sidebar-tabs">
        {TABS.map(t => (
          <button key={t.id} className={`sidebar-tab${sidebarTab === t.id ? ' active' : ''}`} onClick={() => setSidebarTab(t.id)}>
            {t.label}
            {counts[t.id] > 0 && (
              <span className="badge badge-accent" style={{ marginLeft: 4, fontSize: '0.58rem', padding: '1px 5px' }}>{counts[t.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── PLAYLIST ── */}
      {sidebarTab === 'playlist' && (
        <>
          <div className="sidebar-header">
            <div>
              <div className="sidebar-pl-title">{playlistInfo?.title || selectedSubject?.name || 'Playlist'}</div>
              <div className="sidebar-pl-sub">{totalResults || videos.length} videos</div>
            </div>
            <div className="sidebar-pl-actions">
              <button className="sidebar-pl-btn" onClick={scrollToCurrent} title="Jump to current">⊙</button>
              <button className="sidebar-pl-btn" onClick={markAllWatched} title="Mark all watched">✓All</button>
              <button className="sidebar-pl-btn" onClick={downloadPlaylist} title="Download">↓</button>
              <button className="sidebar-pl-btn" onClick={() => setWide(w => !w)} title="Expand">{wide ? '◂' : '▸'}</button>
            </div>
          </div>

          {/* Progress bar */}
          {videos.length > 0 && (
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-muted">{progressPct}% watched</span>
                <span className="text-xs text-muted ml-auto">{watchedIds.filter(id => videos.some(v => v.videoId === id)).length}/{videos.length}</span>
              </div>
              <div className="v-progress-track"><div className="v-progress-fill" style={{ width: progressPct + '%' }} /></div>
            </div>
          )}

          {/* Search */}
          <div className="sidebar-search-wrap">
            <input
              className="sidebar-search"
              placeholder="🔍 Search videos..."
              value={sidebarSearch}
              onChange={e => setSidebarSearch(e.target.value)}
            />
          </div>

          {/* Video list */}
          <div className="sidebar-list" ref={sidebarRef}>
            {filteredVideos.length === 0 && (
              <div className="sidebar-empty">
                <div className="sidebar-empty-icon">🎬</div>
                {sidebarSearch ? 'No results found' : 'No videos loaded'}
              </div>
            )}
            {filteredVideos.map((v) => {
              const realIdx  = videos.indexOf(v);
              const locked   = !isUnlocked(realIdx);
              const isActive = activeVideo?.videoId === v.videoId;
              const watched  = watchedIds.includes(v.videoId);
              return (
                <div
                  key={v.videoId + realIdx}
                  className={`vitem${isActive ? ' active' : ''}${locked ? ' locked' : ''}`}
                  onClick={() => trySelectVideo(v, realIdx)}
                  role="button" tabIndex={0}
                >
                  <span className="vitem-num">{realIdx + 1}</span>
                  <div className="relative flex-shrink-0">
                    <img src={v.thumbnail} alt={v.title} className="vitem-thumb" loading="lazy" style={locked ? { filter: 'brightness(0.35) grayscale(0.7)' } : {}} />
                    {watched && !locked && <span className="vitem-watched" style={{ position: 'absolute', bottom: 2, right: 2, background: 'var(--success)', color: '#fff', fontSize: '0.5rem', padding: '1px 3px', borderRadius: 3, fontWeight: 700 }}>✓</span>}
                    {locked && <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: '1rem' }}>🔒</span>}
                    {isActive && <span className="vitem-playing" style={{ position: 'absolute', bottom: 2, left: 2 }}>▶</span>}
                  </div>
                  <div className="vitem-info">
                    <div className="vitem-title">{v.title}</div>
                    <div className="vitem-meta">
                      {locked ? <span className="text-xs text-muted">Complete previous lesson</span> : <span className="vitem-dur">{v.channelTitle}</span>}
                    </div>
                  </div>
                  {!locked && (
                    <div className="flex-col items-center gap-2" style={{ display: 'flex', flexShrink: 0 }}>
                      <button className={`vitem-fav${isFav(v.videoId) ? ' on' : ''}`} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem', color: isFav(v.videoId) ? 'var(--warn)' : 'var(--text3)', padding: 2 }} onClick={e => { e.stopPropagation(); toggleFavorite(v); }}>
                        {isFav(v.videoId) ? '⭐' : '☆'}
                      </button>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--text3)', padding: 2 }} onClick={e => { e.stopPropagation(); addToQueue(v); }} title="Add to queue">+</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {nextPageToken && (
            <button className="load-more-btn" onClick={() => fetchPlaylist(currentPlId, nextPageToken)} disabled={loading}>
              {loading ? '⏳ Loading...' : `+ Load more (${totalResults - videos.length} remaining)`}
            </button>
          )}
        </>
      )}

      {/* ── FAVORITES ── */}
      {sidebarTab === 'favorites' && (
        <>
          <div className="sidebar-header">
            <div className="sidebar-pl-title">⭐ Saved Videos</div>
            <span className="badge badge-accent">{favorites.length}</span>
          </div>
          <div className="sidebar-list">
            {favorites.length === 0 && <div className="sidebar-empty"><div className="sidebar-empty-icon">⭐</div>No favorites yet — star any video!</div>}
            {favorites.map((v, i) => (
              <div key={`fav-${v.videoId}`} className={`sidebar-fav-item${activeVideo?.videoId === v.videoId ? ' active' : ''}`} onClick={() => trySelectVideo(v, videos.indexOf(v))}>
                <span className="vitem-num">{i + 1}</span>
                <img src={v.thumbnail} alt={v.title} className="sidebar-fav-thumb" loading="lazy" />
                <div className="sidebar-fav-title">{v.title}</div>
                <button className="sidebar-fav-remove" onClick={e => { e.stopPropagation(); toggleFavorite(v); }}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── NOTES ── */}
      {sidebarTab === 'notes' && (
        <>
          <div className="sidebar-header">
            <div className="sidebar-pl-title">📝 My Notes</div>
            <div className="sidebar-pl-actions">
              <button className="sidebar-pl-btn" onClick={exportNotes}>📥 Export</button>
              <span className="badge badge-accent">{Object.keys(notes).length}</span>
            </div>
          </div>
          <div className="sidebar-list sidebar-notes-list">
            {Object.keys(notes).length === 0 && <div className="sidebar-empty"><div className="sidebar-empty-icon">📝</div>No notes yet — open a video and take notes!</div>}
            {Object.entries(notes).map(([vid, note]) => {
              const v = [...videos, ...favorites, ...recentlyWatched].find(x => x.videoId === vid);
              return (
                <div key={vid} className="sidebar-note-item" onClick={() => v && trySelectVideo(v, videos.indexOf(v))} style={{ cursor: 'pointer', position: 'relative' }}>
                  <div className="sidebar-note-vid">{v?.title || vid}</div>
                  <div className="sidebar-note-text">{note.slice(0, 140)}{note.length > 140 ? '…' : ''}</div>
                  <button style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: '0.8rem', padding: 2, borderRadius: 4 }}
                    onClick={e => { e.stopPropagation(); setNotes(prev => { const n = { ...prev }; delete n[vid]; return n; }); toast('Note deleted', 'warn'); }}>🗑</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── QUEUE ── */}
      {sidebarTab === 'queue' && (
        <>
          <div className="sidebar-header">
            <div className="sidebar-pl-title">🎵 Up Next</div>
            <div className="sidebar-pl-actions">
              {queue.length > 0 && <button className="sidebar-pl-btn" onClick={() => { setQueue([]); toast('Queue cleared', 'info'); }}>Clear</button>}
              <span className="badge badge-accent">{queue.length}</span>
            </div>
          </div>
          {queue.length > 0 && (
            <button className="load-more-btn" style={{ margin: '6px 6px 0' }} onClick={() => {
              const next = queue[0]; setQueue(prev => prev.slice(1));
              trySelectVideo(next, videos.findIndex(v => v.videoId === next.videoId));
              toast('▶ Playing from queue', 'info');
            }}>▶ Play Next</button>
          )}
          <div className="sidebar-list">
            {queue.length === 0 && <div className="sidebar-empty"><div className="sidebar-empty-icon">🎵</div>Queue is empty — press + on any video to add.</div>}
            {queue.map((v, i) => (
              <div key={`q-${v.videoId}`} className="sidebar-queue-item">
                <span className="sidebar-queue-num">{i + 1}</span>
                <img src={v.thumbnail} alt={v.title} className="sidebar-queue-thumb" loading="lazy" />
                <div className="sidebar-queue-title">{v.title}</div>
                <button className="sidebar-queue-remove" onClick={() => setQueue(prev => prev.filter(x => x.videoId !== v.videoId))}>✕</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── AI TUTOR ── */}
      {sidebarTab === 'tutor' && (
        <Tutor
          messages={tutorMessages} setMessages={setTutorMessages}
          input={tutorInput} setInput={setTutorInput}
          loading={tutorLoading} setLoading={setTutorLoading}
          lang={tutorLang} setLang={setTutorLang}
          configured={tutorConfigured} setConfigured={setTutorConfigured}
          selectedSubject={selectedSubject} selectedClass={selectedClass}
          activeVideo={activeVideo}
        />
      )}
    </aside>
  );
}
