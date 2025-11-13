const logger = require('../utils/logger')

async function sendTradeSignalNotification(pool, signal) {
  try {
    const usersResult = await pool.query(
      `SELECT DISTINCT user_id FROM user_pairs WHERE exchange_name = $1 AND trading_pair = $2 AND is_active = true`,
      [signal.exchange_name, signal.trading_pair]
    )

    if (usersResult.rows.length === 0) {
      return
    }

    const userIds = usersResult.rows.map((row) => row.user_id)

    const title = `${signal.signal_type === 'BUY' ? 'Buy' : 'Sell'} signal: ${signal.trading_pair}`
    const body = `Confidence ${signal.confidence_score}% • Entry ${signal.entry_price}`
    const data = {
      signalId: String(signal.id),
      exchange: signal.exchange_name,
      pair: signal.trading_pair,
      type: signal.signal_type || '',
      confidence: String(signal.confidence_score ?? ''),
      entryPrice: String(signal.entry_price ?? ''),
      stopLoss: String(signal.stop_loss ?? ''),
      takeProfit: String(signal.take_profit ?? '')
    }

    await pool.query(
      `
        INSERT INTO notifications (user_id, title, body, data)
        SELECT uid, $2, $3, $4::jsonb
        FROM unnest($1::uuid[]) AS uid
      `,
      [userIds, title, body, JSON.stringify(data)]
    )

    logger.info(`Stored notifications for ${userIds.length} users subscribed to ${signal.trading_pair}.`)
  } catch (error) {
    logger.error('Error sending trade notification:', error)
  }
}

module.exports = {
  sendTradeSignalNotification
}


