const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { getCachedMarketData, getCachedAISignal } = require('../services/redis');
const { createPool } = require('../database/pool');
const { getMarketData, getTopPairs } = require('../services/marketData');
const logger = require('../utils/logger');

// Get market data for a pair
router.get('/data/:exchange/:pair', verifyToken, async (req, res) => {
  try {
    const { exchange, pair } = req.params;
    
    // Get cached market data
    let marketData = await getCachedMarketData(exchange, pair);
    
    // If not cached, fetch fresh data
    if (!marketData) {
      marketData = await getMarketData(exchange, pair);
    }

    if (!marketData) {
      return res.status(404).json({
        error: 'Market data not found',
        message: 'Unable to fetch market data for this pair'
      });
    }

    res.json({
      success: true,
      data: marketData
    });
  } catch (error) {
    logger.error('Error getting market data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get market data'
    });
  }
});

// Get top trading pairs
router.get('/top-pairs/:exchange', verifyToken, async (req, res) => {
  try {
    const { exchange } = req.params;
    const { limit = 50 } = req.query;

    const pairs = await getTopPairs(exchange, parseInt(limit));

    res.json({
      success: true,
      pairs,
      count: pairs.length
    });
  } catch (error) {
    logger.error('Error getting top pairs:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get top pairs'
    });
  }
});

// Get active AI signals
router.get('/signals', verifyToken, async (req, res) => {
  try {
    const { exchange, pair, limit = 50 } = req.query;
    const pool = createPool();

    let query = `
      SELECT * FROM ai_signals
      WHERE is_active = true AND expires_at > NOW()
    `;
    const params = [];

    if (exchange) {
      query += ` AND exchange_name = $${params.length + 1}`;
      params.push(exchange);
    }

    if (pair) {
      query += ` AND trading_pair = $${params.length + 1}`;
      params.push(pair);
    }

    query += ` ORDER BY confidence_score DESC, created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      signals: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error getting signals:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get signals'
    });
  }
});

// Get specific signal
router.get('/signals/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to get from cache first
    let signal = await getCachedAISignal(id);
    
    if (!signal) {
      const pool = createPool();
      const result = await pool.query(`
        SELECT * FROM ai_signals
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          error: 'Signal not found'
        });
      }

      signal = result.rows[0];
    }

    res.json({
      success: true,
      signal
    });
  } catch (error) {
    logger.error('Error getting signal:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get signal'
    });
  }
});

module.exports = router;

