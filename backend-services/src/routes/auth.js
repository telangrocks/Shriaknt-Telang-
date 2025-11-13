const express = require('express')
const jwt = require('jsonwebtoken')
const router = express.Router()
const { createPool } = require('../database/pool')
const { setSession } = require('../services/redis')
const { verifyToken } = require('../middleware/auth')
const logger = require('../utils/logger')
const { getSupabaseJwtSecret } = require('../utils/getSupabaseJwtSecret')

// Get Supabase JWT Secret (supports both SUPABASE_JWT_SECRET and SUPABASE_JWT_SECRE)
const SUPABASE_JWT_SECRET = getSupabaseJwtSecret()

if (!SUPABASE_JWT_SECRET) {
  logger.warn('SUPABASE_JWT_SECRET is not set. Authentication will fail until this is configured.')
  logger.warn('Checked for: SUPABASE_JWT_SECRET, SUPABASE_JWT_SECRE, SUPABASE_JWT, JWT_SECRET_SUPABASE, SUPABASE_SECRET')
}

async function getOrCreateUserByEmail(email, supabaseUserId, existingPool) {
  const pool = existingPool || createPool()

  const normalizedEmail = email ? email.toLowerCase() : null

  const userResult = await pool.query(
    `
      SELECT id, supabase_user_id
      FROM users
      WHERE (supabase_user_id = $1 AND supabase_user_id IS NOT NULL)
         OR (LOWER(email) = LOWER($2) AND email IS NOT NULL)
      LIMIT 1
    `,
    [supabaseUserId, normalizedEmail]
  )

  const trialDays = parseInt(process.env.TRIAL_DAYS, 10) || 5
  const trialEndDate = new Date()
  trialEndDate.setDate(trialEndDate.getDate() + trialDays)

  if (userResult.rows.length === 0) {
    const newUser = await pool.query(
      `
        INSERT INTO users (
          email,
          supabase_user_id,
          is_verified,
          trial_start_date,
          trial_end_date,
          subscription_status
        )
        VALUES ($1, $2, true, NOW(), $3, 'trial')
        RETURNING id
      `,
      [normalizedEmail, supabaseUserId, trialEndDate]
    )

    return { userId: newUser.rows[0].id, isNewUser: true }
  }

  const existingUser = userResult.rows[0]

  if (!existingUser.supabase_user_id) {
    await pool.query(
      `
        UPDATE users
        SET supabase_user_id = $1,
            is_verified = true,
            email = COALESCE(email, $2),
            updated_at = NOW()
        WHERE id = $3
      `,
      [supabaseUserId, normalizedEmail, existingUser.id]
    )
  }

  return { userId: existingUser.id, isNewUser: false }
}

async function issueAuthTokens(userId, email) {
  const token = jwt.sign(
    { userId, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  )

  const refreshToken = jwt.sign(
    { userId, email },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
  )

  await setSession(userId, token, refreshToken)

  return { token, refreshToken }
}

router.post('/supabase-login', async (req, res) => {
  try {
    const { accessToken } = req.body

    if (!accessToken) {
      return res.status(400).json({
        error: 'Missing accessToken',
        message: 'Supabase access token is required'
      })
    }

    if (!SUPABASE_JWT_SECRET) {
      return res.status(500).json({
        error: 'Authentication not configured',
        message: 'Server is missing SUPABASE_JWT_SECRET configuration.'
      })
    }

    let decodedToken

    try {
      decodedToken = jwt.verify(accessToken, SUPABASE_JWT_SECRET, {
        algorithms: ['HS256']
      })
    } catch (error) {
      logger.warn('Failed to verify Supabase access token:', error)
      return res.status(401).json({
        error: 'Invalid Supabase token',
        message: 'The provided Supabase token is invalid or expired.'
      })
    }

    const email = decodedToken.email ? decodedToken.email.toLowerCase() : null
    const supabaseUserId = decodedToken.sub

    if (!email) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Supabase token does not contain an email claim.'
      })
    }

    if (!supabaseUserId) {
      return res.status(400).json({
        error: 'Missing subject',
        message: 'Supabase token does not contain a subject claim.'
      })
    }

    const { userId, isNewUser } = await getOrCreateUserByEmail(email, supabaseUserId)
    const { token, refreshToken } = await issueAuthTokens(userId, email)

    res.json({
      success: true,
      message: isNewUser ? 'Account created and verified' : 'Login successful',
      token,
      refreshToken,
      user: {
        id: userId,
        email,
        isNewUser,
        supabaseUserId
      }
    })
  } catch (error) {
    logger.error('Error during Supabase login:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to authenticate with Supabase'
    })
  }
})

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token required'
      })
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)

      const token = jwt.sign(
        { userId: decoded.userId, email: decoded.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      )

      const newRefreshToken = jwt.sign(
        { userId: decoded.userId, email: decoded.email },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
      )

      await setSession(decoded.userId, token, newRefreshToken)

      res.json({
        success: true,
        token,
        refreshToken: newRefreshToken
      })
    } catch (error) {
      return res.status(401).json({
        error: 'Invalid refresh token',
        message: 'Please login again'
      })
    }
  } catch (error) {
    logger.error('Error refreshing token:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to refresh token'
    })
  }
})

router.get('/me', verifyToken, async (req, res) => {
  try {
    const pool = createPool()
    const result = await pool.query(
      `
        SELECT id, phone, name, email, subscription_status,
               trial_start_date, trial_end_date,
               subscription_start_date, subscription_end_date,
               is_active, is_verified, created_at
        FROM users
        WHERE id = $1
      `,
      [req.userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      })
    }

    res.json({
      success: true,
      user: result.rows[0]
    })
  } catch (error) {
    logger.error('Error getting user:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get user data'
    })
  }
})

router.post('/logout', verifyToken, async (req, res) => {
  try {
    const { deleteSession } = require('../services/redis')
    await deleteSession(req.userId)

    res.json({
      success: true,
      message: 'Logged out successfully'
    })
  } catch (error) {
    logger.error('Error logging out:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to logout'
    })
  }
})

module.exports = router


