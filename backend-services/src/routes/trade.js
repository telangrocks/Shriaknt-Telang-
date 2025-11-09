const express = require('express');
const router = express.Router();
const { verifyToken, requireSubscription } = require('../middleware/auth');
const { createPool } = require('../database/pool');
const { acquireTradeLock, releaseTradeLock } = require('../services/redis');
const logger = require('../utils/logger');
const ccxt = require('ccxt');

// Execute trade
router.post('/execute', verifyToken, requireSubscription, async (req, res) => {
  try {
    const { signal_id, exchange_name, trading_pair, trade_type, quantity } = req.body;

    if (!signal_id || !exchange_name || !trading_pair || !trade_type) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Signal ID, exchange, pair, and trade type are required'
      });
    }

    // Acquire trade lock
    const lockKey = `${req.userId}:${exchange_name}:${trading_pair}`;
    const lockAcquired = await acquireTradeLock(req.userId, lockKey, 60);

    if (!lockAcquired) {
      return res.status(429).json({
        error: 'Trade in progress',
        message: 'Another trade is already being executed for this pair'
      });
    }

    try {
      const pool = createPool();

      // Get signal
      const signalResult = await pool.query(`
        SELECT * FROM ai_signals
        WHERE id = $1 AND is_active = true AND expires_at > NOW()
      `, [signal_id]);

      if (signalResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Signal not found',
          message: 'Signal expired or invalid'
        });
      }

      const signal = signalResult.rows[0];

      // Get user's exchange keys
      const keysResult = await pool.query(`
        SELECT api_key_encrypted, api_secret_encrypted, passphrase_encrypted
        FROM exchange_keys
        WHERE user_id = $1 AND exchange_name = $2 AND is_active = true AND is_validated = true
      `, [req.userId, exchange_name]);

      if (keysResult.rows.length === 0) {
        return res.status(400).json({
          error: 'Exchange keys not found',
          message: 'Please configure your exchange API keys'
        });
      }

      // TODO: Decrypt API keys (implement encryption/decryption)
      // For now, this is a placeholder
      const exchangeKeys = keysResult.rows[0];

      // Initialize exchange
      const ExchangeClass = ccxt[exchange_name];
      if (!ExchangeClass) {
        return res.status(400).json({
          error: 'Unsupported exchange',
          message: `${exchange_name} is not supported`
        });
      }

      const exchange = new ExchangeClass({
        apiKey: 'decrypted_key', // TODO: Decrypt
        secret: 'decrypted_secret', // TODO: Decrypt
        enableRateLimit: true
      });

      // Calculate quantity if not provided
      let tradeQuantity = quantity;
      if (!tradeQuantity) {
        const balance = await exchange.fetchBalance();
        const availableBalance = balance[trading_pair.split('/')[0]]?.free || 0;
        const entryPrice = parseFloat(signal.entry_price);
        tradeQuantity = (availableBalance * 0.1) / entryPrice; // Use 10% of balance
      }

      // Execute trade
      let order;
      if (trade_type === 'BUY') {
        order = await exchange.createMarketBuyOrder(trading_pair, tradeQuantity);
      } else {
        order = await exchange.createMarketSellOrder(trading_pair, tradeQuantity);
      }

      // Create trade record
      const tradeResult = await pool.query(`
        INSERT INTO trades (
          user_id, exchange_name, trading_pair, signal_id,
          trade_type, entry_price, quantity, stop_loss, take_profit,
          current_price, status, exchange_order_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open', $11)
        RETURNING id
      `, [
        req.userId,
        exchange_name,
        trading_pair,
        signal_id,
        trade_type,
        signal.entry_price,
        tradeQuantity,
        signal.stop_loss,
        signal.take_profit,
        signal.entry_price,
        order.id
      ]);

      // Deactivate signal
      await pool.query(`
        UPDATE ai_signals
        SET is_active = false
        WHERE id = $1
      `, [signal_id]);

      res.json({
        success: true,
        message: 'Trade executed successfully',
        trade: {
          id: tradeResult.rows[0].id,
          exchange_order_id: order.id,
          status: 'open',
          entry_price: signal.entry_price,
          quantity: tradeQuantity
        }
      });
    } finally {
      await releaseTradeLock(req.userId, lockKey);
    }
  } catch (error) {
    logger.error('Error executing trade:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to execute trade',
      details: error.message
    });
  }
});

// Get user trades
router.get('/history', verifyToken, async (req, res) => {
  try {
    const pool = createPool();
    const { status, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT t.*, s.confidence_score
      FROM trades t
      LEFT JOIN ai_signals s ON t.signal_id = s.id
      WHERE t.user_id = $1
    `;
    const params = [req.userId];

    if (status) {
      query += ` AND t.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY t.executed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    res.json({
      success: true,
      trades: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    logger.error('Error getting trade history:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get trade history'
    });
  }
});

// Get trade statistics
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const pool = createPool();
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_trades,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_trades,
        COUNT(*) FILTER (WHERE status = 'open') as open_trades,
        COUNT(*) FILTER (WHERE pnl > 0) as winning_trades,
        COUNT(*) FILTER (WHERE pnl < 0) as losing_trades,
        COALESCE(SUM(pnl), 0) as total_pnl,
        COALESCE(AVG(pnl_percent), 0) as avg_pnl_percent,
        COALESCE(SUM(pnl) FILTER (WHERE pnl > 0), 0) as total_profit,
        COALESCE(SUM(pnl) FILTER (WHERE pnl < 0), 0) as total_loss
      FROM trades
      WHERE user_id = $1
    `, [req.userId]);

    const stats = result.rows[0];
    const winRate = stats.closed_trades > 0
      ? (stats.winning_trades / stats.closed_trades) * 100
      : 0;

    res.json({
      success: true,
      stats: {
        ...stats,
        win_rate: parseFloat(winRate.toFixed(2))
      }
    });
  } catch (error) {
    logger.error('Error getting trade stats:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get trade statistics'
    });
  }
});

// Close trade
router.post('/close/:tradeId', verifyToken, async (req, res) => {
  try {
    const { tradeId } = req.params;
    const pool = createPool();

    // Get trade
    const tradeResult = await pool.query(`
      SELECT * FROM trades
      WHERE id = $1 AND user_id = $2 AND status = 'open'
    `, [tradeId, req.userId]);

    if (tradeResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Trade not found',
        message: 'Trade not found or already closed'
      });
    }

    const trade = tradeResult.rows[0];

    // TODO: Close position on exchange
    // For now, just update status

    // Calculate final P&L
    const currentPrice = parseFloat(req.body.current_price) || parseFloat(trade.current_price);
    const entryPrice = parseFloat(trade.entry_price);
    const quantity = parseFloat(trade.quantity);

    let pnl = 0;
    if (trade.trade_type === 'BUY') {
      pnl = (currentPrice - entryPrice) * quantity;
    } else {
      pnl = (entryPrice - currentPrice) * quantity;
    }

    const pnlPercent = ((currentPrice - entryPrice) / entryPrice) * 100;

    // Update trade
    await pool.query(`
      UPDATE trades
      SET status = 'closed',
          current_price = $1,
          pnl = $2,
          pnl_percent = $3,
          closed_at = NOW()
      WHERE id = $4
    `, [currentPrice, pnl, pnlPercent, tradeId]);

    res.json({
      success: true,
      message: 'Trade closed successfully',
      trade: {
        id: tradeId,
        pnl,
        pnl_percent: pnlPercent
      }
    });
  } catch (error) {
    logger.error('Error closing trade:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to close trade'
    });
  }
});

module.exports = router;

