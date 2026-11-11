const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['task_assigned', 'task_updated', 'task_deleted', 'direct_message'], required: true },
    text: { type: String, required: true, maxlength: 300 },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
// Auto-delete notifications after 30 days (TTL index)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

notificationSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Notification', notificationSchema);
