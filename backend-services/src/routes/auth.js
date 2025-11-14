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
} else {
  // Validate JWT secret format and log info (without exposing the secret)
  const secretLength = SUPABASE_JWT_SECRET.length
  const isBase64 = /^[A-Za-z0-9+/=]+$/.test(SUPABASE_JWT_SECRET)
  
  logger.info('Supabase JWT Secret loaded', {
    length: secretLength,
    isValidBase64: isBase64,
    expectedLength: '64-128 characters (typically 88 for base64-encoded)'
  })
  
  if (secretLength < 32) {
    logger.warn('Supabase JWT Secret is shorter than expected. Typical length is 64-128 characters.')
  }
  
  if (!isBase64) {
    logger.warn('Supabase JWT Secret contains non-base64 characters. This may cause JWT verification to fail.')
  }
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
  // Validate required secrets before attempting to sign tokens
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Cannot issue authentication tokens.')
  }

  if (!process.env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is not configured. Cannot issue refresh tokens.')
  }

  let token, refreshToken

  try {
    token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    )

    refreshToken = jwt.sign(
      { userId, email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' }
    )
  } catch (error) {
    logger.error('Error signing JWT tokens:', {
      error: error.message,
      name: error.name,
      stack: error.stack,
      userId,
      email
    })
    throw new Error('Failed to generate authentication tokens. JWT signing failed.')
  }

  // Store session in Redis (non-blocking - log warning if it fails but don't fail the request)
  try {
    const sessionStored = await setSession(userId, token, refreshToken)
    if (!sessionStored) {
      logger.warn('Failed to store session in Redis, but tokens were issued', {
        userId,
        email
      })
      // Don't throw - tokens are still valid, just not cached
    } else {
      logger.debug('Session stored in Redis successfully', { userId })
    }
  } catch (error) {
    logger.error('Error storing session in Redis:', {
      error: error.message,
      name: error.name,
      stack: error.stack,
      userId,
      email
    })
    // Don't throw - tokens are still valid, Redis failure shouldn't block authentication
    // The session will be recreated on next request if needed
  }

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
      logger.error('SUPABASE_JWT_SECRET is missing - cannot verify Supabase tokens')
      return res.status(500).json({
        error: 'Authentication not configured',
        message: 'Server is missing SUPABASE_JWT_SECRET configuration.'
      })
    }

    // Validate required environment variables for token issuance
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET is missing - cannot issue authentication tokens')
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'JWT_SECRET is not configured. Cannot issue authentication tokens.'
      })
    }

    if (!process.env.REFRESH_TOKEN_SECRET) {
      logger.error('REFRESH_TOKEN_SECRET is missing - cannot issue refresh tokens')
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'REFRESH_TOKEN_SECRET is not configured. Cannot issue refresh tokens.'
      })
    }

    let decodedToken

    try {
      // Log secret info for debugging (without exposing the actual secret)
      logger.info('Verifying Supabase access token...', {
        secretLength: SUPABASE_JWT_SECRET.length,
        tokenLength: accessToken ? accessToken.length : 0,
        tokenPrefix: accessToken ? accessToken.substring(0, 20) + '...' : 'missing'
      })
      
      decodedToken = jwt.verify(accessToken, SUPABASE_JWT_SECRET, {
        algorithms: ['HS256']
      })
      
      logger.info('Supabase token verified successfully', {
        userId: decodedToken.sub,
        email: decodedToken.email,
        tokenClaims: Object.keys(decodedToken)
      })
    } catch (error) {
      // Enhanced error logging for JWT verification failures
      const errorDetails = {
        error: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      }
      
      // Add specific error information based on error type
      if (error.name === 'JsonWebTokenError') {
        errorDetails.hint = 'Token signature verification failed. Check if SUPABASE_JWT_SECRET matches Supabase project settings.'
        logger.error('JWT signature verification failed:', {
          ...errorDetails,
          secretLength: SUPABASE_JWT_SECRET.length,
          secretPrefix: SUPABASE_JWT_SECRET.substring(0, 10) + '...'
        })
      } else if (error.name === 'TokenExpiredError') {
        errorDetails.hint = 'Token has expired. Request a new magic link.'
        logger.warn('Supabase token expired:', errorDetails)
      } else if (error.name === 'NotBeforeError') {
        errorDetails.hint = 'Token is not yet valid.'
        logger.warn('Supabase token not yet valid:', errorDetails)
      } else {
        logger.error('Unexpected JWT verification error:', errorDetails)
      }
      
      return res.status(401).json({
        error: 'Invalid Supabase token',
        message: error.name === 'TokenExpiredError' 
          ? 'The magic link has expired. Please request a new one.'
          : 'The provided Supabase token is invalid or expired.'
      })
    }

    const email = decodedToken.email ? decodedToken.email.toLowerCase() : null
    const supabaseUserId = decodedToken.sub

    if (!email) {
      logger.warn('Supabase token missing email claim', {
        tokenClaims: Object.keys(decodedToken),
        sub: decodedToken.sub
      })
      return res.status(400).json({
        error: 'Missing email',
        message: 'Supabase token does not contain an email claim.'
      })
    }

    if (!supabaseUserId) {
      logger.warn('Supabase token missing subject claim', {
        tokenClaims: Object.keys(decodedToken),
        email: decodedToken.email
      })
      return res.status(400).json({
        error: 'Missing subject',
        message: 'Supabase token does not contain a subject claim.'
      })
    }

    // Get or create user in database
    let userId, isNewUser
    try {
      logger.info('Getting or creating user by email', { email, supabaseUserId })
      const userResult = await getOrCreateUserByEmail(email, supabaseUserId)
      userId = userResult.userId
      isNewUser = userResult.isNewUser
      logger.info('User retrieved/created successfully', { userId, isNewUser })
    } catch (error) {
      logger.error('Database error during user lookup/creation:', {
        error: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        email,
        supabaseUserId
      })
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to retrieve or create user account. Please try again.'
      })
    }

    // Issue authentication tokens
    let token, refreshToken
    try {
      logger.info('Issuing authentication tokens', { userId, email })
      const tokenResult = await issueAuthTokens(userId, email)
      token = tokenResult.token
      refreshToken = tokenResult.refreshToken
      logger.info('Authentication tokens issued successfully', { userId })
    } catch (error) {
      logger.error('Error issuing authentication tokens:', {
        error: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        userId,
        email,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasRefreshTokenSecret: !!process.env.REFRESH_TOKEN_SECRET
      })
      return res.status(500).json({
        error: 'Token issuance error',
        message: 'Failed to generate authentication tokens. Please try again.'
      })
    }

    logger.info('Supabase login successful', {
      userId,
      email,
      isNewUser,
      supabaseUserId
    })

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
    // Catch-all for any unexpected errors
    logger.error('Unexpected error during Supabase login:', {
      error: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      errorObject: error
    })
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to authenticate with Supabase. Please try again or contact support if the issue persists.'
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


