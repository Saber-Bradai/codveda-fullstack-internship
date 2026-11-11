const router = require('express').Router();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const { HttpError, validate } = require('../utils');
const { authenticate } = require('../middleware/auth');
const { broadcast, notify } = require('../socket');
const schemas = require('../schemas');

const POPULATE = [
  { path: 'assignee', select: 'name color' },
  { path: 'createdBy', select: 'name color' },
];
const STATUS_LABEL = { todo: 'To do', in_progress: 'In progress', done: 'Done' };

router.use(authenticate);

async function assertAssignee(id) {
  if (id && !(await User.exists({ _id: id }))) throw new HttpError(422, 'Validation failed', { assignee: 'User does not exist' });
}

// GET /api/tasks — whole board (lean + projection keeps payload small)
router.get('/', validate(schemas.taskQuery, 'query'), async (req, res) => {
  const { search, assignee, priority } = req.validatedQuery;
  const filter = {};
  if (search) filter.$text = { $search: search };
  if (assignee) filter.assignee = assignee === 'me' ? req.user.id : assignee;
  if (priority) filter.priority = priority;
  const data = await Task.find(filter).sort({ updatedAt: -1 }).limit(500).populate(POPULATE).lean();
  res.json({ data });
});

// GET /api/tasks/stats — counts by status (aggregation)
router.get('/stats', async (req, res) => {
  const rows = await Task.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const mine = await Task.countDocuments({ assignee: new mongoose.Types.ObjectId(req.user.id), status: { $ne: 'done' } });
  res.json({ byStatus: Object.fromEntries(rows.map((r) => [r._id, r.count])), openAssignedToMe: mine });
});

// POST /api/tasks — any member
router.post('/', validate(schemas.taskCreate), async (req, res) => {
  await assertAssignee(req.body.assignee);
  const task = await (await Task.create({ ...req.body, createdBy: req.user.id })).populate(POPULATE);
  broadcast('task:created', task);
  if (task.assignee && task.assignee._id.toString() !== req.user.id) {
    await notify(task.assignee._id, { type: 'task_assigned', text: `${req.user.name} assigned you "${task.title}"`, task: task._id });
  }
  res.status(201).json({ data: task });
});

// PATCH /api/tasks/:id
//   admin / creator → any field
//   assignee        → status only
router.patch('/:id', validate(schemas.taskUpdate), async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new HttpError(404, 'Task not found');

  const isOwner = task.createdBy.toString() === req.user.id;
  const isAssignee = task.assignee?.toString() === req.user.id;
  const isAdmin = req.user.role === 'admin';
  if (!isAdmin && !isOwner) {
    const onlyStatus = Object.keys(req.body).every((k) => k === 'status');
    if (!(isAssignee && onlyStatus)) throw new HttpError(403, 'Only the creator, an admin, or the assignee (status only) can edit this task');
  }
  await assertAssignee(req.body.assignee);

  const prevAssignee = task.assignee?.toString() || null;
  const prevStatus = task.status;
  task.set(req.body);
  await task.save();
  await task.populate(POPULATE);
  broadcast('task:updated', task);

  // User-specific notifications
  const newAssignee = task.assignee?._id.toString() || null;
  const jobs = [];
  if (newAssignee && newAssignee !== prevAssignee && newAssignee !== req.user.id) {
    jobs.push(notify(newAssignee, { type: 'task_assigned', text: `${req.user.name} assigned you "${task.title}"`, task: task._id }));
  }
  if (req.body.status && req.body.status !== prevStatus) {
    const watchers = new Set([task.createdBy._id.toString(), newAssignee].filter(Boolean));
    watchers.delete(req.user.id);
    for (const uid of watchers) {
      jobs.push(notify(uid, { type: 'task_updated', text: `${req.user.name} moved "${task.title}" to ${STATUS_LABEL[task.status]}`, task: task._id }));
    }
  }
  await Promise.all(jobs);
  res.json({ data: task });
});

// DELETE /api/tasks/:id — creator or admin
router.delete('/:id', async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new HttpError(404, 'Task not found');
  if (req.user.role !== 'admin' && task.createdBy.toString() !== req.user.id) {
    throw new HttpError(403, 'Only the creator or an admin can delete this task');
  }
  await task.deleteOne();
  broadcast('task:deleted', { _id: task._id });
  if (task.assignee && task.assignee.toString() !== req.user.id) {
    await notify(task.assignee, { type: 'task_deleted', text: `${req.user.name} deleted "${task.title}"` });
  }
  res.status(204).end();
});

module.exports = router;
