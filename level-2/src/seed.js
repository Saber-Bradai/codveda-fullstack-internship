// Seeds an admin account, categories and sample products. Safe to run multiple times.
const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const env = require('./config/env');

async function seed() {
  let admin = await User.findOne({ email: env.adminEmail });
  if (!admin) {
    admin = await User.create({ name: 'Admin', email: env.adminEmail, password: env.adminPassword, role: 'admin' });
    console.log(`[seed] created admin ${env.adminEmail}`);
  }
  if ((await Category.countDocuments()) === 0) {
    const [acc, disp] = await Category.create([
      { name: 'Accessories', description: 'Mice, keyboards, hubs' },
      { name: 'Displays', description: 'Monitors and screens' },
    ]);
    await Product.create([
      { name: 'Wireless Mouse', price: 19.99, stock: 42, category: acc._id, createdBy: admin._id, description: 'Ergonomic 2.4GHz mouse' },
      { name: 'Mechanical Keyboard', price: 79.5, stock: 15, category: acc._id, createdBy: admin._id, description: 'Hot-swappable switches' },
      { name: '27 inch Monitor', price: 229, stock: 7, category: disp._id, createdBy: admin._id, description: '1440p IPS 144Hz' },
    ]);
    console.log('[seed] created sample categories and products');
  }
}

module.exports = seed;

if (require.main === module) {
  const { connectDB, disconnectDB } = require('./config/db');
  connectDB()
    .then(seed)
    .then(disconnectDB)
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
