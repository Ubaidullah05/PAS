const mongoose = require('mongoose');
const { env } = require('./env');

async function connectDB(uri = env.mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: env.nodeEnv !== 'production' });
  if (env.nodeEnv !== 'test') {
    console.log(`  Database   : connected to ${mongoose.connection.name}`);
  }
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
