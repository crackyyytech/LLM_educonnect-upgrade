/**
 * seedStudents.js
 * Creates one student account per class (1–12) with simple credentials.
 * Run: node seedStudents.js
 *
 * Credentials format:
 *   Email:    class1@suct.edu  →  class12@suct.edu
 *   Password: Class@1  →  Class@12
 */

require('dotenv').config();
const fs     = require('fs');
const path   = require('path');
const bcrypt = require('bcryptjs');

const DATA_FILE = path.join(__dirname, 'data', 'users.json');

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

const CLASS_NAMES = {
  1: 'வகுப்பு 1', 2: 'வகுப்பு 2', 3: 'வகுப்பு 3',
  4: 'வகுப்பு 4', 5: 'வகுப்பு 5', 6: 'வகுப்பு 6',
  7: 'வகுப்பு 7', 8: 'வகுப்பு 8', 9: 'வகுப்பு 9',
  10: 'வகுப்பு 10 (SSLC)', 11: 'வகுப்பு 11 (Plus One)', 12: 'வகுப்பு 12 (Plus Two)',
};

async function main() {
  const users = readAll();
  let added = 0, skipped = 0;

  for (let cls = 1; cls <= 12; cls++) {
    const email    = `class${cls}@suct.edu`;
    const password = `Class@${cls}`;
    const name     = `${CLASS_NAMES[cls]} Student`;

    // Skip if already exists
    if (users.find(u => u.email === email)) {
      console.log(`⏭  Skipped  class${cls}@suct.edu (already exists)`);
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(password, 10);
    users.push({
      _id:               newId(),
      name,
      email,
      password:          hashed,
      role:              'student',
      subject:           '',
      classNum:          cls,
      isActive:          true,
      watchedIds:        [],
      completedSubjects: [],
      streakDays:        [],
      createdAt:         new Date().toISOString(),
      updatedAt:         new Date().toISOString(),
    });

    console.log(`✅ Created  ${email}  /  ${password}  (Class ${cls})`);
    added++;
  }

  writeAll(users);
  console.log(`\n📋 Done — ${added} created, ${skipped} skipped`);
  console.log('\n┌─────────────────────────────────────────────────────┐');
  console.log('│  CLASS STUDENT CREDENTIALS                          │');
  console.log('├──────────┬──────────────────────┬───────────────────┤');
  console.log('│  Class   │  Email               │  Password         │');
  console.log('├──────────┼──────────────────────┼───────────────────┤');
  for (let cls = 1; cls <= 12; cls++) {
    const email = `class${cls}@suct.edu`.padEnd(20);
    const pw    = `Class@${cls}`.padEnd(17);
    const c     = `Class ${cls}`.padEnd(8);
    console.log(`│  ${c}  │  ${email}  │  ${pw}  │`);
  }
  console.log('└──────────┴──────────────────────┴───────────────────┘');
}

main().catch(console.error);
