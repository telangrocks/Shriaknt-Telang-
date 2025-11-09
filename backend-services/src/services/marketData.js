const ccxt = require('ccxt');
const { cacheMarketData } = require('./redis');
const logger = require('../utils/logger');

const exchanges = {};
let marketDataInterval = null;

// Initialize exchange instances
function initializeExchanges() {
  const supportedExchanges = (process.env.SUPPORTED_EXCHANGES || 'binance,bybit,okx').split(',');

  supportedExchanges.forEach(exchangeName => {
    try {
      const ExchangeClass = ccxt[exchangeName];
      if (ExchangeClass) {
        exchanges[exchangeName] = new ExchangeClass({
          enableRateLimit: true,
          timeout: 10000
        });
        logger.info(`Initialized ${exchangeName} exchange`);
      }
    } catch (error) {
      logger.error(`Failed to initialize ${exchangeName}:`, error);
    }
  });
}

// Get top trading pairs for an exchange
async function getTopPairs(exchangeName, limit = 50) {
  try {
    const exchange = exchanges[exchangeName];
    if (!exchange) {
      logger.warn(`Exchange ${exchangeName} not initialized`);
      return [];
    }

    const markets = await exchange.loadMarkets();
    const tickers = await exchange.fetchTickers();

    // Sort by 24h volume
    const sortedPairs = Object.entries(tickers)
      .map(([symbol, ticker]) => ({
        symbol,
        volume: ticker.quoteVolume || 0,
        price: ticker.last || 0
      }))
      .filter(pair => pair.volume > 0 && pair.price > 0)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit)
      .map(pair => pair.symbol);

    return sortedPairs;
  } catch (error) {
    logger.error(`Error getting top pairs for ${exchangeName}:`, error);
    return [];
  }
}

// Fetch OHLCV data for a pair
async function fetchOHLCV(exchangeName, symbol, timeframe = '1m', limit = 100) {
  try {
    const exchange = exchanges[exchangeName];
    if (!exchange) {
      return null;
    }

    const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
    
    if (!ohlcv || ohlcv.length === 0) {
      return null;
    }

    // Extract prices and volumes
    const prices = ohlcv.map(candle => candle[4]); // Close price
    const volumes = ohlcv.map(candle => candle[5]); // Volume
    const highs = ohlcv.map(candle => candle[2]); // High
    const lows = ohlcv.map(candle => candle[3]); // Low

    return {
      prices,
      volumes,
      highs,
      lows,
      ohlcv,
      currentPrice: prices[prices.length - 1],
      currentVolume: volumes[volumes.length - 1],
      timestamp: Date.now()
    };
  } catch (error) {
    logger.error(`Error fetching OHLCV for ${exchangeName}:${symbol}:`, error);
    return null;
  }
}

// Update market data for a specific pair
async function updateMarketData(exchangeName, symbol) {
  try {
    const marketData = await fetchOHLCV(exchangeName, symbol, '1m', 100);
    
    if (marketData) {
      // Cache the market data
      await cacheMarketData(exchangeName, symbol, marketData, 2);
      
      // Calculate additional metrics
      const prices = marketData.prices;
      const volumes = marketData.volumes;
      
      if (prices.length > 0) {
        const currentPrice = prices[prices.length - 1];
        const previousPrice = prices[prices.length - 2] || currentPrice;
        const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
        
        const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
        const currentVolume = volumes[volumes.length - 1] || 0;
        const volumeRatio = currentVolume / avgVolume;

        // Calculate volatility (standard deviation of price changes)
        const priceChanges = [];
        for (let i = 1; i < prices.length; i++) {
          priceChanges.push(Math.abs((prices[i] - prices[i - 1]) / prices[i - 1]));
        }
        const volatility = priceChanges.length > 0
          ? priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length
          : 0;

        marketData.metrics = {
          priceChange,
          volumeRatio,
          volatility,
          avgVolume,
          currentVolume
        };

        // Update cache with metrics
        await cacheMarketData(exchangeName, symbol, marketData, 2);
      }
    }

    return marketData;
  } catch (error) {
    logger.error(`Error updating market data for ${exchangeName}:${symbol}:`, error);
    return null;
  }
}

// Update market data for all active pairs
async function updateAllMarketData() {
  try {
    const { createPool } = require('../database/pool');
    const pool = createPool();

    // Get all active user pairs
    const pairsResult = await pool.query(`
      SELECT DISTINCT exchange_name, trading_pair
      FROM user_pairs
      WHERE is_active = true
      LIMIT 50
    `);

    if (pairsResult.rows.length === 0) {
      // If no user pairs, get top pairs from exchanges
      for (const exchangeName of Object.keys(exchanges)) {
        const topPairs = await getTopPairs(exchangeName, 10);
        for (const pair of topPairs) {
          await updateMarketData(exchangeName, pair);
        }
      }
      return;
    }

    // Update market data for each pair
    const updatePromises = pairsResult.rows.map(row =>
      updateMarketData(row.exchange_name, row.trading_pair)
    );

    await Promise.allSettled(updatePromises);
  } catch (error) {
    logger.error('Error updating all market data:', error);
  }
}

// Start market data service
function startMarketDataService() {
  initializeExchanges();

  const updateInterval = 2000; // 2 seconds

  logger.info(`Starting Market Data service with ${updateInterval}ms update interval`);

  // Initial update
  updateAllMarketData();

  // Periodic updates
  marketDataInterval = setInterval(() => {
    updateAllMarketData();
  }, updateInterval);
}

// Stop market data service
function stopMarketDataService() {
  if (marketDataInterval) {
    clearInterval(marketDataInterval);
    marketDataInterval = null;
    logger.info('Market Data service stopped');
  }
}

// Get market data for a specific pair
async function getMarketData(exchangeName, symbol) {
  return await updateMarketData(exchangeName, symbol);
}

module.exports = {
  startMarketDataService,
  stopMarketDataService,
  getMarketData,
  updateMarketData,
  getTopPairs,
  initializeExchanges
};

