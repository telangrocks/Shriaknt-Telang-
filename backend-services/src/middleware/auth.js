const jwt = require('jsonwebtoken');
const { getSession } = require('../services/redis');
const { createPool } = require('../database/pool');
const logger = require('../utils/logger');

// Verify JWT token
async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'No token provided',
        message: 'Authorization header missing or invalid'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.userPhone = decoded.phone;
      
      // Verify session exists
      const session = await getSession(decoded.userId);
      if (!session) {
        return res.status(401).json({
          error: 'Session expired',
          message: 'Please login again'
        });
      }

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Please refresh your token'
        });
      }
      throw error;
    }
  } catch (error) {
    logger.error('Token verification error:', error);
    return res.status(401).json({
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }
}

// Check if user has active subscription
async function requireSubscription(req, res, next) {
  try {
    const pool = createPool();
    const result = await pool.query(`
      SELECT subscription_status, subscription_end_date, trial_end_date
      FROM users
      WHERE id = $1
    `, [req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    const now = new Date();
    const subscriptionEnd = user.subscription_end_date || user.trial_end_date;

    if (!subscriptionEnd || subscriptionEnd < now) {
      return res.status(403).json({
        error: 'Subscription required',
        message: 'Your subscription has expired. Please renew to continue using the service.',
        subscription_status: user.subscription_status
      });
    }

    req.userSubscription = {
      status: user.subscription_status,
      endDate: subscriptionEnd
    };

    next();
  } catch (error) {
    logger.error('Subscription check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify subscription'
    });
  }
}

// Check if user is admin
async function requireAdmin(req, res, next) {
  try {
    const pool = createPool();
    const result = await pool.query(`
      SELECT is_admin
      FROM users
      WHERE id = $1
    `, [req.userId]);

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      return res.status(403).json({
        error: 'Admin access required',
        message: 'This endpoint requires administrator privileges'
      });
    }

    next();
  } catch (error) {
    logger.error('Admin check error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify admin status'
    });
  }
}

module.exports = {
  verifyToken,
  requireSubscription,
  requireAdmin
};

