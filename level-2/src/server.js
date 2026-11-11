const app = require('./app'); // loads models first so indexes can be synced on connect
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const seed = require('./seed');

async function start() {
  const { inMemory } = await connectDB();
  if (inMemory) await seed(); // in-memory DB starts empty → seed demo data
  const server = app.listen(env.port, () => console.log(`Level 2 API running at http://localhost:${env.port}`));

  const shutdown = async () => {
    server.close();
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
