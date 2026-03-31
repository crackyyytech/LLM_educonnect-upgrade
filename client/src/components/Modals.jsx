import { useState } from 'react';

function StreakCalendar({ streakDays }) {
  const today = new Date();
  const DAYS  = 35;
  const days  = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (DAYS - 1 - i));
    return d.toISOString().slice(0, 10);
  });
  const weekLabels = ['S','M','T','W','T','F','S'];
  return (
    <div className="streak-cal-wrap">
      <div className="streak-cal-labels">
        {weekLabels.map((l, i) => <span key={i} className="streak-cal-label">{l}</span>)}
      </div>
      <div className="streak-calendar">
        {days.map(d => (
          <div
            key={d}
            className={`streak-day${streakDays.includes(d) ? ' active' : ''}`}
            title={new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          />
        ))}
      </div>
    </div>
  );
}

export default function Modals({
  showShortcuts, showStats, showHistory, showGlobalSearch, showQueue,
  closeModals,
  globalSearch, setGlobalSearch, globalSearchRef, globalResults,
  CLASSES, setSelectedClass, openSubject,
  watchStats, favorites, notes, streak, completedSubjects, streakDays,
  watchedIds, setWatchedIds, setWatchStats, setStreakDays, setCompletedSubjects,
  recentlyWatched, clearHistory,
  queue, setQueue,
  setActiveVideo, setView,
  exportNotes, toast,
}) {
  const [histFilter, setHistFilter] = useState('');

  if (!showShortcuts && !showStats && !showHistory && !showGlobalSearch && !showQueue) return null;

  const filteredHistory = histFilter.trim()
    ? recentlyWatched.filter(v => v.title.toLowerCase().includes(histFilter.toLowerCase()) || v.plTitle?.toLowerCase().includes(histFilter.toLowerCase()))
    : recentlyWatched;

  return (
    <>
      {/* ── Global Search ── */}
      {showGlobalSearch && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <span>🔍 Search Classes & Subjects</span>
              <button onClick={closeModals}>✕</button>
            </div>
            <input
              ref={globalSearchRef}
              className="global-search-input"
              placeholder="Type class number or subject name... e.g. 10, கணிதம், Physics"
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              autoFocus
            />
            <div className="global-results">
              {globalSearch.trim().length < 2 && (
                <div className="gs-empty-state">
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🔍</div>
                  <p className="gs-hint">Type at least 2 characters</p>
                  <p className="gs-hint" style={{ fontSize: '0.72rem' }}>Try: "10", "கணிதம்", "Physics", "6"</p>
                </div>
              )}
              {globalResults.length === 0 && globalSearch.trim().length >= 2 && (
                <div className="gs-empty-state">
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>😕</div>
                  <p className="gs-hint">No results for "{globalSearch}"</p>
                </div>
              )}
              {globalResults.map((item, i) => (
                <button key={i} className="gs-item" onClick={() => {
                  closeModals(); setGlobalSearch('');
                  const cls = CLASSES.find(c => c.class === item.classNum);
                  if (cls) { setSelectedClass(cls); openSubject({ name: item.name, icon: item.icon, id: item.id }); }
                }}>
                  <div className="gs-class-badge">Class {item.classNum}</div>
                  <span className="gs-icon">{item.icon}</span>
                  <div>
                    <div className="gs-name">{item.name}</div>
                    <div className="gs-class">{item.classLabel}</div>
                  </div>
                  <span className="gs-arrow">›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Shortcuts ── */}
      {showShortcuts && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr"><span>⌨️ Keyboard Shortcuts</span><button onClick={closeModals}>✕</button></div>
            <div className="shortcut-list">
              {[
                ['→ / N', 'Next video',     'player'],
                ['← / P', 'Previous video', 'player'],
                ['F',     'Toggle favorite','player'],
                ['M',     'Mark watched',   'player'],
                ['Z',     'Focus mode',     'player'],
                ['Q',     'Toggle queue',   'global'],
                ['/',     'Global search',  'global'],
                ['?',     'Shortcuts',      'global'],
                ['Esc',   'Close modals',   'global'],
              ].map(([k, v, ctx]) => (
                <div key={k} className="shortcut-row">
                  <kbd>{k}</kbd>
                  <span>{v}</span>
                  <span className={`shortcut-ctx shortcut-ctx-${ctx}`}>{ctx}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      {showStats && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr"><span>📊 My Learning Stats</span><button onClick={closeModals}>✕</button></div>

            <div className="stats-grid">
              {[
                { num: watchStats.totalWatched,           label: 'Videos Watched',    color: 'var(--accent)' },
                { num: favorites.length,                  label: 'Favorites',         color: 'var(--warn)' },
                { num: Object.keys(notes).length,         label: 'Notes Saved',       color: '#06b6d4' },
                { num: watchStats.subjectsCovered.length, label: 'Subjects Covered',  color: '#8b5cf6' },
                { num: streak,                            label: 'Day Streak 🔥',     color: '#fb923c' },
                { num: completedSubjects.length,          label: 'Completed',         color: 'var(--success)' },
              ].map(({ num, label, color }) => (
                <div key={label} className="stat-card">
                  <div className="stat-num" style={{ color }}>{num}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>

            {streakDays.length > 0 && (
              <div className="stats-subjects">
                <div className="stats-sub-title">🔥 Activity — last 35 days</div>
                <StreakCalendar streakDays={streakDays} />
              </div>
            )}

            {watchStats.subjectsCovered.length > 0 && (
              <div className="stats-subjects">
                <div className="stats-sub-title">📚 Subjects Covered ({watchStats.subjectsCovered.length})</div>
                <div className="stats-chips">
                  {watchStats.subjectsCovered.map(s => <span key={s} className="stats-chip">{s}</span>)}
                </div>
              </div>
            )}

            {completedSubjects.length > 0 && (
              <div className="stats-subjects">
                <div className="stats-sub-title">🏆 Completed ({completedSubjects.length})</div>
                <div className="stats-chips">
                  {completedSubjects.map(s => <span key={s} className="stats-chip stats-chip-gold">{s}</span>)}
                </div>
              </div>
            )}

            <div className="stats-actions">
              <button className="stats-export-btn" onClick={exportNotes}>📥 Export Notes</button>
              <button className="stats-reset-btn" onClick={() => {
                if (!confirm('Reset all learning stats? This cannot be undone.')) return;
                setWatchStats({ totalWatched: 0, subjectsCovered: [] });
                setWatchedIds([]); setStreakDays([]); setCompletedSubjects([]);
                toast('Stats reset', 'info'); closeModals();
              }}>🗑 Reset All</button>
            </div>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {showHistory && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <span>🕐 Watch History ({recentlyWatched.length})</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {recentlyWatched.length > 0 && (
                  <button className="hist-clear" onClick={() => { clearHistory(); setHistFilter(''); }}>Clear All</button>
                )}
                <button onClick={closeModals}>✕</button>
              </div>
            </div>
            {recentlyWatched.length > 0 && (
              <div style={{ padding: '0 0 10px' }}>
                <input
                  className="global-search-input"
                  style={{ marginBottom: 0 }}
                  placeholder="🔍 Filter history..."
                  value={histFilter}
                  onChange={e => setHistFilter(e.target.value)}
                />
              </div>
            )}
            {filteredHistory.length === 0 && (
              <p className="gs-hint">{recentlyWatched.length === 0 ? 'No history yet — start watching!' : 'No matches found'}</p>
            )}
            <div className="history-list">
              {filteredHistory.map((v, i) => (
                <button key={i} className="hist-item" onClick={() => { setActiveVideo(v); setView('player'); closeModals(); }}>
                  <img src={v.thumbnail} alt={v.title} className="hist-thumb" />
                  <div className="hist-meta">
                    <div className="hist-title">{v.title}</div>
                    <div className="hist-sub">
                      {v.plTitle} · {new Date(v.watchedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <span className="gs-arrow">›</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Queue ── */}
      {showQueue && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-hdr">
              <span>📋 Up Next Queue ({queue.length})</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {queue.length > 0 && (
                  <button className="hist-clear" onClick={() => { setQueue([]); toast('Queue cleared', 'info'); }}>Clear</button>
                )}
                <button onClick={closeModals}>✕</button>
              </div>
            </div>
            {queue.length === 0 && (
              <div className="gs-empty-state">
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
                <p className="gs-hint">Queue is empty</p>
                <p className="gs-hint" style={{ fontSize: '0.72rem' }}>Press + on any video in the playlist to add it</p>
              </div>
            )}
            <div className="history-list">
              {queue.map((v, i) => (
                <div key={v.videoId} className="hist-item">
                  <span className="queue-num">{i + 1}</span>
                  <img src={v.thumbnail} alt={v.title} className="hist-thumb" />
                  <div className="hist-meta">
                    <div className="hist-title">{v.title}</div>
                    <div className="hist-sub">{v.channelTitle}</div>
                  </div>
                  <button
                    className="note-del"
                    onClick={() => setQueue(prev => prev.filter(x => x.videoId !== v.videoId))}
                    title="Remove from queue"
                  >🗑</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
