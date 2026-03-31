import { useState, useEffect } from 'react';
import axios from 'axios';

function calcStreak(days) {
  if (!days?.length) return 0;
  const sorted = [...new Set(days)].sort().reverse();
  let s = 0;
  for (const d of sorted) {
    if (Math.round((new Date(sorted[0]) - new Date(d)) / 86400000) === s) s++;
    else break;
  }
  return s;
}

export default function TeacherPanel({ onClose, user, toast }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [sortBy, setSortBy]     = useState('name');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    axios.get('/api/auth/my-students')
      .then(res => setStudents(res.data.students))
      .catch(() => toast('Failed to load students', 'warn'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = students
    .filter(s => !search.trim() ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'watched')   return (b.watchedIds?.length || 0) - (a.watchedIds?.length || 0);
      if (sortBy === 'streak')    return (b.streakDays?.length || 0) - (a.streakDays?.length || 0);
      if (sortBy === 'completed') return (b.completedSubjects?.length || 0) - (a.completedSubjects?.length || 0);
      return a.name.localeCompare(b.name);
    });

  const totalWatched   = students.reduce((s, u) => s + (u.watchedIds?.length || 0), 0);
  const avgWatched     = students.length ? Math.round(totalWatched / students.length) : 0;
  const activeCount    = students.filter(s => calcStreak(s.streakDays) > 0).length;
  const completedCount = students.filter(s => s.completedSubjects?.length > 0).length;

  const exportCSV = () => {
    const rows = [['Name', 'Email', 'Class', 'Watched', 'Streak', 'Completed Subjects', 'Active']];
    students.forEach(s => rows.push([
      s.name, s.email, s.classNum || '',
      s.watchedIds?.length || 0,
      calcStreak(s.streakDays),
      (s.completedSubjects || []).join(';'),
      s.isActive,
    ]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: 'students.csv',
    });
    a.click();
    URL.revokeObjectURL(a.href);
    toast('📥 CSV exported', 'success');
  };

  return (
    <div className="manage-overlay" onClick={onClose}>
      <div className="manage-panel teacher-panel" onClick={e => e.stopPropagation()}>

        <div className="manage-hdr">
          <div>
            <div className="manage-title">👩‍🎓 My Students</div>
            <div className="manage-sub">
              {user.subject ? user.subject : 'All students'}
              {user.classNum ? ` · Class ${user.classNum}` : ''}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="manage-cancel-btn" onClick={exportCSV}>📥 CSV</button>
            <button className="manage-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Stats */}
        <div className="tp-stats-row">
          {[
            { val: students.length, lbl: 'Total Students', icon: '👥' },
            { val: avgWatched,      lbl: 'Avg Watched',    icon: '▶' },
            { val: activeCount,     lbl: 'Active Today',   icon: '🔥' },
            { val: completedCount,  lbl: 'Completed',      icon: '🏆' },
          ].map(s => (
            <div key={s.lbl} className="tp-stat">
              <div className="tp-stat-icon">{s.icon}</div>
              <div className="tp-stat-val">{s.val}</div>
              <div className="tp-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="tp-controls">
          <input
            className="manage-input"
            placeholder="🔍 Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <select
            className="manage-input"
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="name">Name A–Z</option>
            <option value="watched">Most Watched</option>
            <option value="streak">Streak Days</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* Student list */}
        {loading ? (
          <div className="tp-loading">
            <div className="spinner" style={{ margin: '0 auto 12px' }} />
            <p>Loading students...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="manage-empty">
            {students.length === 0 ? 'No students assigned yet.' : 'No students match your search.'}
          </div>
        ) : (
          <div className="tp-student-list">
            {filtered.map(s => {
              const watched   = s.watchedIds?.length || 0;
              const streak    = calcStreak(s.streakDays);
              const completed = s.completedSubjects?.length || 0;
              const pct       = Math.min(Math.round((watched / 20) * 100), 100);
              const isExp     = expanded === s._id;

              return (
                <div key={s._id} className={`tp-student-row${!s.isActive ? ' tp-inactive' : ''}`}>
                  <div className="tp-student-main" onClick={() => setExpanded(isExp ? null : s._id)}>
                    <div className="tp-student-avatar">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="tp-student-info">
                      <div className="tp-student-name">
                        {s.name}
                        {!s.isActive && <span className="tp-disabled-badge">Disabled</span>}
                        {streak > 0 && <span className="tp-streak-badge">🔥 {streak}d</span>}
                      </div>
                      <div className="tp-student-email">{s.email}</div>
                      {s.classNum && <div className="tp-student-class">Class {s.classNum}</div>}
                    </div>
                    <div className="tp-student-stats">
                      <div className="tp-mini-stat" title="Videos watched">
                        <span>▶</span><span>{watched}</span>
                      </div>
                      <div className="tp-mini-stat" title="Subjects completed">
                        <span>🏆</span><span>{completed}</span>
                      </div>
                    </div>
                    <div className="tp-progress-wrap">
                      <div className="tp-progress-bar">
                        <div className="tp-progress-fill" style={{ width: pct + '%' }} />
                      </div>
                      <span className="tp-progress-label">{pct}%</span>
                    </div>
                    <span className="tp-expand-icon">{isExp ? '▲' : '▼'}</span>
                  </div>

                  {isExp && (
                    <div className="tp-student-detail">
                      <div className="tp-detail-grid">
                        <div className="tp-detail-item">
                          <span className="tp-detail-label">Videos Watched</span>
                          <span className="tp-detail-val">{watched}</span>
                        </div>
                        <div className="tp-detail-item">
                          <span className="tp-detail-label">Streak Days</span>
                          <span className="tp-detail-val">{s.streakDays?.length || 0}</span>
                        </div>
                        <div className="tp-detail-item">
                          <span className="tp-detail-label">Current Streak</span>
                          <span className="tp-detail-val">{streak}d</span>
                        </div>
                        <div className="tp-detail-item">
                          <span className="tp-detail-label">Subjects Done</span>
                          <span className="tp-detail-val">{completed}</span>
                        </div>
                      </div>
                      {s.completedSubjects?.length > 0 && (
                        <div className="tp-completed-chips">
                          {s.completedSubjects.map(sub => (
                            <span key={sub} className="tp-chip">{sub}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
