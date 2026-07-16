/**
 * Pure functions for financial and stock calculations.
 * By keeping these functions free from UI state or Firebase dependencies,
 * we ensure they are 100% deterministically testable.
 */

export function calculateMarkupPercent(cost: number, price: number, freightPercent: number, taxPercent: number): number {
  if (cost <= 0) return 0;
  return ((price / cost) - 1 - (freightPercent / 100) - (taxPercent / 100)) * 100;
}

export function calculateSuggestedPrice(cost: number, freightPercent: number, taxPercent: number, markupPercent: number): number {
  if (cost < 0) return 0;
  return cost * (1 + (freightPercent / 100) + (taxPercent / 100) + (markupPercent / 100));
}

export function calculateProfitMargin(revenue: number, cost: number): number {
  if (cost <= 0 && revenue > 0) return 100; // Edge case: zero cost, infinite margin (clamped to 100%)
  if (cost <= 0) return 0;
  const profit = revenue - cost;
  return (profit / cost) * 100;
}

export function reduceStock(currentStock: number, quantitySold: number): number {
  if (quantitySold < 0) throw new Error("Quantity sold cannot be negative");
  if (currentStock < quantitySold) throw new Error("Insufficient stock");
  return currentStock - quantitySold;
}

export interface SplitDefinition {
  method: string;
  percentage: number;
}

export interface SplitResult {
  method: string;
  amount: number;
}

export function splitPaymentAmount(totalAmount: number, splits: SplitDefinition[]): SplitResult[] {
  const totalPercentage = splits.reduce((sum, split) => sum + split.percentage, 0);
  if (totalPercentage === 0 || totalAmount <= 0) return [];
  
  // Distribute based on exact percentages
  const result: SplitResult[] = splits.map(split => ({
    method: split.method,
    amount: parseFloat(((totalAmount * (split.percentage / totalPercentage))).toFixed(2))
  }));

  // Fix rounding errors (cents) by adjusting the largest split
  const currentTotal = result.reduce((sum, split) => sum + split.amount, 0);
  const diff = parseFloat((totalAmount - currentTotal).toFixed(2));
  
  if (diff !== 0 && result.length > 0) {
    // Find index of the largest amount to absorb the cents difference
    let largestIdx = 0;
    for (let i = 1; i < result.length; i++) {
      if (result[i].amount > result[largestIdx].amount) {
        largestIdx = i;
      }
    }
    result[largestIdx].amount = parseFloat((result[largestIdx].amount + diff).toFixed(2));
  }

  return result;
}
