
import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { YieldCurvePoint, TENORS } from '../types';

interface Props {
  data: YieldCurvePoint[];
}

const YieldSurface: React.FC<Props> = ({ data }) => {
  if (!data || data.length === 0) return <div className="p-4 text-slate-400">No data available</div>;

  // Dynamically determine available tenors from the first data point
  // This handles cases where imported CSVs might lack certain maturities (e.g. 20Y)
  const availableTenors = TENORS.filter(t => data[0][t] !== undefined);

  // Show only a subset of lines to avoid clutter
  // E.g., The oldest, the middle, and the newest
  const indicesToShow = [0, Math.floor(data.length / 2), data.length - 1];
  const selectedCurves = indicesToShow.map(i => ({
    ...data[i],
    label: i === data.length - 1 ? 'Current' : i === 0 ? 'Start' : 'Mid'
  }));

  // Reformat for the chart: X axis is Tenor
  const chartData = availableTenors.map(tenor => {
    const point: any = { tenor };
    selectedCurves.forEach(curve => {
      point[curve.label] = curve[tenor];
      point[`${curve.label}_date`] = curve.date;
    });
    return point;
  });

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col">
       <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-200">Yield Curve Evolution</h3>
        <span className="text-xs px-2 py-1 bg-slate-700 rounded text-slate-300">
           {data.length} days observed
        </span>
      </div>
      
      <div className="flex-grow min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="tenor" stroke="#94a3b8" tick={{fontSize: 12}} />
            <YAxis domain={['auto', 'auto']} stroke="#94a3b8" tick={{fontSize: 12}} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#e2e8f0' }}
            />
            <Line type="monotone" dataKey="Start" stroke="#64748b" strokeWidth={1} dot={false} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="Mid" stroke="#94a3b8" strokeWidth={1} dot={false} />
            <Line type="monotone" dataKey="Current" stroke="#38bdf8" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default YieldSurface;
