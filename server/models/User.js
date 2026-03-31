const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  role:     { type: String, enum: ['admin', 'teacher', 'student'], required: true },
  // teacher/student extras
  subject:  { type: String, default: '' },   // teacher's subject
  classNum: { type: Number, default: null },  // student's class
  // progress stored per user (mirrors localStorage but server-side)
  watchedIds:        { type: [String], default: [] },
  completedSubjects: { type: [String], default: [] },
  streakDays:        { type: [String], default: [] },
  // admin flag
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Never send password in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
