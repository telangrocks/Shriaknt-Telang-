const { getFirebaseMessaging } = require('./firebaseAdmin')
const logger = require('../utils/logger')

async function fetchUserDeviceTokens(pool, userIds) {
  if (!userIds || userIds.length === 0) {
    return []
  }

  const result = await pool.query(
    `SELECT token FROM device_tokens WHERE user_id = ANY($1::uuid[])`,
    [userIds]
  )

  return result.rows.map((row) => row.token)
}

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
    const tokens = await fetchUserDeviceTokens(pool, userIds)

    if (tokens.length === 0) {
      return
    }

    const messaging = getFirebaseMessaging()
    const payload = {
      tokens,
      notification: {
        title: `${signal.signal_type === 'BUY' ? 'Buy' : 'Sell'} signal: ${signal.trading_pair}`,
        body: `Confidence ${signal.confidence_score}% • Entry ${signal.entry_price}`
      },
      data: {
        signalId: String(signal.id),
        exchange: signal.exchange_name,
        pair: signal.trading_pair,
        type: signal.signal_type || '',
        confidence: String(signal.confidence_score ?? ''),
        entryPrice: String(signal.entry_price ?? ''),
        stopLoss: String(signal.stop_loss ?? ''),
        takeProfit: String(signal.take_profit ?? '')
      }
    }

    const response = await messaging.sendEachForMulticast(payload)

    const failedTokens = []
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        failedTokens.push(tokens[idx])
        logger.warn(
          `Failed to deliver notification to token ${tokens[idx]}: ${res.error?.message}`
        )
      }
    })

    if (failedTokens.length > 0) {
      await pool.query(
        `DELETE FROM device_tokens WHERE token = ANY($1::text[])`,
        [failedTokens]
      )
    }
  } catch (error) {
    logger.error('Error sending trade notification:', error)
  }
}

module.exports = {
  sendTradeSignalNotification
}


