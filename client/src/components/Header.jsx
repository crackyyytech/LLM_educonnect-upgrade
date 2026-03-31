import { useState, useRef, useEffect } from 'react';

const ROLE_COLORS = { admin: '#ef4444', teacher: '#f59e0b', student: '#0d9488' };

export default function Header({
  theme, setTheme,
  selectedClass, selectedSubject,
  view, goHome, goSubjects,
  streak, isOnline,
  onSearch, onStats, onHistory, onExportNotes, onShortcuts,
  queue, onCustomPlaylist,
  onManage, onTeacherPanel, onAdminDashboard,
  user, onLogout,
}) {
  const [plInput, setPlInput]           = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPlInput, setShowPlInput]   = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowUserMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handlePlSubmit = (e) => {
    e.preventDefault();
    const id = plInput.trim();
    if (!id) return;
    onCustomPlaylist(id);
    setPlInput(''); setShowPlInput(false);
  };

  const isStudent = user?.role === 'student';
  const initials  = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  return (
    <header className="header">
      {/* Logo */}
      <button className="logo-btn" onClick={goHome}>
        <span className="logo-icon">📚</span>
        <div>
          <div className="logo-text">Suct EduConnect</div>
          <div className="logo-sub">Samacheer Kalvi · Class 1–12</div>
        </div>
      </button>

      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <button className="bc-btn" onClick={goHome}>முகப்பு</button>
        {selectedClass && <>
          <span className="bc-sep">›</span>
          <button className="bc-btn" onClick={goSubjects}>{selectedClass.label}</button>
        </>}
        {view === 'player' && selectedSubject && <>
          <span className="bc-sep">›</span>
          <span className="bc-cur">{selectedSubject.name}</span>
        </>}
      </nav>

      {/* Playlist input */}
      {!isStudent && (
        showPlInput ? (
          <form className="hdr-pl-form" onSubmit={handlePlSubmit}>
            <input
              className="hdr-pl-input"
              placeholder="Playlist URL or ID..."
              value={plInput}
              onChange={e => setPlInput(e.target.value)}
              autoFocus
              onBlur={() => { if (!plInput.trim()) setShowPlInput(false); }}
            />
            <button type="submit" className="hdr-pl-btn" disabled={!plInput.trim()}>▶</button>
            <button type="button" className="hdr-pl-btn" style={{ background: 'var(--bg4)' }} onClick={() => setShowPlInput(false)}>✕</button>
          </form>
        ) : (
          <button className="icon-btn hdr-pl-toggle" onClick={() => setShowPlInput(true)} title="Open playlist">
            ▶ Playlist
          </button>
        )
      )}

      {/* Actions */}
      <div className="hdr-actions">
        {streak > 0 && <span className="streak-badge">🔥 {streak}d</span>}
        {isStudent && user?.classNum && <span className="role-badge student-badge">🎓 {user.classNum}</span>}
        {user?.role === 'teacher' && user?.subject && <span className="role-badge teacher-badge">👨‍🏫 {user.subject.slice(0, 10)}</span>}
        {!isOnline && <span className="offline-pill">📵 Offline</span>}
        {queue.length > 0 && <span className="queue-dot">📋 {queue.length}</span>}

        <button className="icon-btn" onClick={onSearch}    title="Search (/)">🔍</button>
        <button className="icon-btn" onClick={onStats}     title="Stats">📊</button>
        <button className="icon-btn" onClick={onHistory}   title="History">🕐</button>
        <button className="icon-btn" onClick={onShortcuts} title="Shortcuts (?)">⌨️</button>

        {user?.role === 'teacher' && (
          <button className="icon-btn" onClick={onTeacherPanel} title="My Students">👩‍🎓</button>
        )}
        {(user?.role === 'admin' || user?.role === 'teacher') && (
          <button className="icon-btn" onClick={onManage} title="Manage Subjects">⚙️</button>
        )}
        {user?.role === 'admin' && (
          <button className="icon-btn icon-btn-danger" onClick={onAdminDashboard} title="Admin Dashboard">🛡️</button>
        )}

        <button className="icon-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* User menu */}
        {user && (
          <div className="user-menu-wrap" ref={menuRef}>
            <button className="user-avatar-btn" onClick={() => setShowUserMenu(s => !s)}>
              <div className="user-avatar-circle" style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[user.role]}, ${ROLE_COLORS[user.role]}88)` }}>
                {initials}
              </div>
              <span className="user-avatar-name">{user.name.split(' ')[0]}</span>
            </button>

            {showUserMenu && (
              <div className="user-menu">
                <div className="user-menu-info">
                  <div className="user-menu-avatar" style={{ background: `linear-gradient(135deg, ${ROLE_COLORS[user.role]}, ${ROLE_COLORS[user.role]}88)` }}>
                    {initials}
                  </div>
                  <div className="user-menu-name">{user.name}</div>
                  <div className="user-menu-email">{user.email}</div>
                  <div className="user-menu-role">{user.role === 'admin' ? '🛡️' : user.role === 'teacher' ? '👨‍🏫' : '🎓'} {user.role}</div>
                  {isStudent && user.classNum && <div style={{ fontSize: '.64rem', color: 'var(--text3)', marginTop: 3 }}>Class {user.classNum}</div>}
                  {user.role === 'teacher' && user.subject && <div style={{ fontSize: '.64rem', color: 'var(--text3)', marginTop: 3 }}>{user.subject}</div>}
                </div>
                <div className="user-menu-divider" />
                <button className="user-menu-item user-menu-item-normal" onClick={() => { setShowUserMenu(false); onExportNotes(); }}>
                  📥 Export Notes
                </button>
                <button className="user-menu-item" onClick={onLogout}>
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
