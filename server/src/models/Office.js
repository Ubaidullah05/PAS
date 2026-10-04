const mongoose = require('mongoose');

const officeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    active: { type: Boolean, default: true },
    openingHour: { type: String, default: '09:30' },
    closingHour: { type: String, default: '17:30' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Office', officeSchema);
