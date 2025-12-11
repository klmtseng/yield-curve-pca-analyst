
import React, { useMemo, useState } from 'react';
import { Tenor, YieldCurvePoint } from '../types';
import { calculateRollingLoadings } from '../utils/math';

interface Props {
  data: YieldCurvePoint[];
  tenors: Tenor[];
  windowSize?: number;
}

const RollingLoadingsSurface: React.FC<Props> = ({ data, tenors, windowSize = 30 }) => {
  const [selectedPC, setSelectedPC] = useState<'pc1' | 'pc2' | 'pc3'>('pc1');

  const surfaceData = useMemo(() => {
    if (data.length < windowSize) return [];
    return calculateRollingLoadings(data, tenors, windowSize);
  }, [data, tenors, windowSize]);

  if (surfaceData.length === 0) {
     return (
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm h-full flex items-center justify-center text-slate-400">
        Insufficient data for surface (Need {windowSize}+ points)
      </div>
    );
  }

  // Find min/max for color scaling
  let minVal = 0;
  let maxVal = 0;
  
  surfaceData.forEach(row => {
    row[selectedPC].forEach(val => {
      if (val < minVal) minVal = val;
      if (val > maxVal) maxVal = val;
    });
  });
  
  // Symmetric scale for better visualization of zero-crossing
  const limit = Math.max(Math.abs(minVal), Math.abs(maxVal));

  const getColor = (value: number) => {
    // Normalize -1 to 1 based on limit
    const norm = Math.max(-1, Math.min(1, value / limit));
    
    if (norm > 0) {
      // Blue/Cyan for positive
      const intensity = Math.round(norm * 255);
      return `rgba(56, 189, 248, ${norm})`; // Tailwind sky-400
    } else {
      // Red/Rose for negative
      const intensity = Math.round(Math.abs(norm) * 255);
      return `rgba(251, 113, 133, ${Math.abs(norm)})`; // Tailwind rose-400
    }
  };

  const cellWidth = 100 / tenors.length;
  const cellHeight = 100 / surfaceData.length;

  return (
    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col">
      <div className="flex justify-between items-start mb-4">
        <div>
           <h3 className="text-lg font-semibold text-slate-200">Rolling Component Surface</h3>
           <p className="text-xs text-slate-400">Evolution of Factor Loadings ({windowSize}-Day Window)</p>
        </div>
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
           {(['pc1', 'pc2', 'pc3'] as const).map((pc, i) => (
             <button
               key={pc}
               onClick={() => setSelectedPC(pc)}
               className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                 selectedPC === pc 
                   ? 'bg-indigo-600 text-white shadow-sm' 
                   : 'text-slate-400 hover:text-slate-200'
               }`}
             >
               PC{i + 1}
             </button>
           ))}
        </div>
      </div>

      <div className="flex-grow flex flex-col relative overflow-hidden">
         {/* Chart Container */}
         <div className="flex-grow flex">
            {/* Y-Axis Labels (Dates) - Sampling only a few */}
            <div className="w-16 flex flex-col justify-between text-[10px] text-slate-500 py-1 pr-2 text-right font-mono">
               {surfaceData.filter((_, i) => i % Math.ceil(surfaceData.length / 5) === 0).map((row, i) => (
                 <span key={i}>{row.date}</span>
               ))}
               <span>{surfaceData[surfaceData.length-1].date}</span>
            </div>

            {/* Heatmap Area */}
            <div className="flex-grow relative border border-slate-700/50 bg-slate-900/50">
               <svg width="100%" height="100%" preserveAspectRatio="none">
                  {surfaceData.map((row, rowIndex) => (
                    row[selectedPC].map((val, colIndex) => (
                      <rect 
                        key={`${rowIndex}-${colIndex}`}
                        x={`${colIndex * cellWidth}%`}
                        y={`${rowIndex * cellHeight}%`}
                        width={`${cellWidth + 0.1}%`} // +0.1 to prevent gaps
                        height={`${cellHeight + 0.2}%`}
                        fill={getColor(val)}
                        shapeRendering="crispEdges"
                      >
                        <title>{`Date: ${row.date}\nTenor: ${tenors[colIndex]}\nLoading: ${val.toFixed(3)}`}</title>
                      </rect>
                    ))
                  ))}
               </svg>
            </div>
            
            {/* Legend Bar (Gradient) */}
            <div className="w-4 ml-2 rounded-full overflow-hidden border border-slate-700 flex flex-col">
               <div className="flex-1 bg-gradient-to-b from-transparent to-rose-400 opacity-80"></div>
               <div className="h-[1px] bg-slate-500"></div>
               <div className="flex-1 bg-gradient-to-b from-sky-400 to-transparent opacity-80"></div>
            </div>
         </div>

         {/* X-Axis Labels (Tenors) */}
         <div className="flex pl-16 pr-6 mt-1">
            {tenors.map((t, i) => (
              <div key={t} className="flex-1 text-center text-[10px] text-slate-400 font-mono">
                {t}
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default RollingLoadingsSurface;
