const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ALL_ROLES, ROLES } = require('../config/rbac');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Please enter your full name'], trim: true, minlength: 2, maxlength: 80 },
    email: {
      type: String,
      required: [true, 'Please enter your email address'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Please enter a valid email address']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9+\-\s()]{7,20}$/, 'Please enter a valid phone number']
    },
    password: {
      type: String,
      required: [true, 'Please choose a password'],
      minlength: [8, 'Your password must be at least 8 characters long'],
      select: false
    },
    role: { type: String, enum: ALL_ROLES, default: ROLES.APPLICANT },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' },
    lastLoginAt: { type: Date },
    tokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 10;
  this.password = await bcrypt.hash(this.password, rounds);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone || '',
    role: this.role,
    status: this.status,
    createdAt: this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);
