import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const ROLE_COLORS = { admin: '#ef4444', teacher: '#f59e0b', student: '#22c55e' };
const ROLE_ICONS  = { admin: '🛡️', teacher: '👨‍🏫', student: '🎓' };
const PAGE_SIZE   = 10;

function StatCard({ icon, label, value, color, sub }) {
  return (
    <div className="adm-stat-card" style={{ borderColor: color + '44' }}>
      <div className="adm-stat-icon" style={{ background: color + '18' }}>{icon}</div>
      <div className="adm-stat-body">
        <div className="adm-stat-value" style={{ color }}>{value ?? '—'}</div>
        <div className="adm-stat-label">{label}</div>
        {sub && <div className="adm-stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function Badge({ children, color }) {
  return <span className="adm-badge" style={{ background: color + '18', color, border: `1px solid ${color}44` }}>{children}</span>;
}

// ── User Detail Drawer ────────────────────────────────────────────────────────
function UserDrawer({ user: initialUser, onClose, onUpdate, toast }) {
  const [user, setUser]     = useState(initialUser);
  const [tab, setTab]       = useState('profile');
  const [form, setForm]     = useState({ name: initialUser.name, email: initialUser.email, role: initialUser.role, subject: initialUser.subject || '', classNum: initialUser.classNum || '', password: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleUpdate = (updated) => { setUser(updated); onUpdate(updated); };

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      const payload = { name: form.name, email: form.email, role: form.role, subject: form.subject, classNum: form.classNum || null };
      if (form.password) payload.password = form.password;
      const res = await axios.patch(`/api/auth/users/${user._id}`, payload);
      handleUpdate(res.data.user);
      toast('✅ User updated', 'success');
      setForm(f => ({ ...f, password: '' }));
    } catch (e) { setErr(e.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const resetProgress = async () => {
    if (!confirm('Reset all progress for this user?')) return;
    try {
      const res = await axios.patch(`/api/auth/users/${user._id}`, { watchedIds: [], completedSubjects: [], streakDays: [] });
      handleUpdate(res.data.user);
      toast('Progress reset', 'info');
    } catch { toast('Failed', 'warn'); }
  };

  const toggleActive = async () => {
    try {
      const res = await axios.patch(`/api/auth/users/${user._id}`, { isActive: !user.isActive });
      handleUpdate(res.data.user);
      toast(user.isActive ? '🔒 Disabled' : '🔓 Enabled', 'info');
    } catch { toast('Failed', 'warn'); }
  };

  const deleteUser = async () => {
    if (!confirm(`Permanently delete "${user.name}"?`)) return;
    try {
      await axios.delete(`/api/auth/users/${user._id}`);
      toast('🗑 User deleted', 'warn');
      onClose('deleted', user._id);
    } catch { toast('Failed', 'warn'); }
  };

  return (
    <div className="adm-drawer-overlay" onClick={() => onClose()}>
      <div className="adm-drawer" onClick={e => e.stopPropagation()}>
        <div className="adm-drawer-hdr">
          <div className="adm-drawer-avatar" style={{ background: ROLE_COLORS[user.role] + '22' }}>{ROLE_ICONS[user.role]}</div>
          <div className="adm-drawer-info">
            <div className="adm-drawer-name">{user.name}</div>
            <div className="adm-drawer-email">{user.email}</div>
            <Badge color={ROLE_COLORS[user.role]}>{ROLE_ICONS[user.role]} {user.role}</Badge>
          </div>
          <button className="adm-close-btn" onClick={() => onClose()}>✕</button>
        </div>

        <div className="adm-drawer-tabs">
          {['profile', 'progress', 'danger'].map(t => (
            <button key={t} className={`adm-drawer-tab${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}>
              {t === 'profile' ? '👤 Profile' : t === 'progress' ? '📊 Progress' : '⚠️ Danger'}
            </button>
          ))}
        </div>

        <div className="adm-drawer-body">
          {tab === 'profile' && (
            <form onSubmit={save} className="adm-drawer-form">
              {err && <div className="adm-form-err">{err}</div>}
              <div className="adm-form-field"><label>Full Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="adm-form-field"><label>Email</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div className="adm-form-field"><label>Role</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}>
                  <option value="student">🎓 Student</option>
                  <option value="teacher">👨‍🏫 Teacher</option>
                  <option value="admin">🛡️ Admin</option>
                </select>
              </div>
              {form.role === 'student' && (
                <div className="adm-form-field"><label>Class (1–12)</label>
                  <input type="number" min="1" max="12" value={form.classNum} onChange={e => set('classNum', e.target.value)} />
                </div>
              )}
              {form.role === 'teacher' && (
                <div className="adm-form-field"><label>Subject</label>
                  <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Mathematics" />
                </div>
              )}
              <div className="adm-form-field">
                <label>New Password <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(blank = keep current)</span></label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" minLength={form.password ? 6 : undefined} />
              </div>
              <div className="adm-form-field"><label>Account Status</label>
                <button type="button" className={`adm-status-toggle${user.isActive ? ' active' : ''}`} onClick={toggleActive}>
                  {user.isActive ? '🔓 Active — click to disable' : '🔒 Disabled — click to enable'}
                </button>
              </div>
              <div className="adm-drawer-meta">
                <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                <span>ID: <code>{user._id}</code></span>
              </div>
              <button type="submit" className="adm-btn-primary" disabled={saving} style={{ width: '100%', marginTop: 4 }}>
                {saving ? '⏳ Saving...' : '💾 Save Changes'}
              </button>
            </form>
          )}

          {tab === 'progress' && (
            <div className="adm-progress-tab">
              <div className="adm-progress-stats">
                <div className="adm-prog-card"><div className="adm-prog-num">{user.watchedIds?.length || 0}</div><div className="adm-prog-label">Videos Watched</div></div>
                <div className="adm-prog-card"><div className="adm-prog-num">{user.completedSubjects?.length || 0}</div><div className="adm-prog-label">Subjects Done</div></div>
                <div className="adm-prog-card"><div className="adm-prog-num">{user.streakDays?.length || 0}</div><div className="adm-prog-label">Streak Days</div></div>
              </div>
              {user.completedSubjects?.length > 0 && (
                <div className="adm-prog-section">
                  <div className="adm-prog-section-title">🏆 Completed Subjects</div>
                  <div className="adm-prog-chips">{user.completedSubjects.map(s => <span key={s} className="adm-prog-chip">{s}</span>)}</div>
                </div>
              )}
              {user.streakDays?.length > 0 && (
                <div className="adm-prog-section">
                  <div className="adm-prog-section-title">🔥 Recent Activity (last 7 days)</div>
                  <div className="adm-prog-chips">{[...user.streakDays].sort().slice(-7).map(d => <span key={d} className="adm-prog-chip adm-prog-chip-day">{d}</span>)}</div>
                </div>
              )}
              <button className="adm-btn-danger-outline" onClick={resetProgress} style={{ marginTop: 12 }}>🔄 Reset All Progress</button>
            </div>
          )}

          {tab === 'danger' && (
            <div className="adm-danger-tab">
              <div className="adm-danger-warn">⚠️ These actions are irreversible.</div>
              <div className="adm-danger-row">
                <div><div className="adm-danger-label">Reset Progress</div><div className="adm-danger-desc">Clears all watched videos, completed subjects, and streak data</div></div>
                <button className="adm-btn-danger-outline" onClick={resetProgress}>Reset</button>
              </div>
              <div className="adm-danger-row">
                <div><div className="adm-danger-label">{user.isActive ? 'Disable Account' : 'Enable Account'}</div><div className="adm-danger-desc">{user.isActive ? 'Prevents this user from logging in' : 'Allows this user to log in again'}</div></div>
                <button className="adm-btn-danger-outline" onClick={toggleActive}>{user.isActive ? '🔒 Disable' : '🔓 Enable'}</button>
              </div>
              <div className="adm-danger-row">
                <div><div className="adm-danger-label" style={{ color: 'var(--danger)' }}>Delete Account</div><div className="adm-danger-desc">Permanently removes this user and all their data</div></div>
                <button className="adm-btn-danger" onClick={deleteUser}>🗑 Delete</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create User Form ──────────────────────────────────────────────────────────
function CreateUserForm({ onSave, onCancel }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student', classNum: '', subject: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setErr('');
    try {
      const res = await axios.post('/api/auth/users', { ...form, classNum: form.classNum ? Number(form.classNum) : null });
      onSave(res.data.user);
    } catch (e) { setErr(e.response?.data?.error || 'Failed to create'); }
    finally { setSaving(false); }
  };

  return (
    <form className="adm-create-form" onSubmit={submit}>
      <div className="adm-create-form-title">➕ Create New User</div>
      {err && <div className="adm-form-err">{err}</div>}
      <div className="adm-form-grid">
        <div className="adm-form-field"><label>Full Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Full name" autoFocus />
        </div>
        <div className="adm-form-field"><label>Email *</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required placeholder="email@example.com" />
        </div>
        <div className="adm-form-field"><label>Password *</label>
          <input type="password" value={form.password} onChange={e => set('password', e.target.value)} required placeholder="Min 6 chars" minLength={6} />
        </div>
        <div className="adm-form-field"><label>Role *</label>
          <select value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="student">🎓 Student</option>
            <option value="teacher">👨‍🏫 Teacher</option>
            <option value="admin">🛡️ Admin</option>
          </select>
        </div>
        {form.role === 'student' && (
          <div className="adm-form-field"><label>Class (1–12)</label>
            <input type="number" min="1" max="12" value={form.classNum} onChange={e => set('classNum', e.target.value)} placeholder="e.g. 10" />
          </div>
        )}
        {form.role === 'teacher' && (
          <div className="adm-form-field"><label>Subject</label>
            <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Mathematics" />
          </div>
        )}
      </div>
      <div className="adm-form-actions">
        <button type="button" className="adm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="adm-btn-primary" disabled={saving}>{saving ? '⏳ Creating...' : '✅ Create User'}</button>
      </div>
    </form>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ stats, loading, users }) {
  const recentUsers = [...(users || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  if (loading) return <div className="adm-loading">⏳ Loading stats...</div>;
  if (!stats)  return <div className="adm-loading">Could not load stats. Check server connection.</div>;

  return (
    <div className="adm-overview">
      <div className="adm-stats-grid">
        <StatCard icon="👥" label="Total Users"     value={stats.total}          color="#4f8ef7" sub={`${stats.activeAccounts} active`} />
        <StatCard icon="🛡️" label="Admins"          value={stats.admins}         color="#ef4444" />
        <StatCard icon="👨‍🏫" label="Teachers"        value={stats.teachers}       color="#f59e0b" />
        <StatCard icon="🎓" label="Students"        value={stats.students}       color="#22c55e" />
        <StatCard icon="✅" label="Active Accounts" value={stats.activeAccounts} color="#818cf8" sub={`${stats.total - stats.activeAccounts} disabled`} />
        <StatCard icon="▶️" label="Total Watched"   value={stats.totalWatched}   color="#06b6d4" sub="across all users" />
      </div>

      <div className="adm-overview-row">
        <div className="adm-role-chart">
          <div className="adm-section-title">📊 Role Distribution</div>
          {[
            { role: 'student', label: 'Students', count: stats.students },
            { role: 'teacher', label: 'Teachers', count: stats.teachers },
            { role: 'admin',   label: 'Admins',   count: stats.admins   },
          ].map(({ role, label, count }) => (
            <div key={role} className="adm-chart-row">
              <div className="adm-chart-label">{ROLE_ICONS[role]} {label}</div>
              <div className="adm-chart-track">
                <div className="adm-chart-fill" style={{ width: stats.total ? `${(count / stats.total) * 100}%` : '0%', background: ROLE_COLORS[role] }} />
              </div>
              <div className="adm-chart-count">{count}</div>
            </div>
          ))}
        </div>

        <div className="adm-recent-users">
          <div className="adm-section-title">🕐 Recently Joined</div>
          {recentUsers.length === 0 && <div className="adm-empty">No users yet</div>}
          {recentUsers.map(u => (
            <div key={u._id} className="adm-recent-row">
              <div className="adm-user-avatar-sm" style={{ background: ROLE_COLORS[u.role] + '22' }}>{ROLE_ICONS[u.role]}</div>
              <div className="adm-recent-info">
                <div className="adm-user-name">{u.name}</div>
                <div className="adm-user-email">{u.email}</div>
              </div>
              <div className="adm-recent-date">{new Date(u.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab({ users, setUsers, toast }) {
  const [search, setSearch]         = useState('');
  const [filter, setFilter]         = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected]     = useState(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [drawerUser, setDrawerUser] = useState(null);
  const [bulkAction, setBulkAction] = useState('');
  const [page, setPage]             = useState(1);
  const [sortBy, setSortBy]         = useState('createdAt');
  const [sortDir, setSortDir]       = useState(-1);

  const filtered = users
    .filter(u => {
      const matchRole   = filter === 'all' || u.role === filter;
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? u.isActive : !u.isActive);
      const q = search.toLowerCase();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) ||
        (u.subject || '').toLowerCase().includes(q) || String(u.classNum || '').includes(q);
      return matchRole && matchStatus && matchSearch;
    })
    .sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (sortBy === 'createdAt') { va = new Date(va); vb = new Date(vb); }
      if (sortBy === 'watchedIds') { va = va?.length || 0; vb = vb?.length || 0; }
      if (va < vb) return -sortDir; if (va > vb) return sortDir; return 0;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const counts     = { all: users.length, admin: 0, teacher: 0, student: 0 };
  users.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++; });

  const toggleSelect = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected(prev => prev.size === paginated.length ? new Set() : new Set(paginated.map(u => u._id)));
  const sort = (col) => { if (sortBy === col) setSortDir(d => -d); else { setSortBy(col); setSortDir(-1); } };
  const SortArrow = ({ col }) => sortBy === col ? (sortDir === -1 ? ' ↓' : ' ↑') : '';

  const toggleActive = async (user) => {
    try {
      const res = await axios.patch(`/api/auth/users/${user._id}`, { isActive: !user.isActive });
      setUsers(prev => prev.map(u => u._id === user._id ? res.data.user : u));
      if (drawerUser?._id === user._id) setDrawerUser(res.data.user);
      toast(user.isActive ? '🔒 Disabled' : '🔓 Enabled', 'info');
    } catch { toast('Failed', 'warn'); }
  };

  const deleteUser = async (user) => {
    if (!confirm(`Delete "${user.name}"?`)) return;
    try {
      await axios.delete(`/api/auth/users/${user._id}`);
      setUsers(prev => prev.filter(u => u._id !== user._id));
      toast('🗑 Deleted', 'warn');
    } catch { toast('Failed', 'warn'); }
  };

  const changeRole = async (user, role) => {
    try {
      const res = await axios.patch(`/api/auth/users/${user._id}`, { role });
      setUsers(prev => prev.map(u => u._id === user._id ? res.data.user : u));
      toast(`Role → ${role}`, 'success');
    } catch { toast('Failed', 'warn'); }
  };

  const applyBulk = async () => {
    if (!bulkAction || selected.size === 0) return;
    const ids = [...selected];
    try {
      if (bulkAction === 'delete') {
        if (!confirm(`Permanently delete ${ids.length} users?`)) return;
        await axios.post('/api/auth/users/bulk-delete', { ids });
        setUsers(prev => prev.filter(u => !ids.includes(u._id)));
        toast(`🗑 ${ids.length} deleted`, 'warn');
      } else if (bulkAction === 'enable') {
        await axios.post('/api/auth/users/bulk-update', { ids, updates: { isActive: true } });
        setUsers(prev => prev.map(u => ids.includes(u._id) ? { ...u, isActive: true } : u));
        toast(`✅ ${ids.length} enabled`, 'success');
      } else if (bulkAction === 'disable') {
        await axios.post('/api/auth/users/bulk-update', { ids, updates: { isActive: false } });
        setUsers(prev => prev.map(u => ids.includes(u._id) ? { ...u, isActive: false } : u));
        toast(`🔒 ${ids.length} disabled`, 'info');
      } else if (['admin','teacher','student'].includes(bulkAction)) {
        await axios.post('/api/auth/users/bulk-update', { ids, updates: { role: bulkAction } });
        setUsers(prev => prev.map(u => ids.includes(u._id) ? { ...u, role: bulkAction } : u));
        toast(`Role → ${bulkAction} for ${ids.length}`, 'success');
      }
      setSelected(new Set()); setBulkAction('');
    } catch { toast('Bulk action failed', 'warn'); }
  };

  const onDrawerClose = (action, id) => {
    if (action === 'deleted') setUsers(prev => prev.filter(u => u._id !== id));
    setDrawerUser(null);
  };
  const onDrawerUpdate = (updated) => {
    setUsers(prev => prev.map(u => u._id === updated._id ? updated : u));
    setDrawerUser(updated);
  };

  return (
    <div className="adm-users-tab">
      <div className="adm-toolbar">
        <div className="adm-filter-pills">
          {['all','admin','teacher','student'].map(f => (
            <button key={f} className={`adm-pill${filter === f ? ' active' : ''}`}
              onClick={() => { setFilter(f); setPage(1); }}>
              {f === 'all' ? '👥' : ROLE_ICONS[f]} {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="adm-pill-count">{counts[f]}</span>
            </button>
          ))}
          <select className="adm-status-filter" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="all">All Status</option>
            <option value="active">✅ Active</option>
            <option value="disabled">🔒 Disabled</option>
          </select>
        </div>
        <div className="adm-toolbar-right">
          <input className="adm-search" placeholder="🔍 Search name, email, subject..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }} />
          <button className="adm-btn-success" onClick={() => setShowCreate(s => !s)}>
            {showCreate ? '✕ Cancel' : '➕ New User'}
          </button>
          <button className="adm-btn-ghost" onClick={() => { window.open('/api/auth/users/export', '_blank'); toast('📥 Downloading CSV...', 'info'); }}>📥 CSV</button>
        </div>
      </div>

      {showCreate && (
        <CreateUserForm
          onSave={u => { setUsers(prev => [u, ...prev]); setShowCreate(false); toast('✅ User created', 'success'); }}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {selected.size > 0 && (
        <div className="adm-bulk-bar">
          <span className="adm-bulk-count">{selected.size} selected</span>
          <select className="adm-bulk-select" value={bulkAction} onChange={e => setBulkAction(e.target.value)}>
            <option value="">— Bulk Action —</option>
            <option value="enable">🔓 Enable Accounts</option>
            <option value="disable">🔒 Disable Accounts</option>
            <option value="student">🎓 Set as Student</option>
            <option value="teacher">👨‍🏫 Set as Teacher</option>
            <option value="admin">🛡️ Set as Admin</option>
            <option value="delete">🗑 Delete Users</option>
          </select>
          <button className="adm-btn-primary" onClick={applyBulk} disabled={!bulkAction}>Apply</button>
          <button className="adm-btn-ghost" onClick={() => setSelected(new Set())}>Clear</button>
          <span className="adm-bulk-hint">{filtered.length} total matching</span>
        </div>
      )}

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={selected.size === paginated.length && paginated.length > 0} onChange={toggleAll} /></th>
              <th className="adm-th-sort" onClick={() => sort('name')}>User<SortArrow col="name" /></th>
              <th>Role</th>
              <th>Details</th>
              <th className="adm-th-sort" onClick={() => sort('watchedIds')}>Progress<SortArrow col="watchedIds" /></th>
              <th className="adm-th-sort" onClick={() => sort('createdAt')}>Joined<SortArrow col="createdAt" /></th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && <tr><td colSpan="8" className="adm-table-empty">No users found</td></tr>}
            {paginated.map(u => (
              <tr key={u._id} className={`adm-tr${!u.isActive ? ' adm-tr-inactive' : ''}${selected.has(u._id) ? ' adm-tr-selected' : ''}`}>
                <td><input type="checkbox" checked={selected.has(u._id)} onChange={() => toggleSelect(u._id)} /></td>
                <td>
                  <div className="adm-user-cell" style={{ cursor: 'pointer' }} onClick={() => setDrawerUser(u)}>
                    <div className="adm-user-avatar-sm" style={{ background: ROLE_COLORS[u.role] + '22' }}>{ROLE_ICONS[u.role]}</div>
                    <div>
                      <div className="adm-user-name">{u.name}</div>
                      <div className="adm-user-email">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <select className="adm-role-sel" value={u.role} onChange={e => changeRole(u, e.target.value)}
                    style={{ borderColor: ROLE_COLORS[u.role] + '88', color: ROLE_COLORS[u.role] }}>
                    <option value="student">🎓 Student</option>
                    <option value="teacher">👨‍🏫 Teacher</option>
                    <option value="admin">🛡️ Admin</option>
                  </select>
                </td>
                <td className="adm-td-detail">
                  {u.role === 'student' && u.classNum && <span className="adm-tag">Class {u.classNum}</span>}
                  {u.role === 'teacher' && u.subject && <span className="adm-tag">{u.subject}</span>}
                </td>
                <td>
                  <div className="adm-progress-cell">
                    <span className="adm-watched-count">▶ {u.watchedIds?.length || 0}</span>
                    {u.completedSubjects?.length > 0 && <span className="adm-tag adm-tag-gold">🏆 {u.completedSubjects.length}</span>}
                  </div>
                </td>
                <td className="adm-td-date">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td><span className={`adm-status-badge${u.isActive ? ' active' : ' inactive'}`}>{u.isActive ? '● Active' : '● Disabled'}</span></td>
                <td>
                  <div className="adm-row-actions">
                    <button className="adm-act-btn" onClick={() => setDrawerUser(u)} title="View/Edit">✏️</button>
                    <button className="adm-act-btn" onClick={() => toggleActive(u)} title={u.isActive ? 'Disable' : 'Enable'}>{u.isActive ? '🔒' : '🔓'}</button>
                    <button className="adm-act-btn adm-act-danger" onClick={() => deleteUser(u)} title="Delete">🗑</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="adm-pagination">
          <button className="adm-page-btn" onClick={() => setPage(1)} disabled={page === 1}>«</button>
          <button className="adm-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce((acc, p, i, arr) => { if (i > 0 && p - arr[i-1] > 1) acc.push('…'); acc.push(p); return acc; }, [])
            .map((p, i) => p === '…'
              ? <span key={`e${i}`} className="adm-page-ellipsis">…</span>
              : <button key={p} className={`adm-page-btn${page === p ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            )}
          <button className="adm-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
          <button className="adm-page-btn" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</button>
          <span className="adm-page-info">{filtered.length} users · page {page}/{totalPages}</span>
        </div>
      )}

      {drawerUser && <UserDrawer user={drawerUser} onClose={onDrawerClose} onUpdate={onDrawerUpdate} toast={toast} />}
    </div>
  );
}

// ── Announcements Tab ─────────────────────────────────────────────────────────
function AnnouncementsTab({ toast }) {
  const [list, setList] = useState(() => { try { return JSON.parse(localStorage.getItem('kalvi_announcements') || '[]'); } catch { return []; } });
  const [form, setForm] = useState({ title: '', body: '', type: 'info', target: 'all' });
  const [showForm, setShowForm] = useState(false);
  const TYPE_COLORS = { info: '#4f8ef7', warn: '#f59e0b', success: '#22c55e', danger: '#ef4444' };
  const TYPE_ICONS  = { info: 'ℹ️', warn: '⚠️', success: '✅', danger: '🚨' };

  const post = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    const next = [{ ...form, id: Date.now(), createdAt: new Date().toISOString() }, ...list];
    setList(next); localStorage.setItem('kalvi_announcements', JSON.stringify(next));
    setForm({ title: '', body: '', type: 'info', target: 'all' }); setShowForm(false);
    toast('📢 Announcement posted', 'success');
  };

  const del = (id) => {
    const next = list.filter(a => a.id !== id);
    setList(next); localStorage.setItem('kalvi_announcements', JSON.stringify(next));
    toast('Deleted', 'info');
  };

  return (
    <div className="adm-announce-tab">
      <div className="adm-announce-toolbar">
        <div className="adm-section-title">📢 Platform Announcements</div>
        <button className="adm-btn-primary" onClick={() => setShowForm(s => !s)}>{showForm ? '✕ Cancel' : '➕ New Announcement'}</button>
      </div>

      {showForm && (
        <form className="adm-create-form" onSubmit={post}>
          <div className="adm-create-form-title">📢 Post Announcement</div>
          <div className="adm-form-grid">
            <div className="adm-form-field" style={{ gridColumn: '1/-1' }}>
              <label>Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Announcement title" />
            </div>
            <div className="adm-form-field" style={{ gridColumn: '1/-1' }}>
              <label>Message *</label>
              <textarea className="adm-textarea" rows={3} value={form.body}
                onChange={e => setForm(f => ({ ...f, body: e.target.value }))} required placeholder="Write your message..." />
            </div>
            <div className="adm-form-field">
              <label>Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="info">ℹ️ Info</option>
                <option value="warn">⚠️ Warning</option>
                <option value="success">✅ Success</option>
                <option value="danger">🚨 Urgent</option>
              </select>
            </div>
            <div className="adm-form-field">
              <label>Target Audience</label>
              <select value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))}>
                <option value="all">👥 All Users</option>
                <option value="student">🎓 Students Only</option>
                <option value="teacher">👨‍🏫 Teachers Only</option>
                <option value="admin">🛡️ Admins Only</option>
              </select>
            </div>
          </div>
          <div className="adm-form-actions">
            <button type="button" className="adm-btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="adm-btn-primary">📢 Post</button>
          </div>
        </form>
      )}

      <div className="adm-announce-list">
        {list.length === 0 && <div className="adm-empty">No announcements yet. Post one above.</div>}
        {list.map(a => (
          <div key={a.id} className="adm-announce-card" style={{ borderLeftColor: TYPE_COLORS[a.type] }}>
            <div className="adm-announce-card-hdr">
              <span>{TYPE_ICONS[a.type]}</span>
              <div className="adm-announce-title">{a.title}</div>
              <span className="adm-tag" style={{ marginLeft: 'auto' }}>{a.target === 'all' ? '👥 All' : `${ROLE_ICONS[a.target]} ${a.target}`}</span>
              <span className="adm-announce-date">{new Date(a.createdAt).toLocaleDateString()}</span>
              <button className="adm-act-btn adm-act-danger" onClick={() => del(a.id)}>🗑</button>
            </div>
            <div className="adm-announce-body">{a.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsTab({ toast }) {
  const [settings, setSettings] = useState(() => { try { return JSON.parse(localStorage.getItem('adminSettings') || '{}'); } catch { return {}; } });
  const [health, setHealth] = useState(null);

  useEffect(() => {
    axios.get('/api/health')
      .then(res => setHealth(res.data))
      .catch(() => setHealth({ status: 'error' }));
  }, []);

  const toggle = (key) => {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next); localStorage.setItem('adminSettings', JSON.stringify(next));
    toast(`${key}: ${!settings[key] ? 'ON' : 'OFF'}`, 'success');
  };

  const TR = ({ label, desc, k, icon }) => (
    <div className="adm-setting-row">
      <div className="adm-setting-info">
        <div className="adm-setting-label">{icon} {label}</div>
        <div className="adm-setting-desc">{desc}</div>
      </div>
      <button className={`adm-toggle${settings[k] ? ' on' : ''}`} onClick={() => toggle(k)} aria-label={label}>
        <span className="adm-toggle-knob" />
      </button>
    </div>
  );

  const StatusDot = ({ ok }) => (
    <span className={`adm-api-status ${ok ? 'ok' : 'err'}`}>{ok ? '● Online' : '● Offline'}</span>
  );

  return (
    <div className="adm-settings-tab">
      <div className="adm-settings-section">
        <div className="adm-settings-section-title">🎓 Learning</div>
        <TR k="sequentialLock"   icon="🔒" label="Sequential Lock"   desc="Students must complete each video before unlocking the next" />
        <TR k="autoplayDefault"  icon="▶️" label="Autoplay Default"  desc="New users start with autoplay enabled" />
        <TR k="showStreaks"      icon="🔥" label="Show Streaks"      desc="Display learning streak badges to users" />
      </div>
      <div className="adm-settings-section">
        <div className="adm-settings-section-title">🔐 Accounts</div>
        <TR k="openRegistration" icon="📝" label="Open Registration" desc="Anyone can create a new account" />
        <TR k="adminApproval"    icon="✅" label="Admin Approval"    desc="New accounts need admin approval before access" />
        <TR k="allowRoleSelect"  icon="🎭" label="Role Selection"    desc="Users can choose their role during registration" />
      </div>
      <div className="adm-settings-section">
        <div className="adm-settings-section-title">🔑 Server Status</div>
        {health ? (
          <>
            <div className="adm-api-row">
              <span className="adm-api-label">API Server</span>
              <StatusDot ok={health.status === 'ok'} />
              <span className="adm-api-hint">Uptime: {health.uptime}s</span>
            </div>
            <div className="adm-api-row">
              <span className="adm-api-label">Database</span>
              <StatusDot ok={true} />
              <span className="adm-api-hint">{health.db === 'local-json' ? '📁 Local JSON' : '🍃 MongoDB'}</span>
            </div>
            <div className="adm-api-row">
              <span className="adm-api-label">AI Tutor (Gemini)</span>
              <StatusDot ok={health.ai === 'gemini-configured'} />
              <span className="adm-api-hint">{health.ai === 'gemini-configured' ? 'GEMINI_API_KEY set' : 'Add GEMINI_API_KEY to .env'}</span>
            </div>
            <div className="adm-api-row">
              <span className="adm-api-label">Cache Entries</span>
              <span className="adm-api-status ok">● Active</span>
              <span className="adm-api-hint">{health.cache} cached playlists</span>
            </div>
          </>
        ) : (
          <div className="adm-loading">Checking server status...</div>
        )}
        <button className="adm-btn-ghost" style={{ marginTop: 12 }} onClick={() => {
          axios.delete('/api/cache').then(() => toast('🗑 Cache cleared', 'success')).catch(() => toast('Failed', 'warn'));
        }}>🗑 Clear API Cache</button>
      </div>
    </div>
  );
}

// ── Credentials Tab ───────────────────────────────────────────────────────────
const CLASS_CREDS = Array.from({ length: 12 }, (_, i) => ({
  cls:      i + 1,
  label:    i + 1 <= 9 ? `Class ${i + 1}` : i + 1 === 10 ? 'Class 10 (SSLC)' : i + 1 === 11 ? 'Class 11 (+1)' : 'Class 12 (+2)',
  email:    `class${i + 1}@suct.edu`,
  password: `Class@${i + 1}`,
}));

function CredentialsTab({ users, toast }) {
  const [copied, setCopied] = useState(null);

  const copy = (text, key) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1800);
      toast('📋 Copied!', 'success');
    });
  };

  const copyAll = () => {
    const text = CLASS_CREDS.map(c =>
      `Class ${c.cls}: ${c.email} / ${c.password}`
    ).join('\n');
    navigator.clipboard?.writeText(text).then(() => toast('📋 All credentials copied!', 'success'));
  };

  const printCards = () => window.print();

  // Check which accounts actually exist
  const existingEmails = new Set(users.map(u => u.email));

  return (
    <div className="cred-tab">
      <div className="cred-header">
        <div>
          <div className="cred-title">🔑 Class Student Credentials</div>
          <div className="cred-sub">One shared account per class — distribute to students</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="adm-btn-ghost" onClick={copyAll}>📋 Copy All</button>
          <button className="adm-btn-ghost" onClick={printCards}>🖨️ Print</button>
        </div>
      </div>

      <div className="cred-info-box">
        <span>💡</span>
        <span>
          These are <strong>shared class accounts</strong>. Each class has one login that all students in that class can use.
          For individual accounts, use the <strong>Users tab</strong> to create personal accounts.
        </span>
      </div>

      <div className="cred-grid">
        {CLASS_CREDS.map(c => {
          const exists = existingEmails.has(c.email);
          return (
            <div key={c.cls} className={`cred-card${!exists ? ' cred-card-missing' : ''}`}>
              <div className="cred-card-header">
                <div className="cred-class-num">{c.cls}</div>
                <div className="cred-class-label">{c.label}</div>
                {exists
                  ? <span className="cred-status-ok">● Active</span>
                  : <span className="cred-status-miss">● Missing</span>
                }
              </div>

              <div className="cred-row">
                <span className="cred-row-label">Email</span>
                <div className="cred-row-val">
                  <code>{c.email}</code>
                  <button
                    className="cred-copy-btn"
                    onClick={() => copy(c.email, `e${c.cls}`)}
                    title="Copy email"
                  >
                    {copied === `e${c.cls}` ? '✓' : '⎘'}
                  </button>
                </div>
              </div>

              <div className="cred-row">
                <span className="cred-row-label">Password</span>
                <div className="cred-row-val">
                  <code>{c.password}</code>
                  <button
                    className="cred-copy-btn"
                    onClick={() => copy(c.password, `p${c.cls}`)}
                    title="Copy password"
                  >
                    {copied === `p${c.cls}` ? '✓' : '⎘'}
                  </button>
                </div>
              </div>

              <button
                className="cred-copy-both"
                onClick={() => copy(`${c.email} / ${c.password}`, `b${c.cls}`)}
              >
                {copied === `b${c.cls}` ? '✓ Copied!' : '📋 Copy Both'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="cred-note">
        <strong>To recreate missing accounts:</strong> run <code>node seedStudents.js</code> in the server folder.
      </div>
    </div>
  );
}

// ── Main AdminDashboard ───────────────────────────────────────────────────────
export default function AdminDashboard({ onClose, toast }) {
  const [tab, setTab]                   = useState('overview');
  const [users, setUsers]               = useState([]);
  const [stats, setStats]               = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setStatsLoading(true);
    try {
      const [sRes, uRes] = await Promise.all([axios.get('/api/auth/stats'), axios.get('/api/auth/users')]);
      setStats(sRes.data); setUsers(uRes.data.users);
    } catch {}
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => { loadAll(); }, []);

  const TABS = [
    { id: 'overview',      label: '📊 Overview' },
    { id: 'users',         label: '👥 Users' },
    { id: 'credentials',   label: '🔑 Class IDs' },
    { id: 'announcements', label: '📢 Announce' },
    { id: 'settings',      label: '⚙️ Settings' },
  ];

  return (
    <div className="manage-overlay" onClick={onClose}>
      <div className="adm-dashboard-panel" onClick={e => e.stopPropagation()}>

        <div className="manage-hdr">
          <div>
            <div className="manage-title">🛡️ Admin Dashboard</div>
            <div className="manage-sub">
              {stats ? `${stats.total} users · ${stats.activeAccounts} active · ${stats.totalWatched} videos watched` : 'Suct EduConnect Platform Control Panel'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="adm-btn-ghost" onClick={() => { loadAll(); toast('🔄 Refreshed', 'info'); }}>🔄 Refresh</button>
            <button className="manage-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="adm-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`adm-tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
              {t.id === 'users' && users.length > 0 && <span className="adm-tab-badge">{users.length}</span>}
            </button>
          ))}
        </div>

        <div className="adm-body">
          {tab === 'overview'      && <OverviewTab stats={stats} loading={statsLoading} users={users} />}
          {tab === 'users'         && <UsersTab users={users} setUsers={setUsers} toast={toast} />}
          {tab === 'credentials'   && <CredentialsTab users={users} toast={toast} />}
          {tab === 'announcements' && <AnnouncementsTab toast={toast} />}
          {tab === 'settings'      && <SettingsTab toast={toast} />}
        </div>
      </div>
    </div>
  );
}
