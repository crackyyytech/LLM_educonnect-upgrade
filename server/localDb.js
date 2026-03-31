/**
 * localDb.js — zero-dependency JSON file database
 * Mimics the Mongoose User model API so routes work unchanged.
 * Data is stored in server/data/users.json
 */
const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR  = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'users.json');

if (!fs.existsSync(DATA_DIR))  fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');

function readAll() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch { return []; }
}
function writeAll(users) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), 'utf8');
}
function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function sanitize(u) {
  if (!u) return null;
  const { password, matchPassword, save, ...rest } = u;
  return rest;
}

// Seed default accounts if empty
async function seed() {
  const users = readAll();
  if (users.length > 0) return;

  const defaults = [
    { name: 'Admin User',   email: 'admin@kalvi.com',   password: 'admin123', role: 'admin',   subject: '',           classNum: null },
    { name: 'Teacher User', email: 'teacher@kalvi.com', password: 'teach123', role: 'teacher', subject: 'Mathematics', classNum: 10   },
    { name: 'Student User', email: 'student@kalvi.com', password: 'study123', role: 'student', subject: '',           classNum: 10   },
  ];

  // One shared student account per class (1–12)
  const classLabels = {
    1:'வகுப்பு 1',2:'வகுப்பு 2',3:'வகுப்பு 3',4:'வகுப்பு 4',
    5:'வகுப்பு 5',6:'வகுப்பு 6',7:'வகுப்பு 7',8:'வகுப்பு 8',
    9:'வகுப்பு 9',10:'வகுப்பு 10 (SSLC)',11:'வகுப்பு 11 (Plus One)',12:'வகுப்பு 12 (Plus Two)',
  };
  for (let cls = 1; cls <= 12; cls++) {
    defaults.push({
      name: `${classLabels[cls]} Student`,
      email: `class${cls}@suct.edu`,
      password: `Class@${cls}`,
      role: 'student', subject: '', classNum: cls,
    });
  }

  for (const d of defaults) {
    d.password = await bcrypt.hash(d.password, 10);
    d._id = newId();
    d.isActive = true;
    d.watchedIds = [];
    d.completedSubjects = [];
    d.streakDays = [];
    d.createdAt = new Date().toISOString();
    d.updatedAt = new Date().toISOString();
  }
  writeAll(defaults);
  console.log('✅ Local DB seeded — 3 staff + 12 class student accounts');
}

// ── User model shim ──────────────────────────────────────────────────────────
const User = {

  async findOne(query) {
    const users = readAll();
    const u = users.find(u =>
      Object.entries(query).every(([k, v]) => u[k] === v)
    );
    if (!u) return null;
    u.matchPassword = (plain) => bcrypt.compare(plain, u.password);
    u.save = async function () {
      if (this._modified_password) {
        this.password = await bcrypt.hash(this._modified_password, 10);
        delete this._modified_password;
      }
      const all = readAll();
      const idx = all.findIndex(x => x._id === this._id);
      if (idx !== -1) {
        const toWrite = { ...this };
        delete toWrite.matchPassword;
        delete toWrite.save;
        all[idx] = toWrite;
        writeAll(all);
      }
      return this;
    };
    return u;
  },

  async findById(id) {
    return User.findOne({ _id: id });
  },

  async find(query = {}) {
    let users = readAll();

    if (query.$or) {
      users = users.filter(u =>
        query.$or.some(cond =>
          Object.entries(cond).every(([k, v]) => u[k] === v)
        )
      );
    } else {
      users = users.filter(u =>
        Object.entries(query).every(([k, v]) => {
          if (k.startsWith('$')) return true; // skip mongo operators
          return u[k] === v;
        })
      );
    }

    // Chainable .select() / .sort() / .then()
    const chain = {
      _users: users,
      select() { return this; },
      sort(s) {
        if (s.createdAt === -1) this._users.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (s.name === 1)       this._users.sort((a, b) => a.name.localeCompare(b.name));
        return this;
      },
      then(resolve) { return Promise.resolve(this._users.map(sanitize)).then(resolve); },
      [Symbol.iterator]() { return this._users.map(sanitize)[Symbol.iterator](); },
    };
    return chain;
  },

  async create(data) {
    const users  = readAll();
    const hashed = await bcrypt.hash(data.password, 10);
    const user   = {
      _id:               newId(),
      name:              data.name,
      email:             data.email.toLowerCase().trim(),
      password:          hashed,
      role:              data.role,
      subject:           data.subject || '',
      classNum:          data.classNum || null,
      isActive:          true,
      watchedIds:        [],
      completedSubjects: [],
      streakDays:        [],
      createdAt:         new Date().toISOString(),
      updatedAt:         new Date().toISOString(),
    };
    users.push(user);
    writeAll(users);
    return sanitize(user);
  },

  async findByIdAndUpdate(id, updates, opts = {}) {
    const users = readAll();
    const idx   = users.findIndex(u => u._id === id);
    if (idx === -1) return null;
    Object.assign(users[idx], updates, { updatedAt: new Date().toISOString() });
    writeAll(users);
    return sanitize(users[idx]);
  },

  async findByIdAndDelete(id) {
    const users = readAll();
    const idx   = users.findIndex(u => u._id === id);
    if (idx === -1) return null;
    const [deleted] = users.splice(idx, 1);
    writeAll(users);
    return deleted;
  },

  async deleteMany(query) {
    let users = readAll();
    if (query._id && query._id.$in) {
      users = users.filter(u => !query._id.$in.includes(u._id));
    }
    writeAll(users);
  },

  async updateMany(query, updates) {
    let users = readAll();
    if (query._id && query._id.$in) {
      users = users.map(u =>
        query._id.$in.includes(u._id)
          ? { ...u, ...updates, updatedAt: new Date().toISOString() }
          : u
      );
    }
    writeAll(users);
  },

  async countDocuments(query = {}) {
    const users = readAll();
    return users.filter(u =>
      Object.entries(query).every(([k, v]) => {
        if (k.startsWith('$')) return true;
        return u[k] === v;
      })
    ).length;
  },
};

module.exports = { User, seed };
