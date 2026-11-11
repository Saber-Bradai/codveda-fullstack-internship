const mongoose = require('mongoose');
const env = require('./env');

let memoryServer;

// Connects to MONGO_URI, or spins up an in-memory MongoDB for local development/tests.
async function connectDB(uri = env.mongoUri) {
  if (!uri) {
    if (env.isProd) throw new Error('MONGO_URI must be set in production');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('codveda_level2');
    console.log('[db] MONGO_URI not set → using in-memory MongoDB (data resets on restart)');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true, maxPoolSize: 10 });
  // Make sure all declared indexes exist before serving traffic.
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  console.log(`[db] connected to ${mongoose.connection.name}`);
  return { inMemory: Boolean(memoryServer) };
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connectDB, disconnectDB };
