const axios = require('axios');
const Payment = require('../models/Payment');
const Note = require('../models/Note');
const PYQ = require('../models/PYQ');

const KHALTI_API = 'https://khalti.com/api/v2/';

exports.initiatePayment = async (userId, contentId, contentType) => {
  const ContentModel = contentType === 'Note' ? Note : PYQ;
  const content = await ContentModel.findById(contentId);
  
  if (!content || !content.isPremium) {
    throw new Error('Content is not premium');
  }

  const payment = await Payment.create({
    userId,
    contentId,
    contentType,
    gateway: 'khalti',
    amount: content.premiumPrice,
    status: 'pending'
  });

  // Khalti expects amount in paisa (NPR × 100)
  const payload = {
    return_url: `${process.env.PAYMENT_REDIRECT_URL}?payment_id=${payment._id}`,
    website_url: process.env.CLIENT_URL || 'http://localhost:5173',
    amount: content.premiumPrice * 100,
    purchase_order_id: payment._id.toString(),
    purchase_order_name: `EduVault ${contentType} #${contentId}`
  };

  const { data } = await axios.post(`${KHALTI_API}payment/initiate/`, payload, {
    headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` }
  });

  payment.metadata = { khalti_pidx: data.pidx };
  await payment.save();

  return { paymentId: payment._id, checkoutUrl: `https://khalti.com/checkout/?pidx=${data.pidx}` };
};

exports.verifyPayment = async (paymentId, pidx) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error('Payment not found');

  const { data } = await axios.post(`${KHALTI_API}payment/lookup/`, { pidx }, {
    headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` }
  });

  if (data.status === 'Completed') {
    if (payment.status !== 'completed') {
      payment.status = 'completed';
      payment.transactionId = data.transaction_id;
      await payment.save();

      // Optional: Update user's purchasedContent array
      // const User = require('../models/User');
      // await User.findByIdAndUpdate(payment.userId, {
      //   $push: { purchasedContent: { contentId: payment.contentId, contentType: payment.contentType } }
      // });
    }
    return { success: true, payment };
  }
  return { success: false, status: data.status, payment };
};