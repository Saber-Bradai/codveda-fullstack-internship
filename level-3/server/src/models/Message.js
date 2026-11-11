const mongoose = require('mongoose');

// Team chat message. `to` = null → general channel, otherwise a direct message.
const messageSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    text: { type: String, required: true, trim: true, minlength: 1, maxlength: 1000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// History pagination (cursor on createdAt) for the channel and for DMs
messageSchema.index({ to: 1, createdAt: -1 });
messageSchema.index({ from: 1, to: 1, createdAt: -1 });

messageSchema.set('toJSON', { versionKey: false });

module.exports = mongoose.model('Message', messageSchema);
