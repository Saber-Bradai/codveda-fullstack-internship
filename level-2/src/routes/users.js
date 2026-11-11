const router = require('express').Router();
const User = require('../models/User');
const Product = require('../models/Product');
const HttpError = require('../utils/HttpError');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const schemas = require('../utils/schemas');

// Every route here is admin-only.
router.use(authenticate, authorize('admin'));

router.get('/', async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean({ virtuals: false });
  res.json({ count: users.length, data: users.map(({ password, __v, ...u }) => u) });
});

router.patch('/:id/role', validate(schemas.roleUpdate), async (req, res) => {
  if (req.params.id === req.user.id) throw new HttpError(400, 'You cannot change your own role');
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { returnDocument: 'after', runValidators: true });
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ data: user });
});

router.delete('/:id', async (req, res) => {
  if (req.params.id === req.user.id) throw new HttpError(400, 'You cannot delete yourself');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  await Product.deleteMany({ createdBy: user._id });
  res.status(204).end();
});

module.exports = router;
