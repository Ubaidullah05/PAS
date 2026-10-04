const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema(
  {
    office: { type: mongoose.Schema.Types.ObjectId, ref: 'Office', required: true, index: true },
    date: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'] },
    time: { type: String, required: true, match: [/^\d{2}:\d{2}$/, 'Time must be in HH:MM format'] },
    capacity: { type: Number, default: 10, min: 1, max: 200 },
    bookedCount: { type: Number, default: 0, min: 0 },
    closed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

slotSchema.index({ office: 1, date: 1, time: 1 }, { unique: true });

slotSchema.virtual('seatsLeft').get(function seatsLeft() {
  return Math.max(0, this.capacity - this.bookedCount);
});

slotSchema.set('toJSON', { virtuals: true });
slotSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AppointmentSlot', slotSchema);
