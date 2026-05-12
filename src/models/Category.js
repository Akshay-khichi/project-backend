const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },

  type: {
    type: String,
    enum: ['branch', 'semester', 'subject', 'unit'],
    required: true
  },

  slug: {
    type: String,
    required: true,
    unique: true
  },

  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },

  order: {
    type: Number,
    default: 0
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true
});

module.exports = mongoose.model('Category', categorySchema);