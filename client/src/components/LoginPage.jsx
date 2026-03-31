import { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth.js';

const ROLES = [
  {
    id: 'student',
    label: 'மாணவர்',
    labelEn: 'Student',
    icon: '🎓',
    color: '#0d9488',
    colorLight: 'rgba(13,148,136,0.12)',
    desc: 'Watch lessons & track progress',
    features: ['Video lessons Class 1–12', 'AI Tutor assistant', 'Progress tracking'],
    demo: { email: 'student@kalvi.com', password: 'study123' },
  },
  {
    id: 'teacher',
    label: 'ஆசிரியர்',
    labelEn: 'Teacher',
    icon: '👨‍🏫',
    color: '#f59e0b',
    colorLight: 'rgba(245,158,11,0.12)',
    desc: 'Manage content & monitor students',
    features: ['Manage playlists', 'Student progress view', 'Subject management'],
    demo: { email: 'teacher@kalvi.com', password: 'teach123' },
  },
  {
    id: 'admin',
    label: 'நிர்வாகி',
    labelEn: 'Admin',
    icon: '🛡️',
    color: '#ef4444',
    colorLight: 'rgba(239,68,68,0.12)',
    desc: 'Full platform control',
    features: ['User management', 'Analytics dashboard', 'System settings'],
    demo: { email: 'admin@kalvi.com', password: 'admin123' },
  },
];

const STATS = [
  { num: '12', label: 'Classes' },
  { num: '81+', label: 'Subjects' },
  { num: '1000+', label: 'Videos' },
  { num: 'Free', label: 'Always' },
];

export default function LoginPage() {
  const { login, register } = useAuth();

  const [mode, setMode]         = useState('role');
  const [role, setRole]         = useState(null);
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [subject, setSubject]   = useState('');
  const [classNum, setClassNum] = useState('');
  const [animKey, setAnimKey]   = useState(0);

  const selectRole = (r) => {
    setRole(r); setMode('login'); setError('');
    setAnimKey(k => k + 1);
  };

  const goBack = () => {
    setMode('role'); setError('');
    setAnimKey(k => k + 1);
  };

  const fillDemo = () => {
    if (!role?.demo) return;
    setEmail(role.demo.email);
    setPassword(role.demo.password);
  };

  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { await login(email, password); }
    catch (err) { setError(err.response?.data?.error || 'Invalid credentials. Try demo account.'); }
    finally { setBusy(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Full name is required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError(''); setBusy(true);
    try { await register({ name, email, password, role: role.id, subject, classNum: classNum ? Number(classNum) : null }); }
    catch (err) { setError(err.response?.data?.error || 'Registration failed. Try again.'); }
    finally { setBusy(false); }
  };

  const pwStrength = !password ? null : password.length < 6 ? 'weak' : password.length < 10 ? 'fair' : 'strong';
  const pwPct      = !password ? 0 : password.length < 6 ? 33 : password.length < 10 ? 66 : 100;
  const pwClr      = { weak: '#ef4444', fair: '#f59e0b', strong: '#10b981' };

  return (
    <div className="lp-root">
      {/* ── LEFT PANEL ── */}
      <div className="lp-left">
        <div className="lp-left-inner">
          {/* Brand */}
          <div className="lp-brand">
            <div className="lp-brand-icon">📚</div>
            <div>
              <div className="lp-brand-name">Suct EduConnect</div>
              <div className="lp-brand-tag">Samacheer Kalvi · Tamil Nadu</div>
            </div>
          </div>

          {/* Headline */}
          <div className="lp-headline">
            <h1 className="lp-h1">
              Learn Smarter,<br />
              <span className="lp-h1-accent">Grow Faster</span>
            </h1>
            <p className="lp-tagline">
              Tamil Nadu's complete Samacheer Kalvi video learning platform — Class 1 to 12, all subjects, free forever.
            </p>
          </div>

          {/* Stats */}
          <div className="lp-stats">
            {STATS.map(s => (
              <div key={s.label} className="lp-stat">
                <div className="lp-stat-num">{s.num}</div>
                <div className="lp-stat-lbl">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div className="lp-pills">
            {['🤖 AI Tutor', '📊 Progress Tracking', '🔥 Streak System', '📝 Notes', '🎯 Focus Mode', '📱 Mobile Ready'].map(f => (
              <span key={f} className="lp-pill">{f}</span>
            ))}
          </div>
        </div>

        {/* Decorative orbs */}
        <div className="lp-orb lp-orb1" />
        <div className="lp-orb lp-orb2" />
        <div className="lp-orb lp-orb3" />
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="lp-right">
        <div className="lp-form-wrap" key={animKey}>

          {/* ── ROLE SELECTION ── */}
          {mode === 'role' && (
            <div className="lp-section">
              <div className="lp-section-header">
                <h2 className="lp-section-title">Welcome back 👋</h2>
                <p className="lp-section-sub">Select your role to sign in or create an account</p>
              </div>

              <div className="lp-role-grid">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    className="lp-role-card"
                    onClick={() => selectRole(r)}
                    style={{ '--rc': r.color, '--rcl': r.colorLight }}
                  >
                    <div className="lp-role-icon-wrap">
                      <span className="lp-role-icon">{r.icon}</span>
                    </div>
                    <div className="lp-role-body">
                      <div className="lp-role-name-ta">{r.label}</div>
                      <div className="lp-role-name-en">{r.labelEn}</div>
                      <div className="lp-role-desc">{r.desc}</div>
                      <ul className="lp-role-features">
                        {r.features.map(f => (
                          <li key={f}><span className="lp-role-check">✓</span>{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="lp-role-arrow">→</div>
                  </button>
                ))}
              </div>

              <div className="lp-demo-note">
                <span className="lp-demo-dot" />
                Demo accounts available — click any role to auto-fill credentials
              </div>
            </div>
          )}

          {/* ── LOGIN ── */}
          {mode === 'login' && role && (
            <div className="lp-section">
              <button className="lp-back-btn" onClick={goBack}>
                ← Back to roles
              </button>

              <div className="lp-role-badge" style={{ '--rc': role.color, '--rcl': role.colorLight }}>
                <span>{role.icon}</span>
                <span>{role.labelEn}</span>
                <span className="lp-role-badge-ta">{role.label}</span>
              </div>

              <div className="lp-section-header">
                <h2 className="lp-section-title">Sign In</h2>
                <p className="lp-section-sub">உள்நுழைக — Welcome back</p>
              </div>

              {role.demo && (
                <button className="lp-demo-btn" onClick={fillDemo} type="button">
                  <span className="lp-demo-btn-icon">⚡</span>
                  <span>Use demo: <strong>{role.demo.email}</strong></span>
                </button>
              )}

              <form className="lp-form" onSubmit={handleLogin}>
                <div className="lp-field">
                  <label className="lp-label">Email address</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">✉️</span>
                    <input
                      className="lp-input"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="lp-field">
                  <label className="lp-label">Password</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">🔑</span>
                    <input
                      className="lp-input"
                      style={{ paddingRight: 44 }}
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button type="button" className="lp-pw-toggle" onClick={() => setShowPw(s => !s)}>
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="lp-error">
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button type="submit" className="lp-submit-btn" disabled={busy} style={{ '--rc': role.color }}>
                  {busy
                    ? <><span className="lp-spinner" /> Signing in...</>
                    : <>{role.icon} Sign In as {role.labelEn}</>
                  }
                </button>
              </form>

              <div className="lp-divider"><span>or</span></div>

              <p className="lp-switch">
                Don't have an account?{' '}
                <button onClick={() => { setMode('register'); setError(''); setAnimKey(k => k + 1); }}>
                  Create one free
                </button>
              </p>
            </div>
          )}

          {/* ── REGISTER ── */}
          {mode === 'register' && role && (
            <div className="lp-section">
              <button className="lp-back-btn" onClick={() => { setMode('login'); setError(''); setAnimKey(k => k + 1); }}>
                ← Back to sign in
              </button>

              <div className="lp-role-badge" style={{ '--rc': role.color, '--rcl': role.colorLight }}>
                <span>{role.icon}</span>
                <span>{role.labelEn}</span>
                <span className="lp-role-badge-ta">{role.label}</span>
              </div>

              <div className="lp-section-header">
                <h2 className="lp-section-title">Create Account</h2>
                <p className="lp-section-sub">பதிவு செய்க — Join for free</p>
              </div>

              <form className="lp-form" onSubmit={handleRegister}>
                <div className="lp-field">
                  <label className="lp-label">Full Name</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">👤</span>
                    <input className="lp-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" required autoFocus />
                  </div>
                </div>

                <div className="lp-field">
                  <label className="lp-label">Email address</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">✉️</span>
                    <input className="lp-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
                  </div>
                </div>

                <div className="lp-field">
                  <label className="lp-label">Password</label>
                  <div className="lp-input-wrap">
                    <span className="lp-input-icon">🔑</span>
                    <input
                      className="lp-input"
                      style={{ paddingRight: 44 }}
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                    />
                    <button type="button" className="lp-pw-toggle" onClick={() => setShowPw(s => !s)}>
                      {showPw ? '🙈' : '👁️'}
                    </button>
                  </div>
                  {pwStrength && (
                    <div className="lp-pw-strength">
                      <div className="lp-pw-bar">
                        <div className="lp-pw-fill" style={{ width: pwPct + '%', background: pwClr[pwStrength] }} />
                      </div>
                      <span style={{ color: pwClr[pwStrength] }}>{pwStrength}</span>
                    </div>
                  )}
                </div>

                {role.id === 'teacher' && (
                  <div className="lp-field">
                    <label className="lp-label">Subject <span className="lp-optional">(optional)</span></label>
                    <div className="lp-input-wrap">
                      <span className="lp-input-icon">📖</span>
                      <input className="lp-input" type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. கணிதம், Physics" />
                    </div>
                  </div>
                )}

                {role.id === 'student' && (
                  <div className="lp-field">
                    <label className="lp-label">Class <span className="lp-optional">(optional)</span></label>
                    <div className="lp-input-wrap">
                      <span className="lp-input-icon">🏫</span>
                      <input className="lp-input" type="number" value={classNum} onChange={e => setClassNum(e.target.value)} placeholder="1 – 12" min={1} max={12} />
                    </div>
                  </div>
                )}

                {error && (
                  <div className="lp-error">
                    <span>⚠️</span> {error}
                  </div>
                )}

                <button type="submit" className="lp-submit-btn" disabled={busy} style={{ '--rc': role.color }}>
                  {busy
                    ? <><span className="lp-spinner" /> Creating account...</>
                    : <>✅ Create Account</>
                  }
                </button>
              </form>

              <p className="lp-switch">
                Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); setAnimKey(k => k + 1); }}>
                  Sign in
                </button>
              </p>
            </div>
          )}

          <div className="lp-footer">
            Suct EduConnect © 2026 · Samacheer Kalvi Educational Platform
          </div>
        </div>
      </div>
    </div>
  );
}
