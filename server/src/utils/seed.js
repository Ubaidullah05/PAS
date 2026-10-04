const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Office = require('../models/Office');
const Slot = require('../models/AppointmentSlot');
const { ROLES } = require('../config/rbac');

const OFFICES = [
  {
    code: 'PSK-DL1',
    name: 'Passport Seva Kendra - New Delhi',
    city: 'New Delhi',
    state: 'Delhi',
    address: 'HUDA Ground, Sector 12, New Delhi - 110075',
    phone: '011-25600000'
  },
  {
    code: 'PSK-MU1',
    name: 'Passport Seva Kendra - Mumbai',
    city: 'Mumbai',
    state: 'Maharashtra',
    address: 'Jeevan Bima Marg, Andheri West, Mumbai - 400053',
    phone: '022-26800000'
  },
  {
    code: 'PSK-BL1',
    name: 'Passport Seva Kendra - Bengaluru',
    city: 'Bengaluru',
    state: 'Karnataka',
    address: '80 Feet Road, Koramangala, Bengaluru - 560095',
    phone: '080-25500000'
  },
  {
    code: 'PSK-KO1',
    name: 'Passport Seva Kendra - Kolkata',
    city: 'Kolkata',
    state: 'West Bengal',
    address: 'BBD Bagh, Lal Dighi, Kolkata - 700001',
    phone: '033-22400000'
  }
];

const USERS = [
  {
    name: 'System Administrator',
    email: 'admin@pas.gov.in',
    password: 'Admin@1234',
    phone: '9876500001',
    role: ROLES.ADMIN
  },
  {
    name: 'Rita Sharma',
    email: 'verifier@pas.gov.in',
    password: 'Verify@123',
    phone: '9876500002',
    role: ROLES.VERIFIER
  },
  {
    name: 'Arun Kumar',
    email: 'officer@pas.gov.in',
    password: 'Officer@123',
    phone: '9876500003',
    role: ROLES.OFFICER
  },
  {
    name: 'Demo Applicant',
    email: 'demo@pas.gov.in',
    password: 'Demo@1234',
    phone: '9876500004',
    role: ROLES.APPLICANT
  }
];

const TIMES = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00'];

async function seed() {
  await connectDB();

  for (const data of OFFICES) {
    await Office.findOneAndUpdate({ code: data.code }, { $set: data }, { upsert: true, new: true });
  }
  console.log(`${OFFICES.length} passport offices ready`);

  for (const data of USERS) {
    const exists = await User.findOne({ email: data.email });
    if (exists) continue;
    await User.create(data);
    console.log(`  created ${data.role.padEnd(9)} -> ${data.email} / ${data.password}`);
  }

  const offices = await Office.find({ active: true });
  const start = new Date();
  const docs = [];
  for (let d = 0; d < 14; d += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const iso = date.toISOString().slice(0, 10);
    if (date.getDay() === 0) continue;
    for (const office of offices) {
      for (const time of TIMES) docs.push({ office: office._id, date: iso, time, capacity: 10 });
    }
  }

  await Slot.insertMany(docs, { ordered: false }).catch((err) => {
    if (err.code !== 11000) throw err;
  });
  console.log(`Appointment time slots opened for the next 14 days`);

  await disconnectDB();
  console.log('\nSeed complete.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
