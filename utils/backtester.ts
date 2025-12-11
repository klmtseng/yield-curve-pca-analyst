
import { PCAResult, Tenor, YieldCurvePoint } from '../types';
import { performPCA } from './math';

export interface Trade {
  date: string;
  tenor: Tenor;
  type: 'BUY' | 'SELL' | 'CLOSE'; // Buy = Long Bond (Rates Down), Sell = Short Bond (Rates Up)
  entryYield: number;
  exitYield?: number;
  pnl?: number; // In basis points approx
}

export interface BacktestResult {
  dates: string[];
  equityCurve: number[]; // Cumulative PnL
  trades: Trade[];
  stats: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    totalTrades: number;
  };
}

// Approximate Duration for simple PnL calculation
// Change in Price % approx = -Duration * Change in Yield
const DURATION_MAP: Record<string, number> = {
  '1M': 0.08, '3M': 0.25, '6M': 0.5,
  '1Y': 0.95, '2Y': 1.9, '3Y': 2.8,
  '5Y': 4.6, '7Y': 6.4, '10Y': 8.8,
  '20Y': 17.0, '30Y': 20.0
};

export const runPCABacktest = (
  data: YieldCurvePoint[],
  tenors: Tenor[],
  params: {
    windowSize: number; // e.g., 60 days
    zScoreThreshold: number; // e.g., 1.5
  }
): BacktestResult => {
  const { windowSize, zScoreThreshold } = params;
  if (data.length < windowSize + 1) throw new Error("Not enough data for backtest");

  const trades: Trade[] = [];
  const equityCurve: number[] = [0]; // Start at 0 PnL
  const dates: string[] = [data[windowSize-1].date];

  // Positions: Map<Tenor, { entryYield: number, direction: 1 (Long) | -1 (Short) }>
  const activePositions: Map<Tenor, { entryYield: number, direction: number }> = new Map();

  // We loop day by day
  for (let i = windowSize; i < data.length; i++) {
    const today = data[i];
    const prevDate = data[i-1].date;
    
    // 1. Calculate Daily PnL on existing positions
    let dailyPnL = 0;
    activePositions.forEach((pos, tenor) => {
      const currentYield = Number(today[tenor]);
      const prevYield = Number(data[i-1][tenor]);
      const yieldChange = currentYield - prevYield; // e.g. 0.05%
      
      // PnL = -Duration * Change * Direction * Scale
      // Scale: Let's assume 1 unit of risk per position
      const duration = DURATION_MAP[tenor] || 5;
      
      // If Long Bond (Direction 1): Rates Down = Profit. 
      // PnL = -1 * (YieldCurrent - YieldPrev) * Duration
      const pnl = -1 * yieldChange * duration * pos.direction * 100; // *100 for arbitrary sizing
      dailyPnL += pnl;
    });

    equityCurve.push(equityCurve[equityCurve.length - 1] + dailyPnL);
    dates.push(today.date);

    // 2. Train PCA on Window (Lookback)
    const windowData = data.slice(i - windowSize, i); // Up to yesterday
    const pca = performPCA(windowData, tenors);
    
    // 3. Calculate Residuals for TODAY using training from YESTERDAY
    // We project Today's yields onto Yesterday's Model
    const { meanVector, eigenvectors, scores } = pca;
    
    tenors.forEach((tenor, tIdx) => {
      const actualYield = Number(today[tenor]);
      
      // Calculate implied model yield
      // First, get scores for today based on yesterday's vectors
      // Score_k = Sum( (Yield_j - Mean_j) * Vector_k_j )
      const centeredRow = tenors.map((t, idx) => Number(today[t]) - meanVector[idx]);
      
      let modelYield = meanVector[tIdx];
      
      // Use top 3 components
      for (let k = 0; k < 3; k++) {
        const scoreK = centeredRow.reduce((sum, val, idx) => sum + val * eigenvectors[k][idx], 0);
        modelYield += scoreK * eigenvectors[k][tIdx];
      }

      const residual = actualYield - modelYield; // Cheap if > 0, Rich if < 0
      
      // Calculate historical residual std dev from the window for Z-Score
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

      // 4. Signal Generation
      const existingPos = activePositions.get(tenor);

      // Entry Logic
      if (!existingPos) {
        if (zScore > zScoreThreshold) {
          // CHEAP -> Yield too high -> Buy Bond (Bet on yield fall) -> Long
          activePositions.set(tenor, { entryYield: actualYield, direction: 1 });
          trades.push({ date: today.date, tenor, type: 'BUY', entryYield: actualYield });
        } else if (zScore < -zScoreThreshold) {
          // RICH -> Yield too low -> Sell Bond (Bet on yield rise) -> Short
          activePositions.set(tenor, { entryYield: actualYield, direction: -1 });
          trades.push({ date: today.date, tenor, type: 'SELL', entryYield: actualYield });
        }
      } 
      // Exit Logic (Mean Reversion)
      else {
        const isLong = existingPos.direction === 1;
        // Close if Z-score flips sign or goes to neutral
        if ((isLong && zScore < 0) || (!isLong && zScore > 0)) {
          const duration = DURATION_MAP[tenor] || 5;
          // Calculate Realized PnL
          // PnL = -Duration * (ExitYield - EntryYield) * Direction
          const realizedPnL = -1 * (actualYield - existingPos.entryYield) * duration * existingPos.direction * 100;
          
          activePositions.delete(tenor);
          trades.push({ 
            date: today.date, 
            tenor, 
            type: 'CLOSE', 
            entryYield: existingPos.entryYield, 
            exitYield: actualYield,
            pnl: realizedPnL
          });
        }
      }
    });
  }

  // Calculate Stats
  const returns = equityCurve.map((val, i) => i === 0 ? 0 : val - equityCurve[i-1]);
  const avgReturn = returns.reduce((a,b)=>a+b,0) / returns.length;
  const stdReturn = Math.sqrt(returns.reduce((a,b)=>a + Math.pow(b-avgReturn, 2), 0) / returns.length);
  const sharpe = stdReturn === 0 ? 0 : (avgReturn / stdReturn) * Math.sqrt(252); // Annualized

  // Max Drawdown
  let peak = -Infinity;
  let maxDD = 0;
  equityCurve.forEach(val => {
    if (val > peak) peak = val;
    const dd = peak - val;
    if (dd > maxDD) maxDD = dd;
  });

  // Win Rate
  const closedTrades = trades.filter(t => t.type === 'CLOSE');
  const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0);
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
