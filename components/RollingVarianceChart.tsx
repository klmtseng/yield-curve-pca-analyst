
import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { Tenor, YieldCurvePoint } from '../types';
import { performRollingPCA } from '../utils/math';

interface Props {
  data: YieldCurvePoint[];
  tenors: Tenor[];
  windowSize?: number;
}

const RollingVarianceChart: React.FC<Props> = ({ data, tenors, windowSize = 60 }) => {
  // Memoize calculation to prevent freezing UI on re-renders
  const chartData = useMemo(() => {
    if (data.length < windowSize) return [];
    return performRollingPCA(data, tenors, windowSize);
  }, [data, tenors, windowSize]);

  if (chartData.length === 0) {
    return (
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col justify-center items-center text-slate-400 text-sm">
        Insufficient data for rolling analysis (Need {windowSize}+ points).
      </div>
    );
  }

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <div>
           <h3 className="text-lg font-semibold text-slate-200">Rolling Explained Variance (Stability)</h3>
           <p className="text-xs text-slate-400">{windowSize}-Day Rolling Window. Drops in PC1 often indicate market stress.</p>
        </div>
      </div>
      
      <div className="flex-grow min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} minTickGap={30} />
            <YAxis stroke="#94a3b8" tick={{fontSize: 10}} domain={[0, 100]} />
            <Tooltip 
               contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
               formatter={(val: number) => val.toFixed(1) + '%'}
            />
            <Legend verticalAlign="top" height={36}/>
            <Line type="monotone" dataKey="PC1" stroke="#38bdf8" strokeWidth={2} dot={false} name="PC1 Variance %" />
            <Line type="monotone" dataKey="PC2" stroke="#a78bfa" strokeWidth={2} dot={false} name="PC2 Variance %" />
            <Line type="monotone" dataKey="PC3" stroke="#34d399" strokeWidth={1} dot={false} name="PC3 Variance %" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RollingVarianceChart;
