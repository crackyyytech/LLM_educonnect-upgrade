import { useRef, useEffect, useState, useCallback } from 'react';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

export default function VideoPlayer({
  activeVideo, activeIndex, videos,
  watchedIds, favorites, queue,
  notes, noteText, setNoteText, showNotes, setShowNotes,
  autoplay, setAutoplay,
  shuffle, setShuffle,
  repeatMode, cycleRepeat,
  playbackSpeed, setPlaybackSpeed,
  sleepAfter, setSleepAfter, sleepCount, setSleepCount,
  showSleepMenu, setShowSleepMenu,
  showSpeedMenu, setShowSpeedMenu,
  focusMode, setFocusMode,
  swipeHint, onTouchStart, onTouchEnd,
  videoEnded, setVideoEnded,
  selectedSubject, completedSubjects,
  isFav, toggleFavorite, addToQueue, shareVideo,
  saveNote, exportNotes,
  nextVideo, prevVideo,
  handleVideoSelect,
  markSubjectComplete,
  markCurrentWatched,
  loading,
  onVideoEnd,
  toast,
}) {
  const iframeRef       = useRef(null);
  const ytPlayerRef     = useRef(null);
  const progressPollRef = useRef(null);
  const unlockedRef     = useRef(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [pipActive, setPipActive]       = useState(false);
  const [noteSaved, setNoteSaved]       = useState(false);

  useEffect(() => { unlockedRef.current = false; setDescExpanded(false); setNoteSaved(false); }, [activeVideo?.videoId]);

  // YT Player setup
  useEffect(() => {
    if (!activeVideo) return;
    if (progressPollRef.current) { clearInterval(progressPollRef.current); progressPollRef.current = null; }
    if (ytPlayerRef.current) { try { ytPlayerRef.current.destroy(); } catch {} ytPlayerRef.current = null; }

    const createPlayer = () => {
      if (!iframeRef.current) return;
      try {
        ytPlayerRef.current = new window.YT.Player(iframeRef.current, {
          events: {
            onReady: () => {
              // Apply saved playback speed
              try { if (playbackSpeed !== 1) ytPlayerRef.current?.setPlaybackRate?.(playbackSpeed); } catch {}
              progressPollRef.current = setInterval(() => {
                try {
                  const p = ytPlayerRef.current;
                  if (!p) return;
                  const cur = p.getCurrentTime?.();
                  const dur = p.getDuration?.();
                  if (dur > 0 && cur > 0 && cur / dur >= 0.85) {
                    clearInterval(progressPollRef.current);
                    progressPollRef.current = null;
                    if (!unlockedRef.current) { unlockedRef.current = true; onVideoEnd(); }
                  }
                } catch {}
              }, 2000);
            },
            onStateChange: (e) => {
              if (e.data === 0 && !unlockedRef.current) { unlockedRef.current = true; onVideoEnd(); }
              if (e.data === 1) setVideoEnded(false);
            },
          },
        });
      } catch {}
    };

    if (window.YT?.Player) setTimeout(createPlayer, 300);
    else {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev?.(); setTimeout(createPlayer, 300); };
    }
    return () => { if (progressPollRef.current) { clearInterval(progressPollRef.current); progressPollRef.current = null; } };
  }, [activeVideo?.videoId]);

  const handleSaveNote = useCallback(() => {
    saveNote();
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  }, [saveNote]);

  const handlePiP = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().then(() => setPipActive(false));
    } else {
      toast('PiP not supported for YouTube embeds. Use browser PiP.', 'info');
    }
  };

  const repeatIcon = repeatMode === 'one' ? '🔂' : repeatMode === 'all' ? '🔁' : '↩';
  const isSubComplete = completedSubjects.includes(selectedSubject?.name);
  const watchedCount  = watchedIds.filter(id => videos.some(v => v.videoId === id)).length;

  if (!activeVideo) {
    return (
      <div className="player-empty">
        {loading ? (
          <>
            <div className="spinner" />
            <p>வீடியோக்கள் ஏற்றுகிறது...</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '3rem' }}>🎬</div>
            <p>வீடியோ தேர்ந்தெடுக்கவும்</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>Select a video from the playlist</p>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Video ── */}
      <div className="video-wrap" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <iframe
          ref={iframeRef}
          id="yt-player-iframe"
          key={activeVideo.videoId}
          src={`https://www.youtube.com/embed/${activeVideo.videoId}?autoplay=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3&fs=1&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}`}
          title={activeVideo.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        <div className="yt-overlay" />
        <div className="yt-overlay-top" />
        {swipeHint === 'left'  && <div className="swipe-hint swipe-left">⏭ அடுத்த</div>}
        {swipeHint === 'right' && <div className="swipe-hint swipe-right">⏮ முந்தைய</div>}

        {/* Completion overlay */}
        {videoEnded && activeIndex < videos.length - 1 && (
          <div className="video-end-overlay">
            <div className="veo-icon">✅</div>
            <div className="veo-title">பாடம் முடிந்தது!</div>
            <div className="veo-sub">அடுத்த பாடம் திறக்கப்பட்டது · {activeIndex + 2}/{videos.length}</div>
            <button className="veo-btn" onClick={() => { setVideoEnded(false); handleVideoSelect(videos[activeIndex + 1], activeIndex + 1); }}>
              ▶ அடுத்த பாடம்
            </button>
            <button className="veo-skip" onClick={() => setVideoEnded(false)}>Stay here</button>
          </div>
        )}
        {videoEnded && activeIndex === videos.length - 1 && (
          <div className="video-end-overlay">
            <div className="veo-icon">🏆</div>
            <div className="veo-title">அனைத்து பாடங்களும் முடிந்தன!</div>
            <div className="veo-sub">{videos.length} videos completed</div>
            <button className="veo-btn" onClick={() => { setVideoEnded(false); markSubjectComplete(selectedSubject?.name); }}>
              🏆 Mark Subject Complete
            </button>
            <button className="veo-skip" onClick={() => setVideoEnded(false)}>Dismiss</button>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="player-controls">
        {/* Navigation */}
        <button className="ctrl-btn" onClick={prevVideo} disabled={activeIndex === 0 && repeatMode === 'none'} title="Previous (←)">⏮</button>
        <span className="ctrl-pos">{activeIndex + 1}<span style={{color:'var(--text3)'}}>/</span>{videos.length}</span>
        <button className="ctrl-btn" onClick={nextVideo} disabled={!shuffle && activeIndex === videos.length - 1 && repeatMode === 'none' && queue.length === 0} title="Next (→)">⏭</button>

        <div className="ctrl-divider" />

        {/* Playback modes */}
        <button className={`ctrl-btn${isFav(activeVideo.videoId) ? ' fav-btn fav-active' : ''}`} onClick={() => toggleFavorite(activeVideo)} title="Favorite (F)">
          {isFav(activeVideo.videoId) ? '⭐' : '☆'}
        </button>
        <button className={`ctrl-btn${shuffle ? ' ctrl-active' : ''}`} onClick={() => { setShuffle(s => !s); toast(shuffle ? 'Shuffle off' : '🔀 Shuffle on', 'info'); }} title="Shuffle">🔀</button>
        <button className={`ctrl-btn${repeatMode !== 'none' ? ' ctrl-active' : ''}`} onClick={cycleRepeat} title="Repeat">{repeatIcon}</button>

        <div className="ctrl-divider" />

        {/* Speed */}
        <div className="ctrl-sleep-wrap">
          <button className={`ctrl-btn${playbackSpeed !== 1 ? ' ctrl-active' : ''}`} onClick={() => setShowSpeedMenu(s => !s)} title="Playback speed">
            ⚡{playbackSpeed}x
          </button>
          {showSpeedMenu && (
            <div className="sleep-menu">
              <div className="sleep-title">Playback Speed</div>
              {SPEEDS.map(s => (
                <button key={s} className={`sleep-opt${playbackSpeed === s ? ' active' : ''}`}
                  onClick={() => {
                    setPlaybackSpeed(s);
                    setShowSpeedMenu(false);
                    try { ytPlayerRef.current?.setPlaybackRate?.(s); } catch {}
                    toast(`⚡ ${s}x`, 'info');
                  }}>
                  {s}x{s === 1 ? ' (normal)' : ''}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sleep timer */}
        <div className="ctrl-sleep-wrap">
          <button className={`ctrl-btn${sleepAfter > 0 ? ' ctrl-active' : ''}`} onClick={() => setShowSleepMenu(s => !s)} title="Sleep timer">
            😴{sleepAfter > 0 ? ` ${sleepAfter - sleepCount}` : ''}
          </button>
          {showSleepMenu && (
            <div className="sleep-menu">
              <div className="sleep-title">Stop after</div>
              {[0, 1, 2, 3, 5, 10].map(n => (
                <button key={n} className={`sleep-opt${sleepAfter === n ? ' active' : ''}`}
                  onClick={() => { setSleepAfter(n); setSleepCount(0); setShowSleepMenu(false); toast(n === 0 ? 'Sleep timer off' : `😴 Stop after ${n} videos`, 'info'); }}>
                  {n === 0 ? 'Off' : `${n} videos`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ctrl-divider" />

        {/* Utilities */}
        <button className="ctrl-btn" onClick={shareVideo} title="Copy link">🔗</button>
        <button className="ctrl-btn" onClick={() => addToQueue(activeVideo)} title="Add to queue">+Q</button>
        <button className={`ctrl-btn${watchedIds.includes(activeVideo.videoId) ? ' ctrl-active' : ''}`} onClick={markCurrentWatched} title="Mark watched (M)">✓</button>
        <button className={`ctrl-btn${focusMode ? ' ctrl-active' : ''}`} onClick={() => setFocusMode(s => !s)} title="Focus mode (Z)">🎯</button>

        <label className="ctrl-toggle" title="Autoplay next video">
          <input type="checkbox" checked={autoplay} onChange={e => setAutoplay(e.target.checked)} />
          <span>Auto</span>
        </label>

        <button className={`ctrl-btn${showNotes ? ' ctrl-active' : ''}`} onClick={() => setShowNotes(s => !s)} title="Notes">
          📝{Object.keys(notes).length > 0 && <span className="note-count">{Object.keys(notes).length}</span>}
        </button>
        <button className="ctrl-btn" onClick={() => iframeRef.current?.requestFullscreen?.()} title="Fullscreen">⛶</button>
      </div>

      {/* ── Notes Panel ── */}
      {showNotes && (
        <div className="notes-panel">
          <div className="notes-hdr">
            <span>📝 Notes — {activeVideo.title.slice(0, 40)}{activeVideo.title.length > 40 ? '…' : ''}</span>
            <button className="notes-close-btn" onClick={() => setShowNotes(false)}>✕</button>
          </div>
          <textarea
            className="notes-area"
            placeholder="இங்கே குறிப்புகள் எழுதவும்... (Write your notes here)"
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={4}
            maxLength={2000}
          />
          <div className="notes-actions">
            <button className={`notes-save${noteSaved ? ' saved' : ''}`} onClick={handleSaveNote}>
              {noteSaved ? '✓ Saved!' : '💾 Save'}
            </button>
            <button className="notes-export" onClick={exportNotes}>📥 Export All</button>
            <span className="notes-char-count">{noteText.length}/2000</span>
          </div>
        </div>
      )}

      {/* ── Video Info ── */}
      <div className="video-info">
        <h2 className="v-title">{activeVideo.title}</h2>
        <div className="v-meta-row">
          <span className="v-channel">📺 {activeVideo.channelTitle}</span>
          {activeVideo.publishedAt && (
            <span className="v-date">📅 {new Date(activeVideo.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          )}
          {watchedIds.includes(activeVideo.videoId) && <span className="watched-badge">✓ Watched</span>}
          {isFav(activeVideo.videoId) && <span className="fav-badge">⭐ Favorite</span>}
          {queue.length > 0 && <span className="queue-badge">📋 {queue.length} queued</span>}
        </div>

        {/* Subject progress bar */}
        {videos.length > 0 && (
          <div className="vp-subject-progress">
            <div className="vp-sp-bar">
              <div className="vp-sp-fill" style={{ width: `${Math.round((watchedCount / videos.length) * 100)}%` }} />
            </div>
            <span className="vp-sp-label">{watchedCount}/{videos.length} watched</span>
          </div>
        )}

        {activeVideo.description && (
          <div className="v-desc-wrap">
            <p className="v-desc">
              {descExpanded ? activeVideo.description : activeVideo.description.slice(0, 220)}
              {activeVideo.description.length > 220 && !descExpanded && '…'}
            </p>
            {activeVideo.description.length > 220 && (
              <button className="v-desc-toggle" onClick={() => setDescExpanded(s => !s)}>
                {descExpanded ? '▲ Show less' : '▼ Show more'}
              </button>
            )}
          </div>
        )}

        {selectedSubject && !isSubComplete && (
          <button className="mark-complete-btn" onClick={() => markSubjectComplete(selectedSubject.name)}>
            🏆 Mark Subject Complete
          </button>
        )}
        {selectedSubject && isSubComplete && (
          <div className="complete-banner">🏆 Subject Completed!</div>
        )}
      </div>
    </>
  );
}
