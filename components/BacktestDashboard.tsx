
import React, { useState, useMemo, useEffect } from 'react';
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

  // Simulation Period State
  const [simStartDate, setSimStartDate] = useState('');
  const [simEndDate, setSimEndDate] = useState('');

  // Reset simulation dates when master data changes
  useEffect(() => {
    if (data.length > 0) {
      setSimStartDate(data[0].date);
      setSimEndDate(data[data.length - 1].date);
    }
  }, [data]);

  const result: BacktestResult | null = useMemo(() => {
    if (!hasRun || data.length < windowSize) return null;
    
    // Filter data for simulation
    const simData = data.filter(d => d.date >= simStartDate && d.date <= simEndDate);
    
    if (simData.length <= windowSize) return null;

    return runPCABacktest(simData, tenors, { windowSize, zScoreThreshold: threshold });
  }, [hasRun, data, tenors, windowSize, threshold, simStartDate, simEndDate]);

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
             Buys "Cheap" bonds (Positive Residual) and sells "Rich" bonds. Returns in Basis Points.
           </p>
        </div>
        <div className="group relative">
           <button className="text-slate-400 hover:text-white">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
           </button>
           <div className="absolute right-0 top-6 w-72 bg-slate-900 border border-slate-600 p-4 rounded shadow-xl z-20 hidden group-hover:block">
              <h4 className="font-bold text-slate-200 mb-2">PnL Methodology</h4>
              <p className="text-xs text-slate-400 mb-2">
                <strong>1. Price PnL:</strong> Calculated analytically using Modified Duration and Convexity approximation based on yield changes.
              </p>
              <p className="text-xs text-slate-400">
                <strong>2. Carry PnL:</strong> Daily coupon accrual calculated as <em>Yield / 360</em>. Long positions earn carry; Short positions pay carry.
              </p>
           </div>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 bg-slate-900/50 p-4 rounded-lg">
        {/* Date Range Inputs */}
        <div className="md:col-span-1">
           <label className="block text-xs text-slate-400 mb-1">Simulation Start</label>
           <input 
              type="date" 
              value={simStartDate}
              min={data[0]?.date}
              max={simEndDate}
              onChange={(e) => setSimStartDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs"
           />
        </div>
        <div className="md:col-span-1">
           <label className="block text-xs text-slate-400 mb-1">Simulation End</label>
           <input 
              type="date" 
              value={simEndDate}
              min={simStartDate}
              max={data[data.length-1]?.date}
              onChange={(e) => setSimEndDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs"
           />
        </div>

        <div className="md:col-span-1 flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Window (Days)</label>
              <input 
                type="number" 
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Z-Score Thresh</label>
              <input 
                type="number" 
                value={threshold}
                step="0.1"
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white"
              />
            </div>
        </div>
        
        <div className="flex items-end">
          <button 
            onClick={() => setHasRun(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded transition-colors text-sm"
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
                  {result.stats.totalReturn.toFixed(0)} <span className="text-xs text-slate-500">bps</span>
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
                  {result.stats.maxDrawdown.toFixed(0)} <span className="text-xs text-slate-500">bps</span>
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
                  <YAxis stroke="#94a3b8" tick={{fontSize: 10}} label={{ value: 'Cum PnL (bps)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 10 }}/>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
                    formatter={(val: number) => [`${val.toFixed(0)} bps`, 'PnL']}
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
                              <th className="px-3 py-2">Entry Date</th>
                              <th className="px-3 py-2">Exit Date</th>
                              <th className="px-3 py-2">Tenor</th>
                              <th className="px-3 py-2">Action</th>
                              <th className="px-3 py-2 text-right">Hold Days</th>
                              <th className="px-3 py-2 text-right">Entry</th>
                              <th className="px-3 py-2 text-right">Exit</th>
                              <th className="px-3 py-2 text-right text-indigo-300">Price PnL</th>
                              <th className="px-3 py-2 text-right text-orange-300">Carry PnL</th>
                              <th className="px-3 py-2 text-right">Total PnL</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/50">
                          {[...result.trades].reverse().map((trade, idx) => (
                              <tr key={idx} className="hover:bg-slate-800/20">
                                  <td className="px-3 py-2 font-mono whitespace-nowrap text-slate-400">{trade.entryDate}</td>
                                  <td className="px-3 py-2 font-mono whitespace-nowrap text-slate-400">{trade.exitDate || '-'}</td>
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
                                  <td className="px-3 py-2 text-right text-slate-400">
                                      {trade.daysHeld !== undefined ? trade.daysHeld : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono">{trade.entryYield.toFixed(3)}%</td>
                                  <td className="px-3 py-2 text-right font-mono">
                                      {trade.exitYield ? `${trade.exitYield.toFixed(3)}%` : '-'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono text-indigo-300/80">
                                      {trade.pricePnL ? trade.pricePnL.toFixed(1) : '-'}
                                  </td>
                                   <td className="px-3 py-2 text-right font-mono text-orange-300/80">
                                      {trade.carryPnL ? trade.carryPnL.toFixed(1) : '-'}
                                  </td>
                                  <td className={`px-3 py-2 text-right font-mono font-bold ${
                                      (trade.totalPnL || 0) > 0 ? 'text-emerald-400' : 
                                      (trade.totalPnL || 0) < 0 ? 'text-red-400' : 'text-slate-500'
                                  }`}>
                                      {trade.totalPnL ? trade.totalPnL.toFixed(1) : '-'}
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
