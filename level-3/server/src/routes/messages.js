const router = require('express').Router();
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const { HttpError, validate } = require('../utils');
const { authenticate } = require('../middleware/auth');
const schemas = require('../schemas');

router.use(authenticate);

// GET /api/messages?with=<userId>&before=<date>&limit=30 — cursor-paginated chat history
router.get('/messages', validate(schemas.messageQuery, 'query'), async (req, res) => {
  const { with: other, before, limit } = req.validatedQuery;
  const filter = other
    ? { $or: [{ from: req.user.id, to: other }, { from: other, to: req.user.id }] }
    : { to: null };
  if (before) filter.createdAt = { $lt: before };
  const rows = await Message.find(filter).sort({ createdAt: -1 }).limit(limit + 1).populate('from', 'name color').lean();
  const hasMore = rows.length > limit;
  res.json({ data: rows.slice(0, limit).reverse(), hasMore });
});

// GET /api/notifications — latest 50 + unread count
router.get('/notifications', async (req, res) => {
  const [data, unread] = await Promise.all([
    Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ user: req.user.id, read: false }),
  ]);
  res.json({ data, unread });
});

router.patch('/notifications/read-all', async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  res.json({ ok: true });
});

router.patch('/notifications/:id/read', async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true }, { returnDocument: 'after' });
  if (!n) throw new HttpError(404, 'Notification not found');
  res.json({ data: n });
});

module.exports = router;
