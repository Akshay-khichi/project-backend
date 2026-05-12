const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  fileUrl: { type: String, required: true },
  filePublicId: { type: String, required: true },
  fileSize: { type: Number },
  downloadCount: { type: Number, default: 0 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
premiumPrice: { type: Number, min: 0 }, // in NPR
  tags: [{ type: String, trim: true }]
}, { timestamps: true });

noteSchema.index({ branch: 1, semester: 1, subject: 1 });
noteSchema.index({ downloadCount: -1 });
noteSchema.index({ createdAt: -1 });
noteSchema.index({ title: 'text', tags: 'text' });

noteSchema.pre('find', function() {
  this.where({ isDeleted: false });
});
noteSchema.pre('findOne', function() {
  this.where({ isDeleted: false });
});

module.exports = mongoose.model('Note', noteSchema);