// Tiny JSON-file data store so products survive server restarts.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'products.json');

const seed = [
  { name: 'Wireless Mouse', price: 19.99, category: 'Accessories', stock: 42, description: 'Ergonomic 2.4GHz mouse.' },
  { name: 'Mechanical Keyboard', price: 79.5, category: 'Accessories', stock: 15, description: 'Hot-swappable switches, RGB.' },
  { name: '27" Monitor', price: 229, category: 'Displays', stock: 7, description: '1440p IPS, 144Hz.' },
];

function load() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    const now = new Date().toISOString();
    const initial = seed.map((p) => ({ id: crypto.randomUUID(), ...p, createdAt: now, updatedAt: now }));
    save(initial);
    return initial;
  }
}

function save(items) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2));
}

let products = load();

module.exports = {
  all: () => products,
  find: (id) => products.find((p) => p.id === id),
  create(data) {
    const now = new Date().toISOString();
    const product = { id: crypto.randomUUID(), ...data, createdAt: now, updatedAt: now };
    products.push(product);
    save(products);
    return product;
  },
  update(id, data) {
    const product = products.find((p) => p.id === id);
    if (!product) return null;
    Object.assign(product, data, { updatedAt: new Date().toISOString() });
    save(products);
    return product;
  },
  remove(id) {
    const before = products.length;
    products = products.filter((p) => p.id !== id);
    if (products.length === before) return false;
    save(products);
    return true;
  },
};
