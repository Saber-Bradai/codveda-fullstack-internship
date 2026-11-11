const mongoose = require('mongoose');
const env = require('./env');

let memoryServer;

// Safe summary of a connection string for logs — never prints the password.
function describeUri(uri) {
  const m = uri.trim().match(/^(mongodb(?:\+srv)?):\/\/([^:@/]*)(?::([^@]*))?@([^/?]+)(\/[^?]*)?(\?.*)?$/);
  if (!m) return `unrecognized format (starts with "${uri.trim().slice(0, 14)}")`;
  const [, scheme, user, pw = '', host, db = '/', query = ''] = m;
  const notes = [];
  if (/[<>]/.test(pw)) notes.push('password contains < or > — remove the angle brackets');
  if (/^(password|yourpassword|<password>)$/i.test(pw)) notes.push('password is still the placeholder');
  if (/[^A-Za-z0-9%._~-]/.test(pw)) notes.push('password has special characters that must be URL-encoded');
  if (uri !== uri.trim()) notes.push('value has leading/trailing whitespace');
  return `${scheme}://${user}:<${pw.length} chars>@${host}${db}${query ? ' (with options)' : ''}${notes.length ? ' — ' + notes.join('; ') : ''}`;
}

async function connectDB(uri = env.mongoUri) {
  if (!uri) {
    if (env.isProd) throw new Error('MONGO_URI must be set in production');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    uri = memoryServer.getUri('taskflow');
    console.log('[db] MONGO_URI not set → using in-memory MongoDB (data resets on restart)');
  }
  mongoose.set('strictQuery', true);
  if (!memoryServer) console.log(`[db] connecting to ${describeUri(uri)}`);
  await mongoose.connect(uri.trim(), { maxPoolSize: 10 });
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  console.log(`[db] connected to ${mongoose.connection.name}`);
  return { inMemory: Boolean(memoryServer) };
}

async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) await memoryServer.stop();
}

module.exports = { connectDB, disconnectDB, describeUri };
