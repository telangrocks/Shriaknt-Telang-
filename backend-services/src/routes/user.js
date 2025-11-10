const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { createPool } = require('../database/pool');
const logger = require('../utils/logger');

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    const pool = createPool();

    await pool.query(`
      UPDATE users
      SET name = COALESCE($1, name),
          email = COALESCE($2, email),
          updated_at = NOW()
      WHERE id = $3
    `, [name, email, req.userId]);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    logger.error('Error updating profile:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update profile'
    });
  }
});

// Get user pairs
router.get('/pairs', verifyToken, async (req, res) => {
  try {
    const pool = createPool();
    const result = await pool.query(`
      SELECT id, exchange_name, trading_pair, is_active, created_at
      FROM user_pairs
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.userId]);

    res.json({
      success: true,
      pairs: result.rows
    });
  } catch (error) {
    logger.error('Error getting user pairs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user pairs'
    });
  }
});

// Add trading pair
router.post('/pairs', verifyToken, async (req, res) => {
  try {
    const { exchange_name, trading_pair } = req.body;

    if (!exchange_name || !trading_pair) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Exchange name and trading pair are required'
      });
    }

    const pool = createPool();
    await pool.query(`
      INSERT INTO user_pairs (user_id, exchange_name, trading_pair)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, exchange_name, trading_pair) DO NOTHING
    `, [req.userId, exchange_name, trading_pair]);

    res.json({
      success: true,
      message: 'Trading pair added successfully'
    });
  } catch (error) {
    logger.error('Error adding trading pair:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add trading pair'
    });
  }
});

// Remove trading pair
router.delete('/pairs/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = createPool();

    await pool.query(`
      DELETE FROM user_pairs
      WHERE id = $1 AND user_id = $2
    `, [id, req.userId]);

    res.json({
      success: true,
      message: 'Trading pair removed successfully'
    });
  } catch (error) {
    logger.error('Error removing trading pair:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove trading pair'
    });
  }
});

// Get user strategies
router.get('/strategies', verifyToken, async (req, res) => {
  try {
    const pool = createPool();
    const result = await pool.query(`
      SELECT us.id, us.strategy_id, us.is_active, us.parameters,
             s.name, s.description, s.type, s.category
      FROM user_strategies us
      JOIN strategies s ON us.strategy_id = s.id
      WHERE us.user_id = $1
      ORDER BY us.created_at DESC
    `, [req.userId]);

    res.json({
      success: true,
      strategies: result.rows
    });
  } catch (error) {
    logger.error('Error getting user strategies:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user strategies'
    });
  }
});

// Add user strategy
router.post('/strategies', verifyToken, async (req, res) => {
  try {
    const { strategy_id, parameters } = req.body;

    if (!strategy_id) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Strategy ID is required'
      });
    }

    const pool = createPool();
    await pool.query(`
      INSERT INTO user_strategies (user_id, strategy_id, parameters)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, strategy_id)
      DO UPDATE SET parameters = $3, is_active = true
    `, [req.userId, strategy_id, parameters ? JSON.stringify(parameters) : null]);

    res.json({
      success: true,
      message: 'Strategy added successfully'
    });
  } catch (error) {
    logger.error('Error adding strategy:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add strategy'
    });
  }
});

// Toggle strategy
router.put('/strategies/:id/toggle', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = createPool();

    await pool.query(`
      UPDATE user_strategies
      SET is_active = NOT is_active
      WHERE id = $1 AND user_id = $2
    `, [id, req.userId]);

    res.json({
      success: true,
      message: 'Strategy toggled successfully'
    });
  } catch (error) {
    logger.error('Error toggling strategy:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to toggle strategy'
    });
  }
});

// Register device token
router.post('/device-tokens', verifyToken, async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Device token is required'
      });
    }

    const pool = createPool();
    await pool.query(
      `INSERT INTO device_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, COALESCE($3, 'android'), NOW())
       ON CONFLICT (token)
       DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = NOW()`,
      [req.userId, token, platform]
    );

    res.json({
      success: true,
      message: 'Device token registered successfully'
    });
  } catch (error) {
    logger.error('Error registering device token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to register device token'
    });
  }
});

// Remove device token
router.delete('/device-tokens', verifyToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Device token is required'
      });
    }

    const pool = createPool();
    await pool.query(
      `DELETE FROM device_tokens WHERE token = $1 AND user_id = $2`,
      [token, req.userId]
    );

    res.json({
      success: true,
      message: 'Device token removed successfully'
    });
  } catch (error) {
    logger.error('Error removing device token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to remove device token'
    });
  }
});

module.exports = router;

