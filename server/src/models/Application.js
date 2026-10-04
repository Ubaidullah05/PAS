const mongoose = require('mongoose');
const { STATUS } = require('../utils/status');

const historySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    action: { type: String, required: true },
    remark: { type: String, trim: true, maxlength: 500 },
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    byRole: { type: String },
    at: { type: Date, default: Date.now }
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    refNo: { type: String, unique: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    serviceType: {
      type: String,
      enum: ['fresh', 'renewal', 'lost', 'damaged'],
      default: 'fresh'
    },
    category: { type: String, enum: ['normal', 'tatkal'], default: 'normal' },
    personal: {
      firstName: { type: String, trim: true },
      lastName: { type: String, trim: true },
      dob: { type: String },
      gender: { type: String, enum: ['male', 'female', 'other'] },
      maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'], default: 'single' },
      placeOfBirth: { type: String, trim: true },
      nationality: { type: String, default: 'Indian', trim: true }
    },
    contact: {
      email: { type: String, trim: true, lowercase: true },
      phone: { type: String, trim: true },
      addressLine: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      pincode: { type: String, trim: true, match: [/^[0-9]{6}$/, 'Pincode must be 6 digits'] }
    },
    family: {
      fatherName: { type: String, trim: true },
      motherName: { type: String, trim: true },
      spouseName: { type: String, trim: true }
    },
    previousPassport: {
      number: { type: String, trim: true },
      issueDate: { type: String, trim: true },
      expiryDate: { type: String, trim: true },
      fileNumber: { type: String, trim: true }
    },
    declarations: {
      criminalCase: { type: Boolean, default: false },
      passportDenied: { type: Boolean, default: false },
      citizenshipOther: { type: Boolean, default: false },
      agreesToTerms: { type: Boolean, default: false }
    },
    office: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', index: true },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.DRAFT, index: true },
    statusHistory: { type: [historySchema], default: [] },
    assignedVerifier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedOfficer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    verification: {
      remark: { type: String, trim: true, maxlength: 500 },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date }
    },
    approval: {
      remark: { type: String, trim: true, maxlength: 500 },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      at: { type: Date },
      passportNumber: { type: String, trim: true }
    },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    holdReason: { type: String, trim: true, maxlength: 500 },
    holdReturnTo: { type: String },
    submittedAt: { type: Date },
    issuedAt: { type: Date }
  },
  { timestamps: true }
);

applicationSchema.index({ applicant: 1, status: 1 });
applicationSchema.index({ status: 1, createdAt: -1 });

applicationSchema.pre('save', async function assignRefNo(next) {
  if (this.refNo) return next();
  const year = new Date().getFullYear();
  const count = await this.constructor.countDocuments({});
  this.refNo = `PAS-${year}-${String(count + 1).padStart(6, '0')}`;
  next();
});

applicationSchema.methods.isEditableByOwner = function isEditableByOwner() {
  return this.status === STATUS.DRAFT;
};

module.exports = mongoose.model('Application', applicationSchema);
