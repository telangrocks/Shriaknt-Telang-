const express = require('express');
const router = express.Router();
const { verifyToken, requireSubscription } = require('../middleware/auth');
const { createPool } = require('../database/pool');
const logger = require('../utils/logger');
const crypto = require('crypto');
const ccxt = require('ccxt');

// Encryption/Decryption functions
function encrypt(text, key) {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData, key) {
  const algorithm = 'aes-256-gcm';
  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(key, 'hex'),
    Buffer.from(encryptedData.iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Add exchange API keys
router.post('/keys', verifyToken, requireSubscription, async (req, res) => {
  try {
    const { exchange_name, api_key, api_secret, passphrase } = req.body;

    if (!exchange_name || !api_key || !api_secret) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Exchange name, API key, and API secret are required'
      });
    }

    // Validate exchange
    const ExchangeClass = ccxt[exchange_name];
    if (!ExchangeClass) {
      return res.status(400).json({
        error: 'Unsupported exchange',
        message: `${exchange_name} is not supported`
      });
    }

    // Test API keys by initializing exchange
    try {
      const exchange = new ExchangeClass({
        apiKey: api_key,
        secret: api_secret,
        passphrase: passphrase || '',
        enableRateLimit: true,
        sandbox: false
      });

      // Test connection
      await exchange.fetchBalance();
    } catch (error) {
      logger.error('Exchange API key validation failed:', error);
      return res.status(400).json({
        error: 'Invalid API keys',
        message: 'Failed to validate API keys. Please check your credentials.'
      });
    }

    // Encrypt API keys
    const encryptionKey = process.env.ENCRYPTION_KEY;
    const encryptedKey = encrypt(api_key, encryptionKey);
    const encryptedSecret = encrypt(api_secret, encryptionKey);
    const encryptedPassphrase = passphrase ? encrypt(passphrase, encryptionKey) : null;

    // Store in database
    const pool = createPool();
    await pool.query(`
      INSERT INTO exchange_keys (
        user_id, exchange_name, api_key_encrypted, api_secret_encrypted, passphrase_encrypted, is_validated
      ) VALUES ($1, $2, $3, $4, $5, true)
      ON CONFLICT (user_id, exchange_name)
      DO UPDATE SET
        api_key_encrypted = $3,
        api_secret_encrypted = $4,
        passphrase_encrypted = $5,
        is_validated = true,
        updated_at = CURRENT_TIMESTAMP
    `, [
      req.userId,
      exchange_name,
      JSON.stringify(encryptedKey),
      JSON.stringify(encryptedSecret),
      encryptedPassphrase ? JSON.stringify(encryptedPassphrase) : null
    ]);

    res.json({
      success: true,
      message: 'Exchange API keys added and validated successfully'
    });
  } catch (error) {
    logger.error('Error adding exchange keys:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to add exchange keys'
    });
  }
});

// Get user's exchange keys (without secrets)
router.get('/keys', verifyToken, async (req, res) => {
  try {
    const pool = createPool();
    const result = await pool.query(`
      SELECT id, exchange_name, is_active, is_validated, created_at, updated_at
      FROM exchange_keys
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.userId]);

    res.json({
      success: true,
      exchanges: result.rows
    });
  } catch (error) {
    logger.error('Error getting exchange keys:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get exchange keys'
    });
  }
});

// Delete exchange keys
router.delete('/keys/:exchangeName', verifyToken, async (req, res) => {
  try {
    const { exchangeName } = req.params;
    const pool = createPool();

    await pool.query(`
      DELETE FROM exchange_keys
      WHERE user_id = $1 AND exchange_name = $2
    `, [req.userId, exchangeName]);

    res.json({
      success: true,
      message: 'Exchange keys deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting exchange keys:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete exchange keys'
    });
  }
});

// Get supported exchanges
router.get('/supported', async (req, res) => {
  try {
    const supportedExchanges = (process.env.SUPPORTED_EXCHANGES || 'binance,bybit,okx').split(',');
    
    res.json({
      success: true,
      exchanges: supportedExchanges.map(name => ({
        name,
        display_name: name.charAt(0).toUpperCase() + name.slice(1)
      }))
    });
  } catch (error) {
    logger.error('Error getting supported exchanges:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get supported exchanges'
    });
  }
});

module.exports = router;

