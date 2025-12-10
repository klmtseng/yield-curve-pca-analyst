import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { PCAResult, Tenor } from '../types';

interface Props {
  pcaData: PCAResult;
}

const LoadingsChart: React.FC<Props> = ({ pcaData }) => {
  // Transform eigenvectors into recharts friendly format
  // We need an array of objects: { tenor: '1M', pc1: 0.3, pc2: -0.1, ... }
  
  const chartData = pcaData.tenors.map((tenor, i) => ({
    tenor,
    PC1: pcaData.eigenvectors[0][i],
    PC2: pcaData.eigenvectors[1][i],
    PC3: pcaData.eigenvectors[2][i],
  }));

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col">
      <h3 className="text-lg font-semibold text-slate-200 mb-1">Factor Loadings (Eigenvectors)</h3>
      <p className="text-xs text-slate-400 mb-4">Shows sensitivity of each tenor to the principal components.</p>
      
      <div className="flex-grow min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="tenor" stroke="#94a3b8" tick={{fontSize: 12}} />
            <YAxis stroke="#94a3b8" tick={{fontSize: 12}} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
              itemStyle={{ color: '#e2e8f0' }}
            />
            <Legend />
            <Line type="monotone" dataKey="PC1" stroke="#38bdf8" strokeWidth={2} dot={{r:3}} name={`PC1 (${(pcaData.explainedVariance[0]*100).toFixed(1)}%)`} />
            <Line type="monotone" dataKey="PC2" stroke="#a78bfa" strokeWidth={2} dot={{r:3}} name={`PC2 (${(pcaData.explainedVariance[1]*100).toFixed(1)}%)`} />
            <Line type="monotone" dataKey="PC3" stroke="#34d399" strokeWidth={2} dot={{r:3}} name={`PC3 (${(pcaData.explainedVariance[2]*100).toFixed(1)}%)`} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LoadingsChart;
