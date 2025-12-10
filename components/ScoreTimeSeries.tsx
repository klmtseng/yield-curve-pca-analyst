import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { PCAResult, YieldCurvePoint } from '../types';

interface Props {
  pcaData: PCAResult;
  rawData: YieldCurvePoint[];
}

const ScoreTimeSeries: React.FC<Props> = ({ pcaData, rawData }) => {
  // Combine dates with scores
  const data = rawData.map((point, i) => ({
    date: point.date,
    PC1: pcaData.scores[i][0],
    PC2: pcaData.scores[i][1],
    PC3: pcaData.scores[i][2],
  }));

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
           <h3 className="text-lg font-semibold text-slate-200">Component Scores Time Series</h3>
           <p className="text-xs text-slate-400">Evolution of the factors over time (normalized).</p>
        </div>
      </div>
      
      <div className="flex-grow min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPC1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorPC2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94a3b8" tick={{fontSize: 10}} minTickGap={30} />
            <YAxis stroke="#94a3b8" tick={{fontSize: 10}} />
            <Tooltip 
               contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
            />
            <Legend />
            <Area type="monotone" dataKey="PC1" stroke="#38bdf8" fillOpacity={1} fill="url(#colorPC1)" strokeWidth={2} />
            <Area type="monotone" dataKey="PC2" stroke="#a78bfa" fillOpacity={1} fill="url(#colorPC2)" strokeWidth={2} />
            <Area type="monotone" dataKey="PC3" stroke="#34d399" fill="none" strokeWidth={1} strokeDasharray="5 5" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ScoreTimeSeries;
