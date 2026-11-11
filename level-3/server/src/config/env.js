const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production');

module.exports = {
  isProd,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-do-not-use-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // On Render the app's own public URL is provided as RENDER_EXTERNAL_URL
  clientOrigin: (process.env.CLIENT_ORIGIN || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
  adminEmail: process.env.ADMIN_EMAIL || 'admin@codveda.test',
  adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
  demoEmail: process.env.DEMO_EMAIL || 'member@codveda.test',
  demoPassword: process.env.DEMO_PASSWORD || 'Member@12345',
};
