const {
  calculateRSI,
  calculateMACD,
  calculateEMA,
  calculateConfidenceScore
} = require('../../../src/services/aiEngine');

describe('AI Engine - Unit Tests', () => {
  describe('calculateRSI', () => {
    it('should calculate RSI correctly for oversold condition', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 - i * 0.5);
      const rsi = calculateRSI(prices, 14);
      expect(rsi).toBeLessThan(30);
      expect(rsi).toBeGreaterThan(0);
    });

    it('should calculate RSI correctly for overbought condition', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 0.5);
      const rsi = calculateRSI(prices, 14);
      expect(rsi).toBeGreaterThan(70);
      expect(rsi).toBeLessThan(100);
    });

    it('should return null for insufficient data', () => {
      const prices = [100, 101, 102];
      const rsi = calculateRSI(prices, 14);
      expect(rsi).toBeNull();
    });
  });

  describe('calculateMACD', () => {
    it('should calculate MACD correctly', () => {
      const prices = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i) * 5);
      const macd = calculateMACD(prices);
      expect(macd).toHaveProperty('macd');
      expect(macd).toHaveProperty('signal');
      expect(macd).toHaveProperty('histogram');
      expect(typeof macd.macd).toBe('number');
    });

    it('should return null for insufficient data', () => {
      const prices = Array.from({ length: 20 }, (_, i) => 100);
      const macd = calculateMACD(prices);
      expect(macd).toBeNull();
    });
  });

  describe('calculateEMA', () => {
    it('should calculate EMA correctly', () => {
      const prices = Array.from({ length: 30 }, (_, i) => 100 + i * 0.1);
      const ema = calculateEMA(prices, 12);
      expect(ema).toBeGreaterThan(0);
      expect(typeof ema).toBe('number');
    });

    it('should return null for insufficient data', () => {
      const prices = [100, 101, 102];
      const ema = calculateEMA(prices, 12);
      expect(ema).toBeNull();
    });
  });

  describe('calculateConfidenceScore', () => {
    it('should calculate high confidence for strong buy signals', () => {
      const indicators = {
        rsi: 25,
        macd: { histogram: 5 },
        emaFast: 100,
        emaSlow: 95,
        volume: { isHigh: true, ratio: 2 },
        trend: 'up',
        signalType: 'BUY'
      };
      const score = calculateConfidenceScore(indicators);
      expect(score).toBeGreaterThan(75);
      expect(score).toBeLessThanOrEqual(99);
    });

    it('should calculate minimum confidence for weak signals', () => {
      const indicators = {
        rsi: 50,
        macd: { histogram: 0 },
        emaFast: 100,
        emaSlow: 100,
        volume: { isHigh: false, ratio: 0.8 },
        trend: 'neutral',
        signalType: 'BUY'
      };
      const score = calculateConfidenceScore(indicators);
      expect(score).toBeGreaterThanOrEqual(75);
    });
  });
});

