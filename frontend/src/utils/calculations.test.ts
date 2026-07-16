import { describe, it, expect } from 'vitest';
import {
  calculateMarkupPercent,
  calculateSuggestedPrice,
  calculateProfitMargin,
  reduceStock,
  splitPaymentAmount,
  SplitDefinition
} from './calculations';

describe('Financial and Stock Calculations', () => {

  describe('calculateMarkupPercent', () => {
    it('calculates markup correctly', () => {
      // cost: 100, price: 150, freight: 5%, tax: 10%
      // 150/100 = 1.5 -> 1.5 - 1 - 0.05 - 0.10 = 0.35 -> 35%
      expect(calculateMarkupPercent(100, 150, 5, 10)).toBeCloseTo(35);
    });

    it('returns 0 if cost is <= 0', () => {
      expect(calculateMarkupPercent(0, 150, 5, 10)).toBe(0);
      expect(calculateMarkupPercent(-50, 150, 5, 10)).toBe(0);
    });
  });

  describe('calculateSuggestedPrice', () => {
    it('calculates suggested price correctly', () => {
      // cost: 100, freight: 5%, tax: 10%, markup: 35%
      // 100 * (1 + 0.05 + 0.10 + 0.35) = 150
      expect(calculateSuggestedPrice(100, 5, 10, 35)).toBeCloseTo(150);
    });
    
    it('returns 0 if cost is negative', () => {
      expect(calculateSuggestedPrice(-100, 5, 10, 35)).toBe(0);
    });
  });

  describe('calculateProfitMargin', () => {
    it('calculates standard margin correctly', () => {
      // revenue 150, cost 100 -> profit 50 -> 50% margin
      expect(calculateProfitMargin(150, 100)).toBe(50);
    });

    it('returns 100 if cost is 0 and revenue > 0', () => {
      expect(calculateProfitMargin(150, 0)).toBe(100);
    });

    it('returns 0 if cost is <= 0 and revenue is <= 0', () => {
      expect(calculateProfitMargin(0, 0)).toBe(0);
    });
  });

  describe('reduceStock', () => {
    it('reduces stock normally', () => {
      expect(reduceStock(10, 3)).toBe(7);
      expect(reduceStock(5, 5)).toBe(0);
    });

    it('throws error on negative quantity', () => {
      expect(() => reduceStock(10, -1)).toThrow("Quantity sold cannot be negative");
    });

    it('throws error when selling more than in stock', () => {
      expect(() => reduceStock(3, 5)).toThrow("Insufficient stock");
    });
  });

  describe('splitPaymentAmount', () => {
    it('splits amount equally', () => {
      const splits: SplitDefinition[] = [
        { method: 'PIX', percentage: 50 },
        { method: 'CREDIT', percentage: 50 }
      ];
      const result = splitPaymentAmount(100, splits);
      expect(result).toEqual([
        { method: 'PIX', amount: 50 },
        { method: 'CREDIT', amount: 50 }
      ]);
    });

    it('fixes rounding errors', () => {
      // 100 distributed in 3 ways (33.333...)
      const splits: SplitDefinition[] = [
        { method: 'A', percentage: 33.33 },
        { method: 'B', percentage: 33.33 },
        { method: 'C', percentage: 33.33 } // Total ~99.99%
      ];
      const result = splitPaymentAmount(100, splits);
      const total = result.reduce((sum, r) => sum + r.amount, 0);
      expect(total).toBeCloseTo(100); // the algorithm absorbs cents to make it exactly 100
      expect(result[0].amount).toBeCloseTo(33.34); // The first one (tied largest) absorbs the diff
      expect(result[1].amount).toBeCloseTo(33.33);
      expect(result[2].amount).toBeCloseTo(33.33);
    });

    it('returns empty array for zero totalAmount', () => {
      const splits: SplitDefinition[] = [{ method: 'PIX', percentage: 100 }];
      expect(splitPaymentAmount(0, splits)).toEqual([]);
    });

    it('returns empty array if percentages are zero', () => {
      const splits: SplitDefinition[] = [{ method: 'PIX', percentage: 0 }];
      expect(splitPaymentAmount(100, splits)).toEqual([]);
    });
  });

});
