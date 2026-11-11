// Level 1 - Task 2: Simple REST API with Express (CRUD on "products")
const express = require('express');
const cors = require('cors');
const path = require('node:path');
const store = require('./store');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); // Task 3 frontend

// ---- Helpers ---------------------------------------------------------------
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Validates a product payload. `partial` = true for PATCH (only check fields sent).
function validateProduct(body, { partial = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
  const errors = {};
  const out = {};
  const has = (k) => body[k] !== undefined;

  if (!partial || has('name')) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2) errors.name = 'Name is required (min 2 characters)';
    else out.name = body.name.trim();
  }
  if (!partial || has('price')) {
    const price = Number(body.price);
    if (body.price === '' || body.price === null || !Number.isFinite(price) || price < 0) errors.price = 'Price must be a number >= 0';
    else out.price = Math.round(price * 100) / 100;
  }
  if (has('stock')) {
    const stock = Number(body.stock);
    if (!Number.isInteger(stock) || stock < 0) errors.stock = 'Stock must be an integer >= 0';
    else out.stock = stock;
  } else if (!partial) out.stock = 0;
  if (has('category')) out.category = String(body.category).trim() || 'General';
  else if (!partial) out.category = 'General';
  if (has('description')) out.description = String(body.description).trim();
  else if (!partial) out.description = '';

  if (Object.keys(errors).length) throw new HttpError(422, 'Validation failed', errors);
  return out;
}

function getOr404(id) {
  const product = store.find(id);
  if (!product) throw new HttpError(404, `Product ${id} not found`);
  return product;
}

// ---- Routes ----------------------------------------------------------------
const router = express.Router();

// READ all (supports ?search=, ?category=, ?sort=price|-price|name)
router.get('/', (req, res) => {
  let items = [...store.all()];
  const { search, category, sort } = req.query;
  if (search) {
    const q = String(search).toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  }
  if (category) items = items.filter((p) => p.category.toLowerCase() === String(category).toLowerCase());
  if (sort) {
    const desc = sort.startsWith('-');
    const key = desc ? sort.slice(1) : sort;
    if (['price', 'name', 'stock', 'createdAt'].includes(key)) {
      items.sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (desc ? -1 : 1));
    }
  }
  res.json({ count: items.length, data: items });
});

// READ one
router.get('/:id', (req, res) => res.json({ data: getOr404(req.params.id) }));

// CREATE
router.post('/', (req, res) => {
  const product = store.create(validateProduct(req.body));
  res.status(201).location(`/api/products/${product.id}`).json({ data: product });
});

// UPDATE (full replace)
router.put('/:id', (req, res) => {
  getOr404(req.params.id);
  res.json({ data: store.update(req.params.id, validateProduct(req.body)) });
});

// UPDATE (partial)
router.patch('/:id', (req, res) => {
  getOr404(req.params.id);
  res.json({ data: store.update(req.params.id, validateProduct(req.body, { partial: true })) });
});

// DELETE
router.delete('/:id', (req, res) => {
  getOr404(req.params.id);
  store.remove(req.params.id);
  res.status(204).end();
});

app.use('/api/products', router);
app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ---- Error handling --------------------------------------------------------
app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body' });
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message, ...(err.details && { details: err.details }) });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => console.log(`Level 1 API running at http://localhost:${PORT}`));
}

module.exports = app;
