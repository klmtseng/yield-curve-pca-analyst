
import { PCAResult, Tenor, YieldCurvePoint } from '../types';
import { performPCA } from './math';

export interface Trade {
  date: string; // Action date (synonymous with exitDate for CLOSE, entryDate for BUY/SELL)
  entryDate: string; // The date the position was opened
  exitDate?: string; // The date the position was closed (undefined if open)
  tenor: Tenor;
  type: 'BUY' | 'SELL' | 'CLOSE';
  entryYield: number;
  exitYield?: number;
  pricePnL?: number; // PnL from Yield Move (Duration/Convexity)
  carryPnL?: number; // PnL from Coupon/Carry
  totalPnL?: number; // Sum
  daysHeld?: number;
}

export interface BacktestResult {
  dates: string[];
  equityCurve: number[]; 
  trades: Trade[];
  stats: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
  };
}

// Estimates for Par Bonds in typical rate environment
const DURATION_MAP: Record<string, number> = {
  '1M': 0.08, '3M': 0.25, '6M': 0.5,
  '1Y': 0.98, '2Y': 1.95, '3Y': 2.85,
  '5Y': 4.55, '7Y': 6.40, '10Y': 8.90,
  '20Y': 16.5, '30Y': 19.5
};

// Approximate Convexity (2nd Order sensitivity)
const CONVEXITY_MAP: Record<string, number> = {
  '1M': 0, '3M': 0, '6M': 0,
  '1Y': 0.02, '2Y': 0.05, '3Y': 0.12,
  '5Y': 0.35, '7Y': 0.65, '10Y': 1.10,
  '20Y': 3.8, '30Y': 5.8
};

