
import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { YieldCurvePoint, Tenor } from '../types';
import { runPCABacktest, BacktestResult } from '../utils/backtester';

interface Props {
  data: YieldCurvePoint[];
  tenors: Tenor[];
}

const BacktestDashboard: React.FC<Props> = ({ data, tenors }) => {
  const [windowSize, setWindowSize] = useState(60);
  const [threshold, setThreshold] = useState(1.5);
  const [hasRun, setHasRun] = useState(false);

  const result: BacktestResult | null = useMemo(() => {
    if (!hasRun || data.length < windowSize) return null;
    return runPCABacktest(data, tenors, { windowSize, zScoreThreshold: threshold });
  }, [hasRun, data, tenors, windowSize, threshold]);

  const chartData = useMemo(() => {
    if (!result) return [];
    return result.dates.map((date, i) => ({
      date,
      equity: result.equityCurve[i]
    }));
  }, [result]);

  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col">
       <div className="flex justify-between items-start mb-6">
        <div>
           <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-emerald-400">Strategy Backtester</span>
              <span className="text-xs font-normal text-slate-400 border border-slate-600 px-2 py-0.5 rounded">PCA Mean Reversion</span>
           </h3>
           <p className="text-sm text-slate-400 mt-1">
             Simulates a strategy that buys "Cheap" bonds (Residual &gt; {threshold}σ) and sells "Rich" bonds.
           </p>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-slate-900/50 p-4 rounded-lg">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Lookback Window (Days)</label>
          <input 
            type="number" 
            value={windowSize}
            onChange={(e) => setWindowSize(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Z-Score Threshold</label>
          <input 
            type="number" 
            value={threshold}
            step="0.1"
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
          />
        </div>
        <div className="flex items-end">
          <button 
            onClick={() => setHasRun(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded transition-colors"
          >
            Run Backtest
          </button>
        </div>
      </div>

      {/* Results */}
      {result ? (
        <div className="flex-grow flex flex-col gap-6 overflow-hidden">
           {/* Summary Stats */}
           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-slate-700/30 p-3 rounded border border-slate-600">
                <div className="text-xs text-slate-400">Total Return</div>
                <div className={`text-xl font-mono font-bold ${result.stats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {result.stats.totalReturn.toFixed(0)}
                </div>
              </div>
              <div className="bg-slate-700/30 p-3 rounded border border-slate-600">
                <div className="text-xs text-slate-400">Sharpe Ratio</div>
                <div className="text-xl font-mono font-bold text-blue-400">
                  {result.stats.sharpeRatio.toFixed(2)}
                </div>
              </div>
              <div className="bg-slate-700/30 p-3 rounded border border-slate-600">
                <div className="text-xs text-slate-400">Max Drawdown</div>
                <div className="text-xl font-mono font-bold text-red-400">
                  {result.stats.maxDrawdown.toFixed(0)}
                </div>
              </div>
               <div className="bg-slate-700/30 p-3 rounded border border-slate-600">
                <div className="text-xs text-slate-400">Win Rate</div>
                <div className="text-xl font-mono font-bold text-emerald-400">
                  {(result.stats.winRate * 100).toFixed(0)}%
                </div>
              </div>
              <div className="bg-slate-700/30 p-3 rounded border border-slate-600">
                <div className="text-xs text-slate-400">Total Trades</div>
                <div className="text-xl font-mono font-bold text-slate-200">
                  {result.stats.totalTrades}
                </div>
              </div>
           </div>

           {/* Equity Curve */}
           <div className="h-[180px] border border-slate-700 bg-slate-900/30 rounded-lg p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} minTickGap={50} />
                  <YAxis stroke="#94a3b8" tick={{fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="equity" stroke="#34d399" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
           </div>
           
           {/* Trades Log */}
           <div className="flex-grow overflow-hidden flex flex-col">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Trade Log</h4>
              <div className="flex-grow overflow-auto custom-scrollbar border border-slate-700 rounded-lg bg-slate-900/30">
                  <table className="w-full text-xs text-left text-slate-300">
                      <thead className="bg-slate-800 text-slate-400 sticky top-0">
                          <tr>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Tenor</th>
                              <th className="px-3 py-2">Action</th>
                              <th className="px-3 py-2 text-right">Entry</th>
                              <th className="px-3 py-2 text-right">Exit</th>
                              <th className="px-3 py-2 text-right">PnL</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                          {[...result.trades].reverse().map((trade, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/20">
                                  <td className="px-3 py-2 font-mono whitespace-nowrap">{trade.date}</td>
                                  <td className="px-3 py-2 font-mono text-indigo-300">{trade.tenor}</td>
                                  <td className="px-3 py-2">
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                          trade.type === 'BUY' ? 'bg-emerald-900/50 text-emerald-400' :
                                          trade.type === 'SELL' ? 'bg-red-900/50 text-red-400' :
                                          'bg-slate-700 text-slate-300'
                                      }`}>
                                          {trade.type}
                                      </span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">{trade.entryYield.toFixed(3)}%</td>
                                  <td className="px-3 py-2 text-right font-mono">
                                      {trade.exitYield ? `${trade.exitYield.toFixed(3)}%` : '-'}
                                  </td>
                                  <td className={`px-3 py-2 text-right font-mono font-bold ${
                                      (trade.pnl || 0) > 0 ? 'text-emerald-400' : 
                                      (trade.pnl || 0) < 0 ? 'text-red-400' : 'text-slate-500'
                                  }`}>
                                      {trade.pnl ? trade.pnl.toFixed(1) : '-'}
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
           </div>
        </div>
      ) : (
        <div className="flex-grow flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
           Click 'Run Backtest' to simulate strategy
        </div>
      )}
    </div>
  );
};

export default BacktestDashboard;
