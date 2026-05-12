const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth.middleware');
const paymentService = require('../services/payment.service');
const crypto = require('crypto');

// Initiate payment
router.post('/initiate', isAuthenticated, async (req, res) => {
  try {
    const { contentId, contentType } = req.body;
    if (!contentId || !['Note', 'PYQ'].includes(contentType)) {
      return res.status(400).json({ success: false, error: 'Valid contentId and contentType required' });
    }
    const result = await paymentService.initiatePayment(req.user.userId, contentId, contentType);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Payment init error:', err);
    res.status(500).json({ success: false, error: 'Payment initiation failed' });
  }
});

// Verify payment (frontend polls or redirects here)
router.get('/verify', isAuthenticated, async (req, res) => {
  try {
    const { payment_id, pidx } = req.query;
    if (!payment_id || !pidx) return res.status(400).json({ success: false, error: 'Missing params' });
    const result = await paymentService.verifyPayment(payment_id, pidx);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// Webhook for Khalti auto-confirmation
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-khalti-signature'];
    const payload = req.body.toString();
    const expected = crypto.createHmac('sha256', process.env.KHALTI_WEBHOOK_SECRET).update(payload).digest('hex');

    if (signature !== expected) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const data = JSON.parse(payload);
    if (data.status === 'Completed') {
      await paymentService.verifyPayment(data.purchase_order_id, data.pidx);
    }
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;