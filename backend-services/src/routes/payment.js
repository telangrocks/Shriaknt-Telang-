const express = require('express');
const router = express.Router();
const { verifyToken, requireSubscription } = require('../middleware/auth');
const { createPool } = require('../database/pool');
const logger = require('../utils/logger');
const crypto = require('crypto');
const axios = require('axios');

// Generate order ID
function generateOrderId() {
  return `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Create payment order
router.post('/create-order', verifyToken, async (req, res) => {
  try {
    const pool = createPool();
    const monthlyPrice = parseFloat(process.env.MONTHLY_PRICE) || 999;
    const currency = process.env.CURRENCY || 'INR';

    // Check if user already has active subscription
    const userResult = await pool.query(`
      SELECT subscription_status, subscription_end_date
      FROM users
      WHERE id = $1
    `, [req.userId]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];
    if (user.subscription_status === 'active' && user.subscription_end_date > new Date()) {
      return res.status(400).json({
        error: 'Active subscription exists',
        message: 'You already have an active subscription'
      });
    }

    // Create order
    const orderId = generateOrderId();
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Calculate subscription dates
    const subscriptionStartDate = new Date();
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

    // Create payment record
    await pool.query(`
      INSERT INTO payments (
        user_id, payment_id, order_id, amount, currency, status
      ) VALUES ($1, $2, $3, $4, $5, 'pending')
    `, [req.userId, paymentId, orderId, monthlyPrice, currency]);

    // Create Cashfree order
    const cashfreeResponse = await axios.post(
      `https://${process.env.CASHFREE_ENV === 'production' ? 'api' : 'test'}.cashfree.com/pg/orders`,
      {
        order_id: orderId,
        order_amount: monthlyPrice,
        order_currency: currency,
        order_note: 'Cryptopulse Monthly Subscription',
        customer_details: {
          customer_id: req.userId.toString(),
          customer_email: req.userEmail
        },
        order_meta: {
          return_url: `${process.env.API_BASE_URL}/api/payment/callback?order_id=${orderId}`,
          notify_url: `${process.env.API_BASE_URL}/api/payment/webhook`
        }
      },
      {
        headers: {
          'x-client-id': process.env.CASHFREE_APP_ID,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY,
          'x-api-version': '2022-09-01',
          'Content-Type': 'application/json'
        }
      }
    );

    // Update payment record with Cashfree order ID
    await pool.query(`
      UPDATE payments
      SET cashfree_order_id = $1
      WHERE order_id = $2
    `, [cashfreeResponse.data.order_id, orderId]);

    res.json({
      success: true,
      payment_session_id: cashfreeResponse.data.payment_session_id,
      order_id: orderId,
      payment_id: paymentId,
      amount: monthlyPrice,
      currency: currency
    });
  } catch (error) {
    logger.error('Error creating payment order:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create payment order'
    });
  }
});

// Payment webhook
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'];
    const payload = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.CASHFREE_WEBHOOK_SECRET)
      .update(payload)
      .digest('base64');

    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature');
      return res.status(401).json({
        error: 'Invalid signature'
      });
    }

    const { orderId, orderStatus, paymentStatus, paymentMessage } = req.body;

    const pool = createPool();

    // Update payment record
    await pool.query(`
      UPDATE payments
      SET status = $1,
          cashfree_payment_id = $2,
          updated_at = NOW()
      WHERE order_id = $3
    `, [paymentStatus, req.body.paymentId || null, orderId]);

    // If payment successful, activate subscription
    if (paymentStatus === 'SUCCESS' && orderStatus === 'PAID') {
      const paymentResult = await pool.query(`
        SELECT user_id, amount
        FROM payments
        WHERE order_id = $1
      `, [orderId]);

      if (paymentResult.rows.length > 0) {
        const { user_id } = paymentResult.rows[0];
        const subscriptionStartDate = new Date();
        const subscriptionEndDate = new Date();
        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

        // Update user subscription
        await pool.query(`
          UPDATE users
          SET subscription_status = 'active',
              subscription_start_date = $1,
              subscription_end_date = $2,
              is_active = true,
              updated_at = NOW()
          WHERE id = $3
        `, [subscriptionStartDate, subscriptionEndDate, user_id]);

        // Update payment record with subscription dates
        await pool.query(`
          UPDATE payments
          SET subscription_start_date = $1,
              subscription_end_date = $2
          WHERE order_id = $3
        `, [subscriptionStartDate, subscriptionEndDate, orderId]);

        logger.info(`Subscription activated for user ${user_id}`);
      }
    }

    res.json({
      success: true,
      message: 'Webhook processed'
    });
  } catch (error) {
    logger.error('Error processing webhook:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process webhook'
    });
  }
});

// Payment callback (for deep linking)
router.get('/callback', async (req, res) => {
  try {
    const { order_id, order_status, payment_status } = req.query;

    if (payment_status === 'SUCCESS') {
      // Redirect to success page
      res.redirect(`cryptopulse://payment/success?order_id=${order_id}`);
    } else {
      // Redirect to failure page
      res.redirect(`cryptopulse://payment/failure?order_id=${order_id}`);
    }
  } catch (error) {
    logger.error('Error processing callback:', error);
    res.redirect(`cryptopulse://payment/failure`);
  }
});

// Get payment history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const pool = createPool();
    const result = await pool.query(`
      SELECT id, payment_id, order_id, amount, currency, status,
             subscription_start_date, subscription_end_date,
             created_at, updated_at
      FROM payments
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, [req.userId]);

    res.json({
      success: true,
      payments: result.rows
    });
  } catch (error) {
    logger.error('Error getting payment history:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get payment history'
    });
  }
});

module.exports = router;

