const router = require('express').Router();
const { signToken, protect, requireRole, getUser } = require('../middleware/auth');

// Always use the right model (Atlas or local JSON db)
const U = () => getUser();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role, subject, classNum } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required' });
  if (!['admin', 'teacher', 'student'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    if (await U().findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
    const user = await U().create({ name, email, password, role, subject: subject || '', classNum: classNum || null });
    res.status(201).json({ token: signToken(user._id), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const user = await U().findOne({ email });
    if (!user || !(await user.matchPassword(password))) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account disabled' });
    res.json({ token: signToken(user._id), user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => res.json({ user: req.user }));

// PATCH /api/auth/progress
router.patch('/progress', protect, async (req, res) => {
  const { watchedIds, completedSubjects, streakDays } = req.body;
  try {
    const update = {};
    if (watchedIds)        update.watchedIds        = watchedIds;
    if (completedSubjects) update.completedSubjects = completedSubjects;
    if (streakDays)        update.streakDays        = streakDays;
    const user = await U().findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/my-students — teacher fetches their students
router.get('/my-students', protect, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const query = { role: 'student' };
    if (req.user.role === 'teacher') {
      const conditions = [];
      if (req.user.classNum) conditions.push({ classNum: req.user.classNum });
      if (req.user.subject)  conditions.push({ subject: req.user.subject });
      if (conditions.length) query.$or = conditions;
    }
    const result = await U().find(query);
    const students = Array.isArray(result) ? result : await result;
    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/stats
router.get('/stats', protect, requireRole('admin'), async (req, res) => {
  try {
    const [total, admins, teachers, students] = await Promise.all([
      U().countDocuments(),
      U().countDocuments({ role: 'admin' }),
      U().countDocuments({ role: 'teacher' }),
      U().countDocuments({ role: 'student' }),
    ]);
    const allResult = await U().find({});
    const allUsers = Array.isArray(allResult) ? allResult : await allResult;
    const totalWatched   = allUsers.reduce((s, u) => s + (u.watchedIds?.length || 0), 0);
    const activeAccounts = allUsers.filter(u => u.isActive).length;
    const activeToday    = allUsers.filter(u => u.watchedIds?.length > 0).length;
    res.json({ total, admins, teachers, students, activeToday, totalWatched, activeAccounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users
router.get('/users', protect, requireRole('admin'), async (req, res) => {
  try {
    const result = await U().find({});
    const users = Array.isArray(result) ? result : await result;
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users/export
router.get('/users/export', protect, requireRole('admin'), async (req, res) => {
  try {
    const result = await U().find({});
    const users = Array.isArray(result) ? result : await result;
    const header = 'Name,Email,Role,Class,Subject,Active,Watched,Joined\n';
    const rows = users.map(u =>
      `"${u.name}","${u.email}","${u.role}","${u.classNum || ''}","${u.subject || ''}","${u.isActive}","${u.watchedIds?.length || 0}","${new Date(u.createdAt).toLocaleDateString()}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="kalvi-users.csv"');
    res.send(header + rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users — admin create user
router.post('/users', protect, requireRole('admin'), async (req, res) => {
  const { name, email, password, role, subject, classNum } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required' });
  try {
    if (await U().findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
    const user = await U().create({ name, email, password, role, subject: subject || '', classNum: classNum || null });
    res.status(201).json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/auth/users/:id
router.patch('/users/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      const user = await U().findById(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      user._modified_password = updates.password;
      delete updates.password;
      Object.assign(user, updates);
      await user.save();
      return res.json({ user });
    }
    const user = await U().findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id
router.delete('/users/:id', protect, requireRole('admin'), async (req, res) => {
  try {
    await U().findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users/bulk-delete
router.post('/users/bulk-delete', protect, requireRole('admin'), async (req, res) => {
  try {
    const { ids } = req.body;
    await U().deleteMany({ _id: { $in: ids } });
    res.json({ message: `${ids.length} users deleted` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/users/bulk-update
router.post('/users/bulk-update', protect, requireRole('admin'), async (req, res) => {
  try {
    const { ids, updates } = req.body;
    await U().updateMany({ _id: { $in: ids } }, updates);
    res.json({ message: `${ids.length} users updated` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
