const router = require('express').Router();
const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const HttpError = require('../utils/HttpError');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const schemas = require('../utils/schemas');

const POPULATE = [
  { path: 'category', select: 'name slug' },
  { path: 'createdBy', select: 'name' },
];

async function loadOwned(req) {
  const product = await Product.findById(req.params.id);
  if (!product) throw new HttpError(404, 'Product not found');
  // Ownership check: only the creator or an admin may modify a product.
  if (product.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
    throw new HttpError(403, 'You can only modify your own products');
  }
  return product;
}

async function assertCategory(id) {
  if (id && !(await Category.exists({ _id: id }))) throw new HttpError(422, 'Validation failed', { category: 'Category does not exist' });
}

// GET /api/products — public, filterable, paginated
router.get('/', validate(schemas.productQuery, 'query'), async (req, res) => {
  const { search, category, minPrice, maxPrice, sort, page, limit } = req.validatedQuery;
  const filter = {};
  if (search) filter.$text = { $search: search }; // uses the text index
  if (category) filter.category = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = minPrice;
    if (maxPrice !== undefined) filter.price.$lte = maxPrice;
  }
  const sortSpec = { [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1, _id: 1 };

  // Optimization: run count + page query in parallel, use lean() (plain objects, no hydration)
  const [total, data] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(sortSpec).skip((page - 1) * limit).limit(limit).populate(POPULATE).lean(),
  ]);
  res.json({ data, page, limit, total, pages: Math.ceil(total / limit) });
});

// GET /api/products/mine — current user's products
router.get('/mine', authenticate, async (req, res) => {
  const data = await Product.find({ createdBy: req.user.id }).sort({ createdAt: -1 }).populate(POPULATE).lean();
  res.json({ count: data.length, data });
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const product = await Product.findById(req.params.id).populate(POPULATE).lean();
  if (!product) throw new HttpError(404, 'Product not found');
  res.json({ data: product });
});

// POST /api/products — any logged-in user
router.post('/', authenticate, validate(schemas.productCreate), async (req, res) => {
  await assertCategory(req.body.category);
  const product = await Product.create({ ...req.body, createdBy: req.user.id });
  res.status(201).json({ data: await product.populate(POPULATE) });
});

// PATCH /api/products/:id — owner or admin
router.patch('/:id', authenticate, validate(schemas.productUpdate), async (req, res) => {
  const product = await loadOwned(req);
  await assertCategory(req.body.category);
  product.set(req.body);
  await product.save();
  res.json({ data: await product.populate(POPULATE) });
});

// DELETE /api/products/:id — owner or admin
router.delete('/:id', authenticate, async (req, res) => {
  const product = await loadOwned(req);
  await Promise.all([product.deleteOne(), Review.deleteMany({ product: product._id })]);
  res.status(204).end();
});

// ---- Reviews (nested resource) --------------------------------------------
router.get('/:id/reviews', async (req, res) => {
  const data = await Review.find({ product: req.params.id }).sort({ createdAt: -1 }).populate('user', 'name').lean();
  res.json({ count: data.length, data });
});

router.post('/:id/reviews', authenticate, validate(schemas.review), async (req, res) => {
  if (!(await Product.exists({ _id: req.params.id }))) throw new HttpError(404, 'Product not found');
  const review = await Review.create({ ...req.body, product: req.params.id, user: req.user.id }); // 409 on duplicate
  res.status(201).json({ data: review });
});

module.exports = router;
