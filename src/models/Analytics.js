const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  event: { type: String, enum: ['download', 'view', 'search', 'login'], required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  contentId: { type: mongoose.Schema.Types.ObjectId },
  meta { type: Object },
  ip: { type: String }
}, { timestamps: true });

analyticsSchema.index({ event: 1, createdAt: -1 });
analyticsSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);