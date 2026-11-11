const http = require('node:http');
const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');
const { initSocket } = require('./socket');
const seed = require('./seed');

async function start() {
  const { inMemory } = await connectDB();
  if (inMemory || process.env.SEED === 'true') await seed();

  const server = http.createServer(app);
  initSocket(server);
  server.listen(env.port, () => console.log(`TaskFlow server running at http://localhost:${env.port}`));

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
