process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const request = require('supertest');

const { createApp } = require('../src/app');
const User = require('../src/models/User');
const Office = require('../src/models/Office');
const Slot = require('../src/models/AppointmentSlot');
const { signToken } = require('../src/utils/jwt');
const { ROLES } = require('../src/config/rbac');

let mongod;
let counter = 0;

async function startDb() {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('pas-test'));
}

async function stopDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
}

function api() {
  return request(createApp());
}

async function makeUser(role = ROLES.APPLICANT, extra = {}) {
  counter += 1;
  const user = await User.create({
    name: extra.name || `Test ${role} ${counter}`,
    email: extra.email || `${role}${counter}@example.com`,
    password: extra.password || 'Secret@123',
    phone: '9876543210',
    role,
    ...extra
  });
  const token = signToken(user);
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

async function makeOffice(extra = {}) {
  counter += 1;
  return Office.create({
    code: extra.code || `PSK-T${counter}`,
    name: 'Passport Seva Kendra - Test City',
    city: 'Test City',
    state: 'Test State',
    address: '12, Test Road, Test City - 560001',
    ...extra
  });
}

function futureDate(daysAhead = 3) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return date.toISOString().slice(0, 10);
}

async function makeSlot(office, overrides = {}) {
  counter += 1;
  return Slot.create({
    office: office._id,
    date: overrides.date || futureDate(),
    time: overrides.time || `1${String(counter % 10).padStart(2, '0')}:00`,
    capacity: overrides.capacity || 2,
    ...overrides
  });
}

const validApplicationBody = (user) => ({
  personal: {
    firstName: 'Asha',
    lastName: 'Patel',
    dob: '1995-04-12',
    gender: 'female',
    maritalStatus: 'single',
    placeOfBirth: 'Test City',
    nationality: 'Indian'
  },
  contact: {
    email: user.email,
    phone: '9876543210',
    addressLine: '22, MG Road',
    city: 'Test City',
    state: 'Karnataka',
    pincode: '560001'
  },
  family: { fatherName: 'Ramesh Patel', motherName: 'Sunita Patel' },
  declarations: { agreesToTerms: true, criminalCase: false }
});

module.exports = { startDb, stopDb, api, makeUser, makeOffice, makeSlot, futureDate, validApplicationBody, ROLES };
