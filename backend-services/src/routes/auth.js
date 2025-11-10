const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createPool } = require('../database/pool');
const { setSession } = require('../services/redis');
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const { getFirebaseAuth } = require('../services/firebaseAdmin');

async function getOrCreateUserByPhone(phone, existingPool) {
  const pool = existingPool || createPool();

  let userResult = await pool.query(
    `SELECT id FROM users WHERE phone = $1`,
    [phone]
  );

  let userId;
  let isNewUser = false;

  if (userResult.rows.length === 0) {
    const trialDays = parseInt(process.env.TRIAL_DAYS, 10) || 5;
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + trialDays);

    const newUser = await pool.query(
      `INSERT INTO users (phone, trial_start_date, trial_end_date, subscription_status, is_verified)
       VALUES ($1, NOW(), $2, 'trial', true)
       RETURNING id`,
      [phone, trialEndDate]
    );

    userId = newUser.rows[0].id;
    isNewUser = true;
  } else {
    userId = userResult.rows[0].id;
    await pool.query(
      `UPDATE users SET is_verified = true, updated_at = NOW() WHERE id = $1`,
      [userId]
    );
  }

  return { userId, isNewUser };
}

async function issueAuthTokens(userId, phone) {
  const token = jwt.sign(
    { userId, phone },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

  const refreshToken = jwt.sign(
    { userId, phone },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  );

  await setSession(userId, token, refreshToken);

  return { token, refreshToken };
}

// Firebase login
router.post('/firebase-login', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        error: 'Missing idToken',
        message: 'Firebase ID token is required'
      });
    }

    const firebaseAuth = getFirebaseAuth();
    let decodedToken;

    try {
      decodedToken = await firebaseAuth.verifyIdToken(idToken, true);
    } catch (error) {
      logger.error('Failed to verify Firebase ID token:', error);
      return res.status(401).json({
        error: 'Invalid Firebase token',
        message: 'The provided Firebase token is invalid or expired.'
      });
    }

    const phone = decodedToken.phone_number;

    if (!phone) {
      return res.status(400).json({
        error: 'Missing phone number',
        message: 'Firebase token does not contain a phone number claim.'
      });
    }

    const { userId, isNewUser } = await getOrCreateUserByPhone(phone);
    const { token, refreshToken } = await issueAuthTokens(userId, phone);

    res.json({
      success: true,
      message: isNewUser ? 'Account created and verified' : 'Login successful',
      token,
      refreshToken,
      user: {
        id: userId,
        phone,
        isNewUser,
        firebaseUid: decodedToken.uid
      }
    });
  } catch (error) {
    logger.error('Error during Firebase login:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to authenticate with Firebase'
    });
  }
});

// Refresh token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required'
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
      
      // Generate new tokens
      const token = jwt.sign(
        { userId: decoded.userId, phone: decoded.phone },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      const newRefreshToken = jwt.sign(
        { userId: decoded.userId, phone: decoded.phone },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      );

      // Update session
      await setSession(decoded.userId, token, newRefreshToken);

      res.json({
        success: true,
        token,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Please login again'
      });
    }
  } catch (error) {
    logger.error('Error refreshing token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to refresh token'
    });
  }
});

// Get current user
router.get('/me', verifyToken, async (req, res) => {
  try {
    const pool = createPool();
    const result = await pool.query(`
      SELECT id, phone, name, email, subscription_status, 
             trial_start_date, trial_end_date,
             subscription_start_date, subscription_end_date,
             is_active, is_verified, created_at
      FROM users
      WHERE id = $1
    `, [req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    logger.error('Error getting user:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user data'
    });
  }
});

// Logout
router.post('/logout', verifyToken, async (req, res) => {
  try {
    const { deleteSession } = require('../services/redis');
    await deleteSession(req.userId);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Error logging out:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout'
    });
  }
});

module.exports = router;

