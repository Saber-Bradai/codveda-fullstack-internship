const router = require('express').Router();
const Category = require('../models/Category');
const Product = require('../models/Product');
const HttpError = require('../utils/HttpError');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const schemas = require('../utils/schemas');

// Public: list categories with product counts (virtual populate)
router.get('/', async (_req, res) => {
  const data = await Category.find().sort({ name: 1 }).populate('productCount');
  res.json({ count: data.length, data });
});

// Admin only below
router.post('/', authenticate, authorize('admin'), validate(schemas.category), async (req, res) => {
  res.status(201).json({ data: await Category.create(req.body) });
});

router.put('/:id', authenticate, authorize('admin'), validate(schemas.category), async (req, res) => {
  const cat = await Category.findById(req.params.id);
  if (!cat) throw new HttpError(404, 'Category not found');
  cat.set({ ...req.body, slug: undefined }); // regenerate slug from new name
  res.json({ data: await cat.save() });
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  if (await Product.exists({ category: req.params.id })) {
    throw new HttpError(409, 'Category still has products; move or delete them first');
  }
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) throw new HttpError(404, 'Category not found');
  res.status(204).end();
});

module.exports = router;
