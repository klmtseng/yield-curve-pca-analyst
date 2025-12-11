
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { YieldCurvePoint } from '../types';

interface Props {
  data: YieldCurvePoint[];
}

const BenchmarkYieldsChart: React.FC<Props> = ({ data }) => {
  // Key benchmarks for trading
  const benchmarks = ['2Y', '5Y', '10Y', '30Y'];
  
  // Check which are actually available in the data
  const availableBenchmarks = benchmarks.filter(b => 
    data.length > 0 && data[0][b] !== undefined
  );

  const colors: Record<string, string> = {
    '2Y': '#f472b6', // Pink 400
    '5Y': '#fb923c', // Orange 400
    '10Y': '#a78bfa', // Purple 400
    '30Y': '#38bdf8'  // Sky 400
  };

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-start mb-2">
        <div>
           <h3 className="text-lg font-semibold text-slate-200">Benchmark Yields</h3>
           <p className="text-xs text-slate-400">Time series of key trading tenors.</p>
        </div>
      </div>
      
      <div className="flex-grow min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} minTickGap={30} />
            <YAxis domain={['auto', 'auto']} stroke="#94a3b8" tick={{fontSize: 10}} />
            <Tooltip 
               contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
            />
            <Legend verticalAlign="top" height={36}/>
            {availableBenchmarks.map(tenor => (
              <Line 
                key={tenor}
                type="monotone" 
                dataKey={tenor} 
                stroke={colors[tenor] || '#fff'} 
                strokeWidth={2} 
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BenchmarkYieldsChart;
