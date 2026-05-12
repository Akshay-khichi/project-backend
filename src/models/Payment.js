const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  contentId: { type: mongoose.Schema.Types.ObjectId, refPath: 'contentType', required: true },
  contentType: { type: String, enum: ['Note', 'PYQ'], required: true },
  gateway: { type: String, enum: ['khalti', 'esewa'], default: 'khalti' },
  amount: { type: Number, required: true }, // in NPR
  currency: { type: String, default: 'NPR' },
  transactionId: { type: String, unique: true },
  status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
  metadata: { type: Object, default: {} },
}, { timestamps: true });

paymentSchema.index({ userId: 1, status: 1 });
// paymentSchema.index({ transactionId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);