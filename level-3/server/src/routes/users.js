const router = require('express').Router();
const User = require('../models/User');
const Task = require('../models/Task');
const { HttpError, validate } = require('../utils');
const { authenticate, authorize } = require('../middleware/auth');
const { kick, broadcast } = require('../socket');
const schemas = require('../schemas');

router.use(authenticate);

// Team directory (for assignee picker / DMs) — any member
router.get('/', async (_req, res) => {
  const data = await User.find().select('name email role color createdAt').sort({ name: 1 }).lean();
  res.json({ data });
});

// Admin: change role
router.patch('/:id/role', authorize('admin'), validate(schemas.role), async (req, res) => {
  if (req.params.id === req.user.id) throw new HttpError(400, 'You cannot change your own role');
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { returnDocument: 'after', runValidators: true });
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ data: user });
});

// Admin: delete user → unassign their tasks, disconnect their sockets
router.delete('/:id', authorize('admin'), async (req, res) => {
  if (req.params.id === req.user.id) throw new HttpError(400, 'You cannot delete yourself');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new HttpError(404, 'User not found');
  await Task.updateMany({ assignee: user._id }, { assignee: null });
  kick(user._id.toString());
  broadcast('tasks:refresh', {});
  res.status(204).end();
});

module.exports = router;
