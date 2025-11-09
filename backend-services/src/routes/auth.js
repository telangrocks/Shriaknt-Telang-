const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { createPool } = require('../database/pool');
const { setOTP, getOTP, incrementOTPAttempts, deleteOTP, setSession } = require('../services/redis');
const { verifyToken } = require('../middleware/auth');
const logger = require('../utils/logger');
const twilio = require('twilio');

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via SMS
async function sendOTP(phone, otp) {
  try {
    await twilioClient.messages.create({
      body: `Your Cryptopulse verification code is: ${otp}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone
    });
    return true;
  } catch (error) {
    logger.error('Error sending OTP:', error);
    return false;
  }
}

// Request OTP
router.post('/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\+?[1-9]\d{1,14}$/.test(phone)) {
      return res.status(400).json({
        error: 'Invalid phone number',
        message: 'Please provide a valid phone number'
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresIn = 300; // 5 minutes

    // Store OTP in Redis
    await setOTP(phone, otp, expiresIn);

    // Store OTP in database for audit
    const pool = createPool();
    await pool.query(`
      INSERT INTO otp_verifications (phone, otp_code, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
    `, [phone, otp]);

    // Send OTP via SMS
    const sent = await sendOTP(phone, otp);

    if (!sent) {
      return res.status(500).json({
        error: 'Failed to send OTP',
        message: 'Please try again later'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn
    });
  } catch (error) {
    logger.error('Error requesting OTP:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send OTP'
    });
  }
});

// Verify OTP and login
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Phone and OTP are required'
      });
    }

    // Get OTP from Redis
    const otpData = await getOTP(phone);

    if (!otpData) {
      return res.status(400).json({
        error: 'OTP not found',
        message: 'OTP expired or invalid. Please request a new one.'
      });
    }

    // Check attempts
    if (otpData.attempts >= 5) {
      return res.status(429).json({
        error: 'Too many attempts',
        message: 'Maximum OTP verification attempts exceeded. Please request a new OTP.'
      });
    }

    // Verify OTP
    if (otpData.code !== otp) {
      await incrementOTPAttempts(phone);
      return res.status(400).json({
        error: 'Invalid OTP',
        message: 'The OTP you entered is incorrect'
      });
    }

    // OTP verified - create or get user
    const pool = createPool();
    let userResult = await pool.query(`
      SELECT id, phone, subscription_status, trial_end_date, subscription_end_date
      FROM users
      WHERE phone = $1
    `, [phone]);

    let userId;
    let isNewUser = false;

    if (userResult.rows.length === 0) {
      // Create new user with trial
      const trialDays = parseInt(process.env.TRIAL_DAYS) || 5;
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + trialDays);

      const newUser = await pool.query(`
        INSERT INTO users (phone, trial_start_date, trial_end_date, subscription_status, is_verified)
        VALUES ($1, NOW(), $2, 'trial', true)
        RETURNING id, phone, subscription_status, trial_end_date
      `, [phone, trialEndDate]);

      userId = newUser.rows[0].id;
      isNewUser = true;
    } else {
      userId = userResult.rows[0].id;
      
      // Update verification status
      await pool.query(`
        UPDATE users
        SET is_verified = true, updated_at = NOW()
        WHERE id = $1
      `, [userId]);
    }

    // Generate tokens
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

    // Store session
    await setSession(userId, token, refreshToken);

    // Delete OTP
    await deleteOTP(phone);

    // Mark OTP as verified in database
    await pool.query(`
      UPDATE otp_verifications
      SET is_verified = true
      WHERE phone = $1 AND otp_code = $2
    `, [phone, otp]);

    res.json({
      success: true,
      message: isNewUser ? 'Account created and verified' : 'Login successful',
      token,
      refreshToken,
      user: {
        id: userId,
        phone,
        isNewUser
      }
    });
  } catch (error) {
    logger.error('Error verifying OTP:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify OTP'
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

