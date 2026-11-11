const User = require('./models/User');
const Task = require('./models/Task');
const Message = require('./models/Message');
const env = require('./config/env');

// The fallback demo passwords are published in .env.example, so a public deployment
// must never use them. In production, ADMIN_PASSWORD and DEMO_PASSWORD are required.
function demoAccounts() {
  const accounts = [
    { key: 'ADMIN_PASSWORD', name: 'Ada Admin', email: env.adminEmail, password: env.adminPassword, role: 'admin', color: '#8b5cf6' },
    { key: 'DEMO_PASSWORD', name: 'Max Member', email: env.demoEmail, password: env.demoPassword, role: 'member', color: '#10b981' },
  ];
  if (env.isProd) {
    const missing = accounts.filter((a) => !process.env[a.key]).map((a) => a.key);
    if (missing.length) {
      console.warn(`[seed] skipped: set ${missing.join(' and ')} to private values to create the demo accounts in production`);
      return null;
    }
  }
  return accounts;
}

async function seed() {
  const accounts = demoAccounts();
  if (!accounts) return;

  const existing = await User.findOne({ email: env.adminEmail }).select('+password');
  if (existing) {
    // Already seeded: keep each demo account's password in sync with the environment,
    // so changing ADMIN_PASSWORD / DEMO_PASSWORD on the host and redeploying rotates it.
    for (const a of accounts) {
      const user = a.email === existing.email ? existing : await User.findOne({ email: a.email }).select('+password');
      if (user && !(await user.comparePassword(a.password))) {
        user.password = a.password;
        await user.save();
        console.log(`[seed] updated the password of ${a.email}`);
      }
    }
    return;
  }

  const [admin, member] = await User.create(accounts.map(({ key, ...a }) => a));
  await Task.create([
    { title: 'Design the landing page', description: 'Hero, features, pricing sections', status: 'in_progress', priority: 'high', assignee: member._id, createdBy: admin._id },
    { title: 'Set up CI pipeline', description: 'Lint + tests on every push', status: 'todo', priority: 'medium', assignee: admin._id, createdBy: admin._id },
    { title: 'Write API documentation', status: 'todo', priority: 'low', createdBy: member._id },
    { title: 'Configure MongoDB indexes', status: 'done', priority: 'medium', assignee: member._id, createdBy: admin._id },
  ]);
  await Message.create({ from: admin._id, text: 'Welcome to TaskFlow! 👋 Drag tasks between columns and chat here in real time.' });
  console.log('[seed] demo users, tasks and a welcome message created');
}

module.exports = seed;
