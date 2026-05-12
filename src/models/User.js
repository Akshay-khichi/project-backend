const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true, select: false },
  avatar: { type: String },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId }],
  recentViewed: [{
    contentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    type: { type: String, enum: ['note', 'pyq'], required: true },
    viewedAt: { type: Date, default: Date.now }
  }],
  isActive: { type: Boolean, default: true },
  // Inside userSchema definition:
isPremium: { type: Boolean, default: false },
premiumExpiry: { type: Date },
purchasedContent: [{
  contentId: { type: mongoose.Schema.Types.ObjectId },
  contentType: { type: String, enum: ['Note', 'PYQ'] },
  purchasedAt: { type: Date, default: Date.now }
}]
}, { timestamps: true });

userSchema.set('toJSON', {
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.googleId;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);