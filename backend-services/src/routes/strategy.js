const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { createPool } = require('../database/pool');
const logger = require('../utils/logger');

// Get all available strategies
router.get('/', verifyToken, async (req, res) => {
  try {
    const { type, category } = req.query;
    const pool = createPool();

    let query = 'SELECT * FROM strategies WHERE is_active = true';
    const params = [];

    if (type) {
      query += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ' ORDER BY name ASC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      strategies: result.rows
    });
  } catch (error) {
    logger.error('Error getting strategies:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get strategies'
    });
  }
});

// Get strategy by ID
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = createPool();

    const result = await pool.query(`
      SELECT * FROM strategies
      WHERE id = $1 AND is_active = true
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Strategy not found'
      });
    }

    res.json({
      success: true,
      strategy: result.rows[0]
    });
  } catch (error) {
    logger.error('Error getting strategy:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get strategy'
    });
  }
});

module.exports = router;

