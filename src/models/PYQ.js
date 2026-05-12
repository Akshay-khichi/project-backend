const mongoose = require('mongoose');

const pyqSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  semester: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  year: { type: Number, required: true, min: 2000, max: 2100 },
  examType: { 
    type: String, 
    required: true, 
    enum: ['mid-sem', 'end-sem', 'supplementary'] 
  },
  solutions: { type: String }, // Optional URL to solutions PDF
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

// Indexes for fast filtering
pyqSchema.index({ branch: 1, semester: 1, subject: 1, year: -1 });
pyqSchema.index({ examType: 1, year: -1 });
pyqSchema.index({ downloadCount: -1 });
pyqSchema.index({ title: 'text', tags: 'text' });

// Auto-filter soft-deleted documents
pyqSchema.pre('find', function() {
  this.where({ isDeleted: false });
});
pyqSchema.pre('findOne', function() {
  this.where({ isDeleted: false });
});

module.exports = mongoose.model('PYQ', pyqSchema);