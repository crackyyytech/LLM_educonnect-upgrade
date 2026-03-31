import { useState } from 'react';

const ICONS = ['📖','🔤','📐','🔬','🌍','⚡','🧪','🌱','🦁','💻','📊','📈','🔭','🏛️','🗺️','⚖️','🧬','🧾','💰','🌿','🖥️','🎨','🎵','🏃','🌐','📚','🔢','✏️'];

export default function ManagePanel({ classes, onSave, onClose, defaultClasses, userRole }) {
  const isAdmin = userRole === 'admin';
  const [data, setData] = useState(() => JSON.parse(JSON.stringify(classes)));
  const [activeClass, setActiveClass] = useState(0);
  const [editingSubject, setEditingSubject] = useState(null); // { classIdx, subIdx } or null
  const [newSubject, setNewSubject] = useState({ name: '', icon: '📖', id: '' });
  const [addingSubject, setAddingSubject] = useState(false);
  const [addingClass, setAddingClass] = useState(false);
  const [newClass, setNewClass] = useState({ class: '', label: '' });
  const [saved, setSaved] = useState(false);
  const [iconPicker, setIconPicker] = useState(false);
  const [iconPickerFor, setIconPickerFor] = useState(null); // 'new' or subIdx

  const cls = data[activeClass];

  const updateSubject = (subIdx, field, value) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[activeClass].subjects[subIdx][field] = value;
      return next;
    });
  };

  const deleteSubject = (subIdx) => {
    if (!confirm(`Delete "${data[activeClass].subjects[subIdx].name}"?`)) return;
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[activeClass].subjects.splice(subIdx, 1);
      return next;
    });
    setEditingSubject(null);
  };

  const addSubject = () => {
    if (!newSubject.name.trim() || !newSubject.id.trim()) return;
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      next[activeClass].subjects.push({ ...newSubject, name: newSubject.name.trim(), id: newSubject.id.trim() });
      return next;
    });
    setNewSubject({ name: '', icon: '📖', id: '' });
    setAddingSubject(false);
  };

  const moveSubject = (subIdx, dir) => {
    setData(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const subs = next[activeClass].subjects;
      const target = subIdx + dir;
      if (target < 0 || target >= subs.length) return prev;
      [subs[subIdx], subs[target]] = [subs[target], subs[subIdx]];
      return next;
    });
  };

  const addClass = () => {
    const num = parseInt(newClass.class);
    if (!num || !newClass.label.trim()) return;
    if (data.find(c => c.class === num)) { alert('Class number already exists'); return; }
    setData(prev => {
      const next = [...JSON.parse(JSON.stringify(prev)), { class: num, label: newClass.label.trim(), subjects: [] }];
      next.sort((a, b) => a.class - b.class);
      return next;
    });
    setNewClass({ class: '', label: '' });
    setAddingClass(false);
  };

  const deleteClass = (idx) => {
    if (!confirm(`Delete "${data[idx].label}" and all its subjects?`)) return;
    setData(prev => prev.filter((_, i) => i !== idx));
    setActiveClass(0);
  };

  const handleSave = () => {
    onSave(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const extractPlaylistId = (input) => {
    const trimmed = input.trim();
    // Full URL with list= param
    const listMatch = trimmed.match(/[?&]list=([^&\s]+)/);
    if (listMatch) return listMatch[1];
    // Already a raw playlist ID (starts with PL, UU, FL, etc.)
    if (/^(PL|UU|FL|RD|OL)[a-zA-Z0-9_-]{10,}/.test(trimmed)) return trimmed;
    return trimmed;
  };

  return (
    <div className="manage-overlay" onClick={onClose}>
      <div className="manage-panel" onClick={e => e.stopPropagation()}>
        <div className="manage-hdr">
          <div>
            <div className="manage-title">⚙️ Manage Subjects & Lessons</div>
            <div className="manage-sub">Add, edit, or remove subjects and playlist IDs</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {isAdmin && (
              <button className="manage-cancel-btn" onClick={() => {
                if (confirm('Reset to default subjects? Your custom changes will be lost.')) onSave(JSON.parse(JSON.stringify(defaultClasses)));
              }} title="Reset to defaults">↺ Reset</button>
            )}
            <button className="manage-cancel-btn" onClick={() => {
              const a = Object.assign(document.createElement('a'), {
                href: URL.createObjectURL(new Blob([JSON.stringify({ classes: data }, null, 2)], { type: 'application/json' })),
                download: 'kalvi-subjects.json',
              });
              a.click(); URL.revokeObjectURL(a.href);
            }} title="Export as JSON">📤 Export</button>
            <label className="manage-cancel-btn" style={{ cursor: 'pointer' }} title="Import from JSON">
              📥 Import
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  try {
                    const parsed = JSON.parse(ev.target.result);
                    const imported = parsed.classes || parsed;
                    if (!Array.isArray(imported)) { alert('Invalid format'); return; }
                    setData(imported);
                  } catch { alert('Invalid JSON file'); }
                };
                reader.readAsText(file);
                e.target.value = '';
              }} />
            </label>
            <button className={`manage-save-btn${saved ? ' saved' : ''}`} onClick={handleSave}>
              {saved ? '✓ Saved!' : '💾 Save Changes'}
            </button>
            <button className="manage-close-btn" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="manage-body">
          {/* Class list */}
          <div className="manage-classes">
            <div className="manage-section-title">Classes</div>
            {data.map((c, i) => (
              <button
                key={c.class}
                className={`manage-class-btn${activeClass === i ? ' active' : ''}`}
                onClick={() => { setActiveClass(i); setEditingSubject(null); setAddingSubject(false); }}
              >
                <span className="manage-class-num">{c.class}</span>
                <span className="manage-class-label">{c.label}</span>
                <span className="manage-class-count">{c.subjects.length}</span>
              </button>
            ))}
            {addingClass ? (
              <div className="manage-add-class-form">
                <input
                  className="manage-input"
                  placeholder="Class number (e.g. 13)"
                  type="number"
                  value={newClass.class}
                  onChange={e => setNewClass(p => ({ ...p, class: e.target.value }))}
                />
                <input
                  className="manage-input"
                  placeholder="Label (e.g. வகுப்பு 13)"
                  value={newClass.label}
                  onChange={e => setNewClass(p => ({ ...p, label: e.target.value }))}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="manage-confirm-btn" onClick={addClass}>Add</button>
                  <button className="manage-cancel-btn" onClick={() => setAddingClass(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button className="manage-add-class-btn" onClick={() => setAddingClass(true)}>+ Add Class</button>
            )}
          </div>

          {/* Subject list */}
          <div className="manage-subjects">
            <div className="manage-subjects-hdr">
              <div>
                <div className="manage-section-title">{cls?.label} — Subjects</div>
                <div className="manage-section-sub">{cls?.subjects.length} subjects</div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {isAdmin && (
                  <button className="manage-del-class-btn" onClick={() => deleteClass(activeClass)} title="Delete this class">🗑 Class</button>
                )}
                <button className="manage-add-sub-btn" onClick={() => { setAddingSubject(true); setEditingSubject(null); }}>+ Add Subject</button>
              </div>
            </div>

            {/* Add subject form */}
            {addingSubject && (
              <div className="manage-add-form">
                <div className="manage-form-row">
                  <button
                    className="manage-icon-pick"
                    onClick={() => { setIconPicker(true); setIconPickerFor('new'); }}
                  >{newSubject.icon}</button>
                  <input
                    className="manage-input"
                    placeholder="Subject name (e.g. இயற்பியல்)"
                    value={newSubject.name}
                    onChange={e => setNewSubject(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="manage-form-row">
                  <input
                    className="manage-input manage-input-full"
                    placeholder="YouTube Playlist ID or full URL"
                    value={newSubject.id}
                    onChange={e => setNewSubject(p => ({ ...p, id: extractPlaylistId(e.target.value) }))}
                  />
                </div>
                <div className="manage-pl-hint">
                  Paste a playlist URL like <code>youtube.com/playlist?list=PL...</code> or just the ID
                </div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                  <button className="manage-confirm-btn" onClick={addSubject} disabled={!newSubject.name.trim() || !newSubject.id.trim()}>
                    ✓ Add Subject
                  </button>
                  <button className="manage-cancel-btn" onClick={() => setAddingSubject(false)}>Cancel</button>
                </div>
              </div>
            )}

            {/* Subject rows */}
            <div className="manage-sub-list">
              {cls?.subjects.length === 0 && (
                <div className="manage-empty">No subjects yet. Click "+ Add Subject" to get started.</div>
              )}
              {cls?.subjects.map((sub, si) => (
                <div key={si} className={`manage-sub-row${editingSubject === si ? ' editing' : ''}`}>
                  {editingSubject === si ? (
                    <div className="manage-sub-edit">
                      <div className="manage-form-row">
                        <button
                          className="manage-icon-pick"
                          onClick={() => { setIconPicker(true); setIconPickerFor(si); }}
                        >{sub.icon}</button>
                        <input
                          className="manage-input"
                          value={sub.name}
                          onChange={e => updateSubject(si, 'name', e.target.value)}
                          placeholder="Subject name"
                        />
                      </div>
                      <div className="manage-form-row">
                        <input
                          className="manage-input manage-input-full"
                          value={sub.id}
                          onChange={e => updateSubject(si, 'id', extractPlaylistId(e.target.value))}
                          placeholder="Playlist ID or URL"
                        />
                      </div>
                      <div className="manage-pl-hint">ID: <code>{sub.id}</code></div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button className="manage-confirm-btn" onClick={() => setEditingSubject(null)}>✓ Done</button>
                        <button className="manage-del-btn" onClick={() => deleteSubject(si)}>🗑 Delete</button>
                      </div>
                    </div>
                  ) : (
                    <div className="manage-sub-info" onClick={() => setEditingSubject(si)}>
                      <span className="manage-sub-icon">{sub.icon}</span>
                      <div className="manage-sub-meta">
                        <div className="manage-sub-name">{sub.name}</div>
                        <div className="manage-sub-id">{sub.id}</div>
                      </div>
                      <div className="manage-sub-actions">
                        <button className="manage-move-btn" onClick={e => { e.stopPropagation(); moveSubject(si, -1); }} disabled={si === 0}>↑</button>
                        <button className="manage-move-btn" onClick={e => { e.stopPropagation(); moveSubject(si, 1); }} disabled={si === cls.subjects.length - 1}>↓</button>
                        <button className="manage-edit-btn" onClick={e => { e.stopPropagation(); setEditingSubject(si); setAddingSubject(false); }}>✏️</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Icon picker */}
        {iconPicker && (
          <div className="icon-picker-overlay" onClick={() => setIconPicker(false)}>
            <div className="icon-picker" onClick={e => e.stopPropagation()}>
              <div className="icon-picker-title">Choose Icon</div>
              <div className="icon-picker-grid">
                {ICONS.map(ic => (
                  <button key={ic} className="icon-pick-btn" onClick={() => {
                    if (iconPickerFor === 'new') setNewSubject(p => ({ ...p, icon: ic }));
                    else updateSubject(iconPickerFor, 'icon', ic);
                    setIconPicker(false);
                  }}>{ic}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
