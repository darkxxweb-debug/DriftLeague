const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    hostUsername: { type: String, required: true },
    status: {
      type: String,
      enum: ['waiting', 'racing', 'finished'],
      default: 'waiting',
    },
    maxPlayers: { type: Number, default: 6 },
  },
  { timestamps: true }
);

// Rooms auto-expire 6 hours after creation if never cleaned up
roomSchema.index({ createdAt: 1 }, { expireAfterSeconds: 6 * 60 * 60 });

module.exports = mongoose.model('Room', roomSchema);
