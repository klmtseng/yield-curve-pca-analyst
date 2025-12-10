import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { PCAResult } from '../types';

interface Props {
  pcaData: PCAResult;
}

const ScreePlot: React.FC<Props> = ({ pcaData }) => {
  const data = pcaData.explainedVariance.map((val, i) => ({
    component: `PC${i + 1}`,
    variance: val * 100
  })).slice(0, 5); // Only show top 5

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col">
      <h3 className="text-lg font-semibold text-slate-200 mb-1">Explained Variance (Scree Plot)</h3>
      <p className="text-xs text-slate-400 mb-4">Percentage of total curve movement explained by each component.</p>
      
      <div className="flex-grow min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" stroke="#94a3b8" domain={[0, 100]} hide />
            <YAxis dataKey="component" type="category" stroke="#94a3b8" tick={{fontSize: 12}} width={40} />
            <Tooltip 
               cursor={{fill: '#334155'}}
               contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
               formatter={(value: number) => [`${value.toFixed(2)}%`, 'Variance']}
            />
            <Bar dataKey="variance" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#38bdf8' : index === 1 ? '#a78bfa' : index === 2 ? '#34d399' : '#64748b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ScreePlot;
