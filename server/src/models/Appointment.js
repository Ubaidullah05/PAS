const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    refNo: { type: String, unique: true, index: true },
    applicant: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    office: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentSlot', required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    purpose: { type: String, enum: ['submission', 'verification', 'collection'], default: 'verification' },
    status: { type: String, enum: ['booked', 'cancelled', 'completed', 'missed'], default: 'booked', index: true },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: { type: String, trim: true, maxlength: 300 }
  },
  { timestamps: true }
);

appointmentSchema.pre('save', async function assignRefNo(next) {
  if (this.refNo) return next();
  const year = new Date().getFullYear();
  const count = await this.constructor.countDocuments({});
  this.refNo = `APT-${year}-${String(count + 1).padStart(6, '0')}`;
  next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);
