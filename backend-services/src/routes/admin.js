const express = require('express');
const router = express.Router();
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { createPool } = require('../database/pool');
const logger = require('../utils/logger');

// All admin routes require authentication and admin privileges
router.use(verifyToken);
router.use(requireAdmin);

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    const pool = createPool();

    let query = 'SELECT id, phone, name, email, subscription_status, created_at FROM users';
    const params = [];

    if (status) {
      query += ` WHERE subscription_status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      users: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error getting users:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get users'
    });
  }
});

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const pool = createPool();

    // Get user statistics
    const userStats = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE subscription_status = 'active') as active_subscriptions,
        COUNT(*) FILTER (WHERE subscription_status = 'trial') as trial_users,
        COUNT(*) FILTER (WHERE subscription_status = 'expired') as expired_subscriptions
      FROM users
    `);

    // Get trade statistics
    const tradeStats = await pool.query(`
      SELECT 
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE status = 'open') as open_trades,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_trades,
        COALESCE(SUM(pnl), 0) as total_pnl
      FROM trades
    `);

    // Get payment statistics
    const paymentStats = await pool.query(`
      SELECT 
        COUNT(*) as total_payments,
        COUNT(*) FILTER (WHERE status = 'success') as successful_payments,
        COALESCE(SUM(amount) FILTER (WHERE status = 'success'), 0) as total_revenue
      FROM payments
    `);

    // Get signal statistics
    const signalStats = await pool.query(`
      SELECT 
        COUNT(*) as total_signals,
        COUNT(*) FILTER (WHERE is_active = true) as active_signals,
        COALESCE(AVG(confidence_score), 0) as avg_confidence
      FROM ai_signals
    `);

    res.json({
      success: true,
      stats: {
        users: userStats.rows[0],
        trades: tradeStats.rows[0],
        payments: paymentStats.rows[0],
        signals: signalStats.rows[0]
      }
    });
  } catch (error) {
    logger.error('Error getting admin stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get statistics'
    });
  }
});

// Get all trades
router.get('/trades', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    const pool = createPool();

    let query = `
      SELECT t.*, u.phone
      FROM trades t
      JOIN users u ON t.user_id = u.id
    `;
    const params = [];

    if (status) {
      query += ` WHERE t.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY t.executed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      trades: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error getting trades:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get trades'
    });
  }
});

// Get all payments
router.get('/payments', async (req, res) => {
  try {
    const { limit = 50, offset = 0, status } = req.query;
    const pool = createPool();

    let query = `
      SELECT p.*, u.phone
      FROM payments p
      JOIN users u ON p.user_id = u.id
    `;
    const params = [];

    if (status) {
      query += ` WHERE p.status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      payments: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error getting payments:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get payments'
    });
  }
});

module.exports = router;

