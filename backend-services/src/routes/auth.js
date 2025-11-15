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

async function getOrCreateUserByEmail(email, supabaseUserId, existingPool, userMetadata = {}) {
  // Validate required inputs with detailed logging
  logger.info('getOrCreateUserByEmail called with:', {
    hasEmail: !!email,
    emailType: typeof email,
    emailValue: email ? `${email.substring(0, 3)}***` : 'null',
    hasSupabaseUserId: !!supabaseUserId,
    supabaseUserIdType: typeof supabaseUserId,
    supabaseUserIdValue: supabaseUserId ? `${supabaseUserId.substring(0, 8)}***` : 'null',
    hasMetadata: !!userMetadata,
    metadataKeys: Object.keys(userMetadata || {})
  })

  if (!email && !supabaseUserId) {
    logger.error('getOrCreateUserByEmail: Both email and supabaseUserId are missing')
    throw new Error('Either email or supabaseUserId must be provided')
  }

  if (!supabaseUserId) {
    logger.error('getOrCreateUserByEmail: supabaseUserId is missing', { email })
    throw new Error('supabaseUserId is required')
  }

  // Validate supabaseUserId is a valid UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(String(supabaseUserId).trim())) {
    logger.error('getOrCreateUserByEmail: Invalid UUID format for supabaseUserId', { supabaseUserId })
    throw new Error('supabaseUserId must be a valid UUID format')
  }

  const pool = existingPool || createPool()

  // Validate database connection
  if (!pool) {
    throw new Error('Database pool is not initialized. Check DATABASE_URL configuration.')
  }

  // Normalize email - ensure it's a valid string or null
  // Email is optional in database, so null is acceptable
  let normalizedEmail = null
  if (email) {
    const trimmed = String(email).trim()
    if (trimmed.length > 0) {
      normalizedEmail = trimmed.toLowerCase()
      // Validate email format only if email is provided
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(normalizedEmail)) {
        logger.warn('getOrCreateUserByEmail: Invalid email format, proceeding with null email', { 
          email, 
          normalizedEmail,
          note: 'Email is optional in database schema, will proceed with null'
        })
        // Email is optional, so set to null instead of throwing error
        normalizedEmail = null
      }
    }
  }

  // Log what we're about to use
  logger.info('getOrCreateUserByEmail: Normalized values:', {
    normalizedEmail: normalizedEmail ? `${normalizedEmail.substring(0, 3)}***` : 'null',
    supabaseUserId: `${String(supabaseUserId).substring(0, 8)}***`
  })

  let userResult
  try {
    // Query for existing user
    userResult = await pool.query(
      `
        SELECT id, supabase_user_id
        FROM users
        WHERE (supabase_user_id = $1 AND supabase_user_id IS NOT NULL)
           OR (LOWER(email) = LOWER($2) AND email IS NOT NULL)
        LIMIT 1
      `,
      [supabaseUserId, normalizedEmail]
    )
  } catch (error) {
    logger.error('Database error during user lookup:', {
      error: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      email: normalizedEmail,
      supabaseUserId,
      sqlState: error.sqlState,
      errno: error.errno
    })
    
    // Handle specific database errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      throw new Error('Database connection failed. Please check DATABASE_URL and ensure the database is running.')
    }
    if (error.code === '42P01') { // Table does not exist
      throw new Error('Users table does not exist. Database schema may need to be initialized.')
    }
    
    throw new Error(`Database query failed: ${error.message}`)
  }

  const trialDays = parseInt(process.env.TRIAL_DAYS, 10) || 5
  const trialEndDate = new Date()
  trialEndDate.setDate(trialEndDate.getDate() + trialDays)

  // Validate all values before INSERT
  if (!supabaseUserId || typeof supabaseUserId !== 'string' || supabaseUserId.trim().length === 0) {
    logger.error('getOrCreateUserByEmail: Invalid supabaseUserId before INSERT', {
      supabaseUserId,
      type: typeof supabaseUserId
    })
    throw new Error('Invalid supabaseUserId: must be a non-empty UUID string')
  }

  // Email can be null, but if provided it must be valid
  if (normalizedEmail !== null && (!normalizedEmail || typeof normalizedEmail !== 'string' || normalizedEmail.trim().length === 0)) {
    logger.error('getOrCreateUserByEmail: Invalid normalizedEmail before INSERT', {
      normalizedEmail,
      originalEmail: email,
      type: typeof normalizedEmail
    })
    throw new Error('Invalid email format: email must be a valid string or null')
  }

  // Validate trialEndDate
  if (!trialEndDate || isNaN(trialEndDate.getTime())) {
    logger.error('getOrCreateUserByEmail: Invalid trialEndDate before INSERT', {
      trialEndDate,
      trialDays
    })
    throw new Error('Invalid trial end date: date calculation failed')
  }

  // Extract name information from metadata
  const fullName = userMetadata?.name || userMetadata?.full_name || ''
  const firstName = userMetadata?.first_name || userMetadata?.firstName || ''
  const lastName = userMetadata?.last_name || userMetadata?.lastName || ''
  
  // If we have full name but no first_name, try to split it
  let finalFirstName = firstName
  let finalLastName = lastName
  let finalName = fullName
  
  if (!finalFirstName && fullName) {
    // Split full name into first and last name
    const nameParts = fullName.trim().split(/\s+/)
    finalFirstName = nameParts[0] || ''
    finalLastName = nameParts.slice(1).join(' ') || null
    finalName = fullName
  } else if (!finalFirstName && !fullName) {
    // No name provided, use email prefix or default
    finalFirstName = normalizedEmail ? normalizedEmail.split('@')[0] : 'User'
    finalName = finalFirstName
  } else if (finalFirstName && !finalName) {
    // We have first_name but no full name
    finalName = finalLastName ? `${finalFirstName} ${finalLastName}` : finalFirstName
  }

  logger.info('getOrCreateUserByEmail: Values validated, proceeding with INSERT', {
    normalizedEmail: normalizedEmail ? `${normalizedEmail.substring(0, 3)}***` : 'null',
    supabaseUserId: `${String(supabaseUserId).substring(0, 8)}***`,
    trialEndDate: trialEndDate.toISOString(),
    hasFirstName: !!finalFirstName,
    firstNameLength: finalFirstName?.length || 0,
    hasName: !!finalName,
    nameLength: finalName?.length || 0
  })

  if (userResult.rows.length === 0) {
    // Create new user
    let newUser
    try {
      logger.info('getOrCreateUserByEmail: Executing INSERT for new user', {
        hasEmail: !!normalizedEmail,
        emailValue: normalizedEmail ? `${normalizedEmail.substring(0, 3)}***` : 'null',
        supabaseUserId: `${String(supabaseUserId).substring(0, 8)}***`,
        trialEndDate: trialEndDate.toISOString(),
        firstName: finalFirstName ? `${finalFirstName.substring(0, 3)}***` : 'null',
        name: finalName ? `${finalName.substring(0, 3)}***` : 'null'
      })

      // Ensure supabaseUserId is a valid UUID string (PostgreSQL requires proper UUID format)
      const uuidValue = String(supabaseUserId).trim()
      
      // Validate UUID format one more time before INSERT
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(uuidValue)) {
        logger.error('getOrCreateUserByEmail: Invalid UUID format before INSERT', {
          supabaseUserId: uuidValue,
          length: uuidValue.length
        })
        throw new Error(`Invalid UUID format for supabase_user_id: ${uuidValue.substring(0, 20)}...`)
      }

      // Check if first_name column exists in the database
      let hasFirstNameColumn = false
      try {
        const columnCheck = await pool.query(`
          SELECT column_name, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'first_name'
        `)
        hasFirstNameColumn = columnCheck.rows.length > 0
        logger.info('getOrCreateUserByEmail: Database schema check', {
          hasFirstNameColumn,
          isNullable: hasFirstNameColumn ? columnCheck.rows[0].is_nullable === 'YES' : null
        })
      } catch (schemaError) {
        logger.warn('getOrCreateUserByEmail: Could not check for first_name column', {
          error: schemaError.message
        })
        // Assume it exists if we can't check (safer to include it)
        hasFirstNameColumn = true
      }

      // Check for name column
      let hasNameColumn = false
      try {
        const nameColumnCheck = await pool.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'name'
        `)
        hasNameColumn = nameColumnCheck.rows.length > 0
      } catch (err) {
        // Ignore error, assume name column might not exist
      }

      // Build INSERT query dynamically based on schema
      const insertColumns = [
        'email',
        'supabase_user_id',
        'is_verified',
        'trial_start_date',
        'trial_end_date',
        'subscription_status'
      ]
      
      // Build placeholders and values arrays
      const allPlaceholders = []
      const queryValues = []
      let paramIndex = 1
      
      // email
      allPlaceholders.push(`$${paramIndex++}`)
      queryValues.push(normalizedEmail)
      
      // supabase_user_id
      allPlaceholders.push(`$${paramIndex++}::UUID`)
      queryValues.push(uuidValue)
      
      // is_verified
      allPlaceholders.push(`$${paramIndex++}`)
      queryValues.push(true)
      
      // trial_start_date
      allPlaceholders.push('NOW()')
      
      // trial_end_date
      allPlaceholders.push(`$${paramIndex++}::TIMESTAMP`)
      queryValues.push(trialEndDate)
      
      // subscription_status
      allPlaceholders.push(`'trial'`)
      
      // first_name (if column exists)
      if (hasFirstNameColumn) {
        insertColumns.push('first_name')
        allPlaceholders.push(`$${paramIndex++}`)
        queryValues.push(finalFirstName)
      }
      
      // name (if column exists and we have a name value)
      if (hasNameColumn && finalName) {
        insertColumns.push('name')
        allPlaceholders.push(`$${paramIndex++}`)
        queryValues.push(finalName)
      }

      // Use explicit type casting, but handle NULL properly
      // PostgreSQL handles NULL values correctly without explicit casting, so only cast non-NULL values
      newUser = await pool.query(
        `
          INSERT INTO users (
            ${insertColumns.join(', ')}
          )
          VALUES (${allPlaceholders.join(', ')})
          RETURNING id
        `,
        queryValues
      )
      
      if (!newUser || !newUser.rows || newUser.rows.length === 0) {
        throw new Error('Failed to create user: INSERT query did not return user ID')
      }
      
      return { userId: newUser.rows[0].id, isNewUser: true }
    } catch (error) {
      logger.error('Database error during user creation:', {
        error: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        email: normalizedEmail,
        supabaseUserId,
        sqlState: error.sqlState,
        errno: error.errno
      })
      
      // Handle specific database errors
      if (error.code === '23505') { // Unique constraint violation
        // User might have been created by another request, try to fetch again
        logger.info('Unique constraint violation during user creation, attempting to fetch existing user', {
          email: normalizedEmail,
          supabaseUserId
        })
        
        try {
          const retryResult = await pool.query(
            `
              SELECT id, supabase_user_id
              FROM users
              WHERE (supabase_user_id = $1 AND supabase_user_id IS NOT NULL)
                 OR (LOWER(email) = LOWER($2) AND email IS NOT NULL)
              LIMIT 1
            `,
            [supabaseUserId, normalizedEmail]
          )
          
          if (retryResult.rows.length > 0) {
            logger.info('Successfully retrieved user after unique constraint violation', {
              userId: retryResult.rows[0].id,
              email: normalizedEmail
            })
            return { userId: retryResult.rows[0].id, isNewUser: false }
          }
        } catch (retryError) {
          logger.error('Failed to retrieve user after unique constraint violation:', {
            error: retryError.message,
            code: retryError.code
          })
        }
        
        throw new Error('User already exists with this email or Supabase user ID')
      }
      if (error.code === '23503') { // Foreign key violation
        throw new Error('Invalid reference during user creation')
      }
      if (error.code === '23502') { // Not null violation
        // Extract all possible error details
        const errorDetails = {
          error: error.message,
          code: error.code,
          constraint: error.constraint,
          table: error.table,
          column: error.column,
          detail: error.detail,
          hint: error.hint,
          where: error.where,
          schema: error.schema,
          sqlState: error.sqlState,
          email: normalizedEmail,
          supabaseUserId: String(supabaseUserId).substring(0, 8) + '***',
          allErrorKeys: Object.keys(error),
          allErrorValues: {}
        }
        
        // Safely extract error values (avoid circular refs)
        Object.keys(error).forEach(key => {
          try {
            const value = error[key]
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              errorDetails.allErrorValues[key] = value
            } else if (value === null || value === undefined) {
              errorDetails.allErrorValues[key] = value
            } else {
              errorDetails.allErrorValues[key] = `[${typeof value}]`
            }
          } catch (e) {
            errorDetails.allErrorValues[key] = '[unserializable]'
          }
        })
        
        logger.error('Database NOT NULL constraint violation during user creation:', errorDetails)
        
        // Create a more helpful error message with improved column name extraction
        // Try multiple methods to extract the column name from PostgreSQL error
        let columnName = 'unknown'
        if (error.column) {
          columnName = error.column
        } else if (error.detail) {
          // Try various PostgreSQL error detail formats
          const detailMatch = error.detail.match(/column "([^"]+)"/i) || 
                             error.detail.match(/column\s+([^\s,]+)/i) ||
                             error.detail.match(/\(([^)]+)\)/i)
          if (detailMatch) {
            columnName = detailMatch[1]
          }
        } else if (error.message) {
          // Try to extract from error message
          const messageMatch = error.message.match(/column "([^"]+)"/i) ||
                              error.message.match(/column\s+([^\s,]+)/i) ||
                              error.message.match(/null value in column "([^"]+)"/i)
          if (messageMatch) {
            columnName = messageMatch[1]
          }
        }
        
        const helpfulMessage = `Required field '${columnName}' is missing or null. This is likely a database schema issue. Values being inserted: email=${normalizedEmail ? 'provided' : 'null'}, supabaseUserId=${supabaseUserId ? 'provided' : 'null'}, is_verified=true, trial_start_date=NOW(), trial_end_date=${trialEndDate ? 'provided' : 'null'}, subscription_status='trial'`
        
        // Create error with original database error attached for better error handling upstream
        const userError = new Error(`Required field missing during user creation: ${columnName}. ${helpfulMessage}`)
        userError.originalError = error
        userError.column = columnName
        throw userError
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        throw new Error('Database connection failed. Please check DATABASE_URL and ensure the database is running.')
      }
      
      throw new Error(`Failed to create user: ${error.message}`)
    }
  }

  // Update existing user if needed
  const existingUser = userResult.rows[0]

  if (!existingUser.supabase_user_id || existingUser.supabase_user_id !== supabaseUserId) {
    try {
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
    } catch (error) {
      logger.error('Database error during user update:', {
        error: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        userId: existingUser.id,
        email: normalizedEmail,
        supabaseUserId,
        sqlState: error.sqlState,
        errno: error.errno
      })
      
      // For update errors, we can still return the user (update is not critical)
      // Log warning but don't fail the request
      logger.warn('Failed to update user with Supabase user ID, but user exists and will be returned', {
        userId: existingUser.id,
        error: error.message
      })
    }
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
  const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()
  
  logger.info(`[AUTH_FLOW] [${requestId}] Session exchange request received`, {
    requestId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date().toISOString()
  })

  try {
    // Log incoming request body for debugging
    logger.info(`[AUTH_FLOW] [${requestId}] Request body received:`, {
      requestId,
      bodyKeys: Object.keys(req.body || {}),
      hasAccessToken: !!req.body?.accessToken,
      accessTokenType: typeof req.body?.accessToken,
      bodyStringified: JSON.stringify(req.body || {}).substring(0, 200) // First 200 chars for safety
    })

    const { accessToken } = req.body

    if (!accessToken) {
      logger.error(`[AUTH_FLOW] [${requestId}] Missing accessToken in request body:`, {
        requestId,
        body: req.body,
        bodyKeys: Object.keys(req.body || {}),
        contentType: req.get('content-type')
      })
      return res.status(400).json({
        error: 'Missing accessToken',
        message: 'Supabase access token is required in the request body. Please ensure the access_token from Supabase is sent as "accessToken" field.'
      })
    }

    // Validate accessToken is a string and not empty
    if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
      logger.error(`[AUTH_FLOW] [${requestId}] Invalid accessToken format:`, {
        requestId,
        accessTokenType: typeof accessToken,
        accessTokenLength: accessToken?.length,
        accessTokenValue: String(accessToken).substring(0, 50)
      })
      return res.status(400).json({
        error: 'Invalid accessToken',
        message: 'The access token must be a non-empty string.'
      })
    }

    logger.info(`[AUTH_FLOW] [${requestId}] Access token received`, {
      requestId,
      tokenLength: accessToken.length,
      tokenPrefix: accessToken.substring(0, 20) + '...',
      tokenSuffix: '...' + accessToken.substring(accessToken.length - 10)
    })

    if (!SUPABASE_JWT_SECRET) {
      logger.error(`[BACKEND_ERROR] [${requestId}] SUPABASE_JWT_SECRET is missing - cannot verify Supabase tokens`)
      return res.status(500).json({
        error: 'Authentication not configured',
        message: 'Server is missing SUPABASE_JWT_SECRET configuration.'
      })
    }

    // Validate required environment variables for token issuance
    if (!process.env.JWT_SECRET) {
      logger.error(`[BACKEND_ERROR] [${requestId}] JWT_SECRET is missing - cannot issue authentication tokens`)
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'JWT_SECRET is not configured. Cannot issue authentication tokens.'
      })
    }

    if (!process.env.REFRESH_TOKEN_SECRET) {
      logger.error(`[BACKEND_ERROR] [${requestId}] REFRESH_TOKEN_SECRET is missing - cannot issue refresh tokens`)
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'REFRESH_TOKEN_SECRET is not configured. Cannot issue refresh tokens.'
      })
    }

    let decodedToken

    try {
      logger.info(`[AUTH_FLOW] [${requestId}] Starting Supabase token verification`, {
        requestId,
        secretLength: SUPABASE_JWT_SECRET.length,
        tokenLength: accessToken.length
      })
      
      decodedToken = jwt.verify(accessToken, SUPABASE_JWT_SECRET, {
        algorithms: ['HS256']
      })
      
      logger.info(`[AUTH_FLOW] [${requestId}] Supabase token verified successfully`, {
        requestId,
        supabaseUserId: decodedToken.sub,
        email: decodedToken.email,
        tokenClaims: Object.keys(decodedToken),
        iat: decodedToken.iat,
        exp: decodedToken.exp
      })
    } catch (error) {
      // Enhanced error logging for JWT verification failures
      const errorDetails = {
        requestId,
        error: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack
      }
      
      // Add specific error information based on error type
      if (error.name === 'JsonWebTokenError') {
        errorDetails.hint = 'Token signature verification failed. Check if SUPABASE_JWT_SECRET matches Supabase project settings.'
        logger.error(`[AUTH_FLOW] [${requestId}] JWT signature verification failed:`, {
          ...errorDetails,
          secretLength: SUPABASE_JWT_SECRET.length,
          secretPrefix: SUPABASE_JWT_SECRET.substring(0, 10) + '...'
        })
      } else if (error.name === 'TokenExpiredError') {
        errorDetails.hint = 'Token has expired. Please sign in again.'
        logger.warn(`[AUTH_FLOW] [${requestId}] Supabase token expired:`, errorDetails)
      } else if (error.name === 'NotBeforeError') {
        errorDetails.hint = 'Token is not yet valid.'
        logger.warn(`[AUTH_FLOW] [${requestId}] Supabase token not yet valid:`, errorDetails)
      } else {
        logger.error(`[AUTH_FLOW] [${requestId}] Unexpected JWT verification error:`, errorDetails)
      }
      
      return res.status(401).json({
        error: 'Invalid Supabase token',
        message: error.name === 'TokenExpiredError' 
          ? 'Your session has expired. Please sign in again.'
          : 'The provided authentication token is invalid or expired.'
      })
    }

    // Extract email and user ID from token with validation
    const rawEmail = decodedToken.email
    const rawSupabaseUserId = decodedToken.sub
    
    logger.info(`[AUTH_FLOW] [${requestId}] Extracted token data:`, {
      requestId,
      hasEmail: !!rawEmail,
      emailType: typeof rawEmail,
      emailValue: rawEmail ? `${rawEmail.substring(0, 3)}***` : 'null',
      hasSupabaseUserId: !!rawSupabaseUserId,
      supabaseUserIdType: typeof rawSupabaseUserId,
      supabaseUserIdValue: rawSupabaseUserId ? `${rawSupabaseUserId.substring(0, 8)}***` : 'null',
      allTokenClaims: Object.keys(decodedToken)
    })

    // Normalize email - handle empty strings and whitespace
    let email = null
    if (rawEmail) {
      const trimmed = String(rawEmail).trim()
      if (trimmed.length > 0) {
        email = trimmed.toLowerCase()
      }
    }

    // Validate supabaseUserId - must be a non-empty string/UUID
    let supabaseUserId = null
    if (rawSupabaseUserId) {
      const trimmed = String(rawSupabaseUserId).trim()
      if (trimmed.length > 0) {
        supabaseUserId = trimmed
      }
    }

    // Email is optional in database but preferred for user identification
    // Only validate format if email is provided, don't require it
    if (!email) {
      logger.warn(`[AUTH_FLOW] [${requestId}] Supabase token missing email claim, but continuing (email is optional):`, {
        requestId,
        rawEmail,
        emailType: typeof rawEmail,
        tokenClaims: Object.keys(decodedToken),
        sub: decodedToken.sub,
        note: 'Email is optional in database schema, will continue with null email'
      })
      // Don't return error - email can be null in database
      // email will remain null and be handled by getOrCreateUserByEmail
    }

    if (!supabaseUserId) {
      logger.error(`[AUTH_FLOW] [${requestId}] Supabase token missing or invalid subject claim:`, {
        requestId,
        rawSupabaseUserId,
        supabaseUserIdType: typeof rawSupabaseUserId,
        tokenClaims: Object.keys(decodedToken),
        email: decodedToken.email
      })
      return res.status(400).json({
        error: 'Missing subject',
        message: 'Supabase token does not contain a valid subject (user ID) claim.'
      })
    }

    // Validate email format only if email is provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        logger.error(`[AUTH_FLOW] [${requestId}] Invalid email format:`, {
          requestId,
          email
        })
        return res.status(400).json({
          error: 'Invalid email',
          message: 'The email address in the token is not in a valid format.'
        })
      }
    }

    // Validate UUID format for supabaseUserId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(supabaseUserId)) {
      logger.error(`[AUTH_FLOW] [${requestId}] Invalid UUID format for supabaseUserId:`, {
        requestId,
        supabaseUserId
      })
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'The user ID in the token is not in a valid UUID format.'
      })
    }

    // Get or create user in database
    let userId, isNewUser
    try {
      // Extract user metadata from token (user_metadata from Supabase)
      const userMetadata = decodedToken.user_metadata || {}
      
      logger.info(`[AUTH_FLOW] [${requestId}] Getting or creating user by email`, {
        requestId,
        email,
        supabaseUserId,
        hasMetadata: !!userMetadata,
        metadataKeys: Object.keys(userMetadata)
      })
      const userResult = await getOrCreateUserByEmail(email, supabaseUserId, null, userMetadata)
      userId = userResult.userId
      isNewUser = userResult.isNewUser
      logger.info(`[AUTH_FLOW] [${requestId}] User retrieved/created successfully`, {
        requestId,
        userId,
        isNewUser,
        email
      })
    } catch (error) {
      logger.error(`[BACKEND_ERROR] [${requestId}] Database error during user lookup/creation:`, {
        requestId,
        error: error.message,
        name: error.name,
        code: error.code,
        stack: error.stack,
        email,
        supabaseUserId,
        sqlState: error.sqlState,
        errno: error.errno
      })
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to retrieve or create user account.'
      let httpStatus = 500
      
      if (error.message.includes('Database connection failed')) {
        errorMessage = 'Database connection failed. Please check server configuration.'
        httpStatus = 503 // Service Unavailable
      } else if (error.message.includes('Users table does not exist')) {
        errorMessage = 'Database schema error. Please contact support.'
        httpStatus = 500
      } else if (error.message.includes('User already exists')) {
        errorMessage = 'User account already exists. Please try logging in instead.'
        httpStatus = 409 // Conflict
      } else if (error.message.includes('Required field missing')) {
        // Extract the column name from the error message with improved regex
        // The error message format is: "Required field missing during user creation: {columnName}. {details}"
        let columnName = 'unknown'
        
        // First try to extract from the error message itself
        const columnMatch = error.message.match(/Required field missing during user creation:\s*(\w+)/i) ||
                           error.message.match(/column[:\s]+"([^"]+)"/i) ||
                           error.message.match(/column[:\s]+(\w+)/i) ||
                           error.message.match(/field\s+'([^']+)'/i)
        
        if (columnMatch) {
          columnName = columnMatch[1]
        }
        
        // If we still don't have it, check if the error object itself has the column property
        // or if the original database error has the column
        if (columnName === 'unknown') {
          if (error.column) {
            columnName = error.column
          } else if (error.originalError) {
            columnName = error.originalError.column || error.originalError.detail?.match(/column "([^"]+)"/i)?.[1] || 'unknown'
          }
        }
        
        errorMessage = `Invalid user data: required field '${columnName}' is missing. Please contact support if this issue persists.`
        httpStatus = 400 // Bad Request
        // Log the detailed error for debugging
        logger.error(`[BACKEND_ERROR] [${requestId}] Database NOT NULL violation details:`, {
          requestId,
          errorMessage: error.message,
          errorCode: error.code,
          column: columnName,
          email: email,
          supabaseUserId: supabaseUserId,
          allErrorProps: Object.keys(error),
          originalErrorColumn: error.originalError?.column,
          originalErrorDetail: error.originalError?.detail
        })
      } else if (error.code === '23505') { // Unique constraint violation
        errorMessage = 'User account already exists. Please try logging in instead.'
        httpStatus = 409 // Conflict
      } else if (error.code === '42P01') { // Table does not exist
        errorMessage = 'Database schema error. Please contact support.'
        httpStatus = 500
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        errorMessage = 'Database connection failed. Please try again later.'
        httpStatus = 503 // Service Unavailable
      }
      
      return res.status(httpStatus).json({
        error: 'Database error',
        message: errorMessage,
        requestId: requestId
      })
    }

    // Issue authentication tokens
    let token, refreshToken
    try {
      logger.info(`[SESSION_EXCHANGE] [${requestId}] Issuing authentication tokens`, {
        requestId,
        userId,
        email
      })
      const tokenResult = await issueAuthTokens(userId, email)
      token = tokenResult.token
      refreshToken = tokenResult.refreshToken
      logger.info(`[SESSION_EXCHANGE] [${requestId}] Authentication tokens issued successfully`, {
        requestId,
        userId,
        tokenLength: token.length,
        refreshTokenLength: refreshToken.length
      })
    } catch (error) {
      logger.error(`[BACKEND_ERROR] [${requestId}] Error issuing authentication tokens:`, {
        requestId,
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

    const duration = Date.now() - startTime
    logger.info(`[AUTH_FLOW] [${requestId}] Supabase login successful`, {
      requestId,
      userId,
      email,
      isNewUser,
      supabaseUserId,
      duration: `${duration}ms`
    })

    // CRITICAL: Ensure response has consistent structure that frontend expects
    const response = {
      success: true,
      message: isNewUser ? 'Account created and verified' : 'Login successful',
      token,
      refreshToken,
      user: {
        id: userId,
        email: email || null,
        isNewUser,
        supabaseUserId
      }
    }

    logger.info(`[AUTH_FLOW] [${requestId}] Sending successful response:`, {
      requestId,
      hasSuccess: !!response.success,
      hasToken: !!response.token,
      hasRefreshToken: !!response.refreshToken,
      hasUser: !!response.user,
      userId: response.user.id,
      userEmail: response.user.email,
      isNewUser: response.user.isNewUser
    })

    res.json(response)
  } catch (error) {
    // Catch-all for any unexpected errors with comprehensive logging
    const duration = Date.now() - startTime
    
    // Extract all possible error information
    const errorInfo = {
      requestId,
      error: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    }
    
    // Add additional error properties if available
    if (error.sql) errorInfo.sql = error.sql
    if (error.sqlState) errorInfo.sqlState = error.sqlState
    if (error.sqlMessage) errorInfo.sqlMessage = error.sqlMessage
    if (error.errno) errorInfo.errno = error.errno
    if (error.syscall) errorInfo.syscall = error.syscall
    if (error.address) errorInfo.address = error.address
    if (error.port) errorInfo.port = error.port
    
    // Log full error details
    logger.error(`[BACKEND_ERROR] [${requestId}] Unexpected error during Supabase login:`, {
      ...errorInfo,
      errorObject: error,
      errorKeys: Object.keys(error || {}),
      errorString: error.toString()
    })
    
    // Return detailed error response (safe for production - no sensitive data)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to authenticate with Supabase. Please try again or contact support if the issue persists.',
      requestId: requestId, // Include request ID for support
      timestamp: new Date().toISOString()
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


