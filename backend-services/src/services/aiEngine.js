const { createPool } = require('../database/pool');
const { cacheAISignal, getCachedMarketData } = require('./redis');
const logger = require('../utils/logger');
const { sendTradeSignalNotification } = require('./notifications');

let aiServiceInterval = null;

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  let gains = 0;
  let losses = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) gains += changes[i];
    else losses += Math.abs(changes[i]);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return rsi;
}

// Calculate MACD
function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  if (prices.length < slowPeriod + signalPeriod) return null;

  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macdLine = fastEMA - slowEMA;

  // Calculate signal line (EMA of MACD)
  const macdValues = [macdLine];
  const signalLine = calculateEMA(macdValues, signalPeriod);

  return {
    macd: macdLine,
    signal: signalLine,
    histogram: macdLine - signalLine
  };
}

// Calculate EMA (Exponential Moving Average)
function calculateEMA(prices, period) {
  if (prices.length < period) return null;

  const multiplier = 2 / (period + 1);
  let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

// Calculate volume analysis
function analyzeVolume(volumes, currentVolume) {
  if (volumes.length === 0) return null;

  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const volumeRatio = currentVolume / avgVolume;

  return {
    average: avgVolume,
    current: currentVolume,
    ratio: volumeRatio,
    isHigh: volumeRatio > 1.5,
    isLow: volumeRatio < 0.5
  };
}

// Calculate confidence score based on multiple indicators
function calculateConfidenceScore(indicators) {
  let score = 0;
  let factors = 0;

  // RSI contribution (0-30 points)
  if (indicators.rsi !== null) {
    if ((indicators.rsi < 30 && indicators.signalType === 'BUY') ||
        (indicators.rsi > 70 && indicators.signalType === 'SELL')) {
      score += 30;
    } else if ((indicators.rsi < 40 && indicators.signalType === 'BUY') ||
               (indicators.rsi > 60 && indicators.signalType === 'SELL')) {
      score += 20;
    } else {
      score += 10;
    }
    factors++;
  }

  // MACD contribution (0-25 points)
  if (indicators.macd && indicators.macd.histogram) {
    if ((indicators.macd.histogram > 0 && indicators.signalType === 'BUY') ||
        (indicators.macd.histogram < 0 && indicators.signalType === 'SELL')) {
      score += 25;
    } else {
      score += 10;
    }
    factors++;
  }

  // EMA contribution (0-20 points)
  if (indicators.emaFast && indicators.emaSlow) {
    if ((indicators.emaFast > indicators.emaSlow && indicators.signalType === 'BUY') ||
        (indicators.emaFast < indicators.emaSlow && indicators.signalType === 'SELL')) {
      score += 20;
    } else {
      score += 5;
    }
    factors++;
  }

  // Volume contribution (0-15 points)
  if (indicators.volume && indicators.volume.isHigh) {
    score += 15;
  } else if (indicators.volume && indicators.volume.ratio > 1.2) {
    score += 10;
  } else {
    score += 5;
    factors++;
  }

  // Trend contribution (0-10 points)
  if (indicators.trend) {
    if ((indicators.trend === 'up' && indicators.signalType === 'BUY') ||
        (indicators.trend === 'down' && indicators.signalType === 'SELL')) {
      score += 10;
    } else {
      score += 5;
    }
    factors++;
  }

  // Normalize to 75-99 range
  if (factors > 0) {
    const normalizedScore = Math.min(99, Math.max(75, Math.round(score)));
    return normalizedScore;
  }

  return 75; // Minimum confidence
}

// Generate AI trading signal
async function generateSignal(exchange, pair, marketData) {
  try {
    if (!marketData || !marketData.prices || marketData.prices.length < 50) {
      return null;
    }

    const prices = marketData.prices;
    const volumes = marketData.volumes || [];
    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1] || 0;

    // Calculate indicators
    const rsi = calculateRSI(prices, 14);
    const macd = calculateMACD(prices);
    const emaFast = calculateEMA(prices, 9);
    const emaSlow = calculateEMA(prices, 21);
    const volumeAnalysis = analyzeVolume(volumes, currentVolume);

    // Determine trend
    let trend = 'neutral';
    if (emaFast && emaSlow) {
      if (emaFast > emaSlow) trend = 'up';
      else if (emaFast < emaSlow) trend = 'down';
    }

    // Determine signal type
    let signalType = null;
    let entryPrice = currentPrice;
    let stopLoss = null;
    let takeProfit = null;

    // BUY signal conditions
    const buyConditions = [
      rsi && rsi < 40,
      macd && macd.histogram > 0,
      emaFast && emaSlow && emaFast > emaSlow,
      volumeAnalysis && volumeAnalysis.isHigh,
      trend === 'up'
    ];

    // SELL signal conditions
    const sellConditions = [
      rsi && rsi > 60,
      macd && macd.histogram < 0,
      emaFast && emaSlow && emaFast < emaSlow,
      volumeAnalysis && volumeAnalysis.isHigh,
      trend === 'down'
    ];

    const buyScore = buyConditions.filter(Boolean).length;
    const sellScore = sellConditions.filter(Boolean).length;

    if (buyScore >= 3) {
      signalType = 'BUY';
      stopLoss = currentPrice * (1 - (parseFloat(process.env.DEFAULT_STOP_LOSS_PERCENT) || 2) / 100);
      takeProfit = currentPrice * (1 + (parseFloat(process.env.DEFAULT_TAKE_PROFIT_PERCENT) || 5) / 100);
    } else if (sellScore >= 3) {
      signalType = 'SELL';
      stopLoss = currentPrice * (1 + (parseFloat(process.env.DEFAULT_STOP_LOSS_PERCENT) || 2) / 100);
      takeProfit = currentPrice * (1 - (parseFloat(process.env.DEFAULT_TAKE_PROFIT_PERCENT) || 5) / 100);
    }

    if (!signalType) {
      return null;
    }

    // Calculate confidence score
    const indicators = {
      rsi,
      macd,
      emaFast,
      emaSlow,
      volume: volumeAnalysis,
      trend,
      signalType
    };

    const confidenceScore = calculateConfidenceScore(indicators);

    // Only generate signal if confidence meets minimum threshold
    const minConfidence = parseInt(process.env.AI_MIN_CONFIDENCE) || 75;
    if (confidenceScore < minConfidence) {
      return null;
    }

    // Create signal object
    const signal = {
      exchange_name: exchange,
      trading_pair: pair,
      signal_type: signalType,
      entry_price: parseFloat(entryPrice.toFixed(8)),
      stop_loss: parseFloat(stopLoss.toFixed(8)),
      take_profit: parseFloat(takeProfit.toFixed(8)),
      confidence_score: confidenceScore,
      indicators: {
        rsi,
        macd: macd ? {
          macd: parseFloat(macd.macd.toFixed(8)),
          signal: parseFloat(macd.signal.toFixed(8)),
          histogram: parseFloat(macd.histogram.toFixed(8))
        } : null,
        ema_fast: emaFast ? parseFloat(emaFast.toFixed(8)) : null,
        ema_slow: emaSlow ? parseFloat(emaSlow.toFixed(8)) : null,
        volume: volumeAnalysis,
        trend
      },
      expires_at: new Date(Date.now() + (parseInt(process.env.AI_SIGNAL_EXPIRY) || 300000))
    };

    // Save to database
    const pool = createPool();
    const result = await pool.query(`
      INSERT INTO ai_signals (
        exchange_name, trading_pair, signal_type, entry_price, stop_loss, take_profit,
        confidence_score, indicators, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      signal.exchange_name,
      signal.trading_pair,
      signal.signal_type,
      signal.entry_price,
      signal.stop_loss,
      signal.take_profit,
      signal.confidence_score,
      JSON.stringify(signal.indicators),
      signal.expires_at
    ]);

    signal.id = result.rows[0].id;

    // Cache the signal
    await cacheAISignal(signal.id, signal);

    // Notify subscribed users
    await sendTradeSignalNotification(pool, signal);

    logger.info(`Generated ${signalType} signal for ${exchange}:${pair} with confidence ${confidenceScore}%`);

    return signal;
  } catch (error) {
    logger.error(`Error generating signal for ${exchange}:${pair}:`, error);
    return null;
  }
}

// Scan markets and generate signals
async function scanMarkets() {
  try {
    const pool = createPool();
    
    // Get active user pairs
    const pairsResult = await pool.query(`
      SELECT DISTINCT exchange_name, trading_pair
      FROM user_pairs
      WHERE is_active = true
      LIMIT 50
    `);

    if (pairsResult.rows.length === 0) {
      return;
    }

    // Process each pair
    for (const row of pairsResult.rows) {
      const { exchange_name, trading_pair } = row;
      
      // Get cached market data
      const marketData = await getCachedMarketData(exchange_name, trading_pair);
      
      if (marketData) {
        // Check if signal already exists and is still active
        const existingSignal = await pool.query(`
          SELECT id FROM ai_signals
          WHERE exchange_name = $1 AND trading_pair = $2
          AND is_active = true AND expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT 1
        `, [exchange_name, trading_pair]);

        // Only generate new signal if none exists
        if (existingSignal.rows.length === 0) {
          await generateSignal(exchange_name, trading_pair, marketData);
        }
      }
    }
  } catch (error) {
    logger.error('Error scanning markets:', error);
  }
}

// Start AI service
function startAIService() {
  const scanInterval = parseInt(process.env.AI_SCAN_INTERVAL) || 5000;

  logger.info(`Starting AI Engine service with ${scanInterval}ms scan interval`);

  // Initial scan
  scanMarkets();

  // Periodic scans
  aiServiceInterval = setInterval(() => {
    scanMarkets();
  }, scanInterval);

  // Clean up expired signals
  setInterval(async () => {
    try {
      const pool = createPool();
      await pool.query(`
        UPDATE ai_signals
        SET is_active = false
        WHERE expires_at < NOW() AND is_active = true
      `);
    } catch (error) {
      logger.error('Error cleaning up expired signals:', error);
    }
  }, 60000); // Every minute
}

// Stop AI service
function stopAIService() {
  if (aiServiceInterval) {
    clearInterval(aiServiceInterval);
    aiServiceInterval = null;
    logger.info('AI Engine service stopped');
  }
}

module.exports = {
  startAIService,
  stopAIService,
  generateSignal,
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateConfidenceScore
};