export const runPCABacktest = (
  data: YieldCurvePoint[],
  tenors: Tenor[],
  params: {
    windowSize: number;
    zScoreThreshold: number;
  }
): BacktestResult => {
  const { windowSize, zScoreThreshold } = params;
  if (data.length < windowSize + 1) throw new Error("Not enough data for backtest");

  const trades: Trade[] = [];
  const equityCurve: number[] = [0]; 
  const dates: string[] = [data[windowSize-1].date];

  // Track Positions
  interface Position {
    entryYield: number;
    entryDateIndex: number; 
    entryDate: string; // Store string for easy access
    direction: number; // 1 (Long) or -1 (Short)
    accumulatedCarry: number; 
    lastYield: number; // For daily MTM
  }
  
  const activePositions: Map<Tenor, Position> = new Map();

  // Loop day by day
  for (let i = windowSize; i < data.length; i++) {
    const today = data[i];
    const prev = data[i-1];
    
    let dailyTotalPnL = 0;

    // 1. UPDATE EXISTING POSITIONS (Mark to Market + Carry)
    activePositions.forEach((pos, tenor) => {
      const currentYield = Number(today[tenor]);
      const prevYield = pos.lastYield; // Use last yield we marked to
      const yieldChange = currentYield - prevYield; // e.g. 0.05
      
      const duration = DURATION_MAP[tenor] || 5;
      const convexity = CONVEXITY_MAP[tenor] || 0;

      // A. Price PnL (Duration + Convexity)
      // Linear: -Dur * dY
      // Convexity: +0.5 * Conv * (dY^2)
      // Note: Convexity is always positive for Long, negative for Short (technically bond is convex, so long benefits from big moves)
      
      // yieldChange is in PERCENT (e.g. 4.5 to 4.6 is 0.1). 
      // Formula usually takes decimal (0.001).
      // Let's standardise on Basis Points (bps) for output.
      
      const dY_decimal = yieldChange / 100;
      
      const priceChangePct = (-1 * duration * dY_decimal) + (0.5 * convexity * (dY_decimal ** 2));
      
      // Convert to Basis Points of Return (1% = 100bps)
      const dailyPricePnL_bps = priceChangePct * 10000 * pos.direction;
      
      // B. Carry PnL (Daily Accrual)
      // Earn yield if Long, Pay if Short
      // Approx: Yield / 360 * 1 Day
      const dailyCarry_bps = (pos.lastYield / 100) / 360 * 10000 * pos.direction;
      
      pos.accumulatedCarry += dailyCarry_bps;
      pos.lastYield = currentYield;

      dailyTotalPnL += (dailyPricePnL_bps + dailyCarry_bps);
    });

    equityCurve.push(equityCurve[equityCurve.length - 1] + dailyTotalPnL);
    dates.push(today.date);

    // 2. PCA & SIGNALS
    const windowData = data.slice(i - windowSize, i);
    const pca = performPCA(windowData, tenors);
    const { meanVector, eigenvectors, scores } = pca;

    tenors.forEach((tenor, tIdx) => {
      const actualYield = Number(today[tenor]);
      
      // Calculate Residual
      const centeredRow = tenors.map((t, idx) => Number(today[t]) - meanVector[idx]);
      let modelYield = meanVector[tIdx];
      for (let k = 0; k < 3; k++) {
        const scoreK = centeredRow.reduce((sum, val, idx) => sum + val * eigenvectors[k][idx], 0);
        modelYield += scoreK * eigenvectors[k][tIdx];
      }
      const residual = actualYield - modelYield;

      // Calculate Z-Score
      let sumSqRes = 0;
      for(let w=0; w<windowData.length; w++) {
         const wScores = scores[w];
         let wModel = meanVector[tIdx];
         for(let k=0; k<3; k++) wModel += wScores[k] * eigenvectors[k][tIdx];
         const wRes = Number(windowData[w][tenor]) - wModel;
         sumSqRes += wRes * wRes;
      }
      const stdDev = Math.sqrt(sumSqRes / windowSize);
      const zScore = stdDev === 0 ? 0 : residual / stdDev;

      // 3. TRADE LOGIC
      const existingPos = activePositions.get(tenor);

      // Entry
      if (!existingPos) {
        if (zScore > zScoreThreshold) {
           // CHEAP -> BUY
           activePositions.set(tenor, { 
             entryYield: actualYield, 
             entryDateIndex: i,
             entryDate: today.date, 
             direction: 1,
             accumulatedCarry: 0,
             lastYield: actualYield
           });
           trades.push({ 
             date: today.date, 
             entryDate: today.date,
             tenor, 
             type: 'BUY', 
             entryYield: actualYield 
           });
        } else if (zScore < -zScoreThreshold) {
           // RICH -> SELL
           activePositions.set(tenor, { 
             entryYield: actualYield, 
             entryDateIndex: i, 
             entryDate: today.date,
             direction: -1,
             accumulatedCarry: 0,
             lastYield: actualYield
           });
           trades.push({ 
             date: today.date, 
             entryDate: today.date,
             tenor, 
             type: 'SELL', 
             entryYield: actualYield 
           });
        }
      } 
      // Exit
      else {
        const isLong = existingPos.direction === 1;
        if ((isLong && zScore < 0) || (!isLong && zScore > 0)) {
           // Close Position
           // Calculate Final Total PnL for this specific trade
           
           // Re-calculate total price PnL from start to finish
           const totalYieldChange = actualYield - existingPos.entryYield;
           const dY_decimal = totalYieldChange / 100;
           
           const duration = DURATION_MAP[tenor] || 5;
           const convexity = CONVEXITY_MAP[tenor] || 0;
           
           const priceChangePct = (-1 * duration * dY_decimal) + (0.5 * convexity * (dY_decimal ** 2));
           const totalPricePnL = priceChangePct * 10000 * existingPos.direction;
           
           const totalCarryPnL = existingPos.accumulatedCarry;
           
           trades.push({
             date: today.date,
             entryDate: existingPos.entryDate,
             exitDate: today.date,
             tenor,
             type: 'CLOSE',
             entryYield: existingPos.entryYield,
             exitYield: actualYield,
             pricePnL: totalPricePnL,
             carryPnL: totalCarryPnL,
             totalPnL: totalPricePnL + totalCarryPnL,
             daysHeld: i - existingPos.entryDateIndex
           });
           
           activePositions.delete(tenor);
        }
      }
    });
  }

  // Calculate Stats
  const returns = equityCurve.map((val, i) => i === 0 ? 0 : val - equityCurve[i-1]);
  const avgReturn = returns.reduce((a,b)=>a+b,0) / returns.length;
  const stdReturn = Math.sqrt(returns.reduce((a,b)=>a + Math.pow(b-avgReturn, 2), 0) / returns.length);
  const sharpe = stdReturn === 0 ? 0 : (avgReturn / stdReturn) * Math.sqrt(252); 

  let peak = -Infinity;
  let maxDD = 0;
  equityCurve.forEach(val => {
    if (val > peak) peak = val;
    const dd = peak - val;
    if (dd > maxDD) maxDD = dd;
  });

  const closedTrades = trades.filter(t => t.type === 'CLOSE');
  const winningTrades = closedTrades.filter(t => (t.totalPnL || 0) > 0);
  const winRate = closedTrades.length > 0 ? winningTrades.length / closedTrades.length : 0;

  return {
    dates,
    equityCurve,
    trades,
    stats: {
      totalReturn: equityCurve[equityCurve.length - 1],
      sharpeRatio: sharpe,
      maxDrawdown: maxDD,
      winRate: winRate,
      totalTrades: trades.length
    }
  };
};
