
import React, { useState } from 'react';
import { YieldCurvePoint, PCAResult, Tenor } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: YieldCurvePoint[];
  pcaResult: PCAResult | null;
  activeTenors: Tenor[];
}

type Tab = 'data' | 'stats' | 'guide';

const DataReviewModal: React.FC<Props> = ({ isOpen, onClose, data, pcaResult, activeTenors }) => {
  const [activeTab, setActiveTab] = useState<Tab>('data');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800/50 rounded-t-xl">
          <h2 className="text-xl font-bold text-white">Data Inspector & Results</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 bg-slate-800/30 px-6">
          <button 
            onClick={() => setActiveTab('data')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'data' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Raw Data
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            disabled={!pcaResult}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'stats' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed'}`}
          >
            PCA Statistics
          </button>
          <button 
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'guide' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            Interpretation Guide
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-hidden relative bg-slate-900/50">
          
          {/* TAB 1: RAW DATA */}
          {activeTab === 'data' && (
            <div className="h-full overflow-auto custom-scrollbar p-6">
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-800 sticky top-0">
                    <tr>
                      <th className="px-6 py-3 font-medium">Date</th>
                      {activeTenors.map(t => (
                        <th key={t} className="px-4 py-3 font-medium text-right">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="px-6 py-2 font-mono text-slate-400 whitespace-nowrap">{row.date}</td>
                        {activeTenors.map(t => (
                          <td key={t} className="px-4 py-2 text-right font-mono">
                            {typeof row[t] === 'number' ? (row[t] as number).toFixed(2) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-slate-500 text-right">Showing {data.length} observations.</p>
            </div>
          )}

          {/* TAB 2: PCA STATISTICS */}
          {activeTab === 'stats' && pcaResult && (
            <div className="h-full overflow-auto custom-scrollbar p-6 space-y-8">
              
              {/* Eigenvalues Table */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                  Eigenvalues & Explained Variance
                </h3>
                <div className="overflow-hidden rounded-lg border border-slate-700">
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                      <tr>
                        <th className="px-6 py-3">Component</th>
                        <th className="px-6 py-3 text-right">Eigenvalue</th>
                        <th className="px-6 py-3 text-right">% Variance</th>
                        <th className="px-6 py-3 text-right">Cumulative %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {pcaResult.eigenvalues.map((val, i) => (
                        <tr key={i} className="hover:bg-slate-800/30">
                          <td className="px-6 py-2 font-medium text-slate-200">PC{i + 1}</td>
                          <td className="px-6 py-2 text-right font-mono text-slate-400">{val.toFixed(4)}</td>
                          <td className="px-6 py-2 text-right font-mono text-indigo-300">{(pcaResult.explainedVariance[i] * 100).toFixed(2)}%</td>
                          <td className="px-6 py-2 text-right font-mono text-slate-400">{(pcaResult.cumulativeVariance[i] * 100).toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Eigenvectors Matrix */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                  Eigenvectors (Loadings)
                </h3>
                <p className="text-sm text-slate-400 mb-4">
                  These coefficients represent the weights of each tenor for the respective Principal Component.
                </p>
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                  <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-800">
                      <tr>
                        <th className="px-6 py-3">Tenor</th>
                        <th className="px-4 py-3 text-right text-blue-400">PC1 (Level)</th>
                        <th className="px-4 py-3 text-right text-purple-400">PC2 (Slope)</th>
                        <th className="px-4 py-3 text-right text-emerald-400">PC3 (Curve)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                      {activeTenors.map((tenor, i) => (
                        <tr key={tenor} className="hover:bg-slate-800/30">
                          <td className="px-6 py-2 font-medium text-slate-200">{tenor}</td>
                          <td className="px-4 py-2 text-right font-mono">{pcaResult.eigenvectors[0][i].toFixed(3)}</td>
                          <td className="px-4 py-2 text-right font-mono">{pcaResult.eigenvectors[1][i].toFixed(3)}</td>
                          <td className="px-4 py-2 text-right font-mono">{pcaResult.eigenvectors[2][i].toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: GUIDE */}
          {activeTab === 'guide' && (
            <div className="h-full overflow-auto custom-scrollbar p-8">
              <article className="prose prose-invert prose-slate max-w-none">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 mb-6">
                  Understanding Yield Curve PCA
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700">
                    <h3 className="text-blue-400 font-bold text-lg mb-2">PC1: Level</h3>
                    <p className="text-sm text-slate-300">
                      **Explains ~90%+ of Variance**<br/>
                      Loadings are typically uniform and positive across all maturities. This means when PC1 moves, all yields move up or down together. It represents a parallel shift in interest rates.
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700">
                    <h3 className="text-purple-400 font-bold text-lg mb-2">PC2: Slope</h3>
                    <p className="text-sm text-slate-300">
                      **Explains ~5-10% of Variance**<br/>
                      Loadings usually go from positive at the short end to negative at the long end (or vice versa). This factor captures the steepening or flattening of the curve (e.g., 2s10s spread).
                    </p>
                  </div>
                  <div className="bg-slate-800/50 p-5 rounded-lg border border-slate-700">
                    <h3 className="text-emerald-400 font-bold text-lg mb-2">PC3: Curvature</h3>
                    <p className="text-sm text-slate-300">
                      **Explains ~1-3% of Variance**<br/>
                      Loadings are typically low at the ends (1M, 30Y) and high in the middle (5Y-7Y), creating a "hump". This captures the butterfly movement of the curve.
                    </p>
                  </div>
                </div>

                <h3>Why is this useful?</h3>
                <ul className="list-disc pl-5 space-y-2 text-slate-300">
                  <li>
                    <strong>Hedging:</strong> A trader holding a complex portfolio of bonds can determine their exposure to Level, Slope, and Curvature risks separately and hedge them using just 3 liquid instruments (e.g., 2Y, 5Y, 10Y futures).
                  </li>
                  <li>
                    <strong>Relative Value:</strong> By analyzing the "residuals" (the part of the yield curve NOT explained by the first 3 factors), traders can identify "rich" or "cheap" points on the curve that have deviated from their statistical norm.
                  </li>
                  <li>
                    <strong>Regime Identification:</strong> The time series of PC scores shows the history of rates (PC1), curve inversion (PC2), and convexity (PC3), helping macro strategists identify economic cycles.
                  </li>
                </ul>

                <h3 className="mt-8">Mathematical Background</h3>
                <p className="text-slate-300">
                  We perform PCA on the covariance matrix of the daily changes (or levels) of yields. 
                  The <strong>Eigenvalues</strong> tell us how much variance each component explains. 
                  The <strong>Eigenvectors</strong> (loadings) tell us the "shape" of that component across maturities.
                  The <strong>Scores</strong> are the projection of the daily yield curve onto these eigenvectors, giving us a time series for each factor.
                </p>
              </article>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-800/50 rounded-b-xl flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DataReviewModal;
