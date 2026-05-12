const Note = require('../models/Note');
const PYQ = require('../models/PYQ');
const Payment = require('../models/Payment');

exports.checkPremiumAccess = async (req, res, next) => {
  try {
    const contentId = req.params.id;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ success: false, error: 'Authentication required' });

    // Fetch content to check if it's premium
    let content = await Note.findById(contentId);
    let contentType = 'Note';
    if (!content) {
      content = await PYQ.findById(contentId);
      contentType = 'PYQ';
    }

    if (!content || content.isDeleted) {
      return res.status(404).json({ success: false, error: 'Content not found' });
    }

    // If not premium, allow free access
    if (!content.isPremium) return next();

    // Check if user has purchased this content
    const hasPurchased = await Payment.findOne({
      userId,
      contentId,
      contentType,
      status: 'completed'
    });

    if (!hasPurchased) {
      return res.status(403).json({ 
        success: false, 
        error: 'Premium access required',
        requiresPayment: true,
        contentId,
        contentType,
        price: content.premiumPrice
      });
    }

    next();
  } catch (err) {
    console.error('Premium check error:', err);
    res.status(500).json({ success: false, error: 'Access check failed' });
  }
};