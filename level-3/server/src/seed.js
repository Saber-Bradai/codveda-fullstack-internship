const User = require('./models/User');
const Task = require('./models/Task');
const Message = require('./models/Message');
const env = require('./config/env');

async function seed() {
  if (await User.exists({ email: env.adminEmail })) return;
  const [admin, member] = await User.create([
    { name: 'Ada Admin', email: env.adminEmail, password: env.adminPassword, role: 'admin', color: '#8b5cf6' },
    { name: 'Max Member', email: env.demoEmail, password: env.demoPassword, role: 'member', color: '#10b981' },
  ]);
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
