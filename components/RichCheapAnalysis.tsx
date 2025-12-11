
import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Cell } from 'recharts';
import { PCAResult, YieldCurvePoint } from '../types';
import { calculateLatestResiduals } from '../utils/math';

interface Props {
  rawData: YieldCurvePoint[];
  pcaData: PCAResult;
}

const RichCheapAnalysis: React.FC<Props> = ({ rawData, pcaData }) => {
  
  const residualData = useMemo(() => {
    return calculateLatestResiduals(rawData, pcaData);
  }, [rawData, pcaData]);

  if (residualData.length === 0) return null;

  // Format for chart
  const chartData = residualData.map(d => ({
    tenor: d.tenor,
    bps: Number((d.residual * 100).toFixed(1)), // Convert to basis points
    zScore: d.zScore,
    model: d.model.toFixed(3),
    actual: d.actual.toFixed(3)
  }));

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <div>
           <h3 className="text-lg font-semibold text-slate-200">Rich / Cheap Analysis</h3>
           <p className="text-xs text-slate-400">
             Residuals vs 3-Factor PCA Model. Positive = Cheap (Yield too high).
           </p>
        </div>
      </div>
      
      <div className="flex-grow min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="tenor" stroke="#94a3b8" tick={{fontSize: 12}} />
            <YAxis stroke="#94a3b8" tick={{fontSize: 10}} label={{ value: 'Residual (bps)', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
            <Tooltip 
               cursor={{fill: '#334155', opacity: 0.4}}
               contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
               formatter={(value: number, name: string, props: any) => {
                 if (name === 'bps') return [`${value} bps`, 'Residual'];
                 return [value, name];
               }}
               labelFormatter={(label) => {
                 const point = chartData.find(p => p.tenor === label);
                 if (!point) return label;
                 const signal = point.bps > 0 ? "CHEAP (Buy)" : "RICH (Sell)";
                 return `${label}: ${signal}`;
               }}
            />
            <ReferenceLine y={0} stroke="#94a3b8" />
            <Bar dataKey="bps">
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.bps > 0 ? '#4ade80' : '#f87171'} // Green (Cheap/Buy) or Red (Rich/Sell)
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] text-slate-400 bg-slate-900/50 p-2 rounded">
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <span>Positive (Cheap): Yield is higher than model. Potential **Buy**.</span>
         </div>
         <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-400 rounded-sm"></div>
            <span>Negative (Rich): Yield is lower than model. Potential **Sell**.</span>
         </div>
      </div>
    </div>
  );
};

export default RichCheapAnalysis;
