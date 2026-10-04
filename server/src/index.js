const { createApp } = require('./app');
const { env, assertEnv } = require('./config/env');
const { connectDB } = require('./config/db');

async function main() {
  assertEnv();
  await connectDB();

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`\n  Passport Automation System API`);
    console.log(`  Environment : ${env.nodeEnv}`);
    console.log(`  Listening   : http://localhost:${env.port}\n`);
  });

  const shutdown = (signal) => async () => {
    console.log(`\n${signal} received, shutting down...`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown('SIGINT'));
  process.on('SIGTERM', shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('Failed to start the server:', err);
  process.exit(1);
});
