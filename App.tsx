
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateMockData } from './utils/dataGenerator';
import { performPCA } from './utils/math';
import { parseCSV } from './utils/csvParser';
import { fetchFredData } from './services/fredService';
import { YieldCurvePoint, PCAResult, TENORS, Tenor } from './types';
import { generateInterpretation } from './services/interpretationService';

import LoadingsChart from './components/LoadingsChart';
import ScreePlot from './components/ScreePlot';
import ScoreTimeSeries from './components/ScoreTimeSeries';
import AnalysisPanel from './components/AnalysisPanel';
import YieldSurface from './components/YieldSurface';
import RollingVarianceChart from './components/RollingVarianceChart';
import RollingLoadingsSurface from './components/RollingLoadingsSurface';
import BenchmarkYieldsChart from './components/BenchmarkYieldsChart';
import RichCheapAnalysis from './components/RichCheapAnalysis';
import FredDataModal from './components/FredDataModal';
import DataReviewModal from './components/DataReviewModal';
import RotatableSurfaceChart from './components/RotatableSurfaceChart';
import BacktestDashboard from './components/BacktestDashboard';

const App: React.FC = () => {
  // Master Data Source
  const [data, setData] = useState<YieldCurvePoint[]>([]);
  const [activeTenors, setActiveTenors] = useState<Tenor[]>(TENORS);
  
  // Analysis Period State
  const [analysisRange, setAnalysisRange] = useState<{start: string, end: string}>({ start: '', end: '' });

  // Computed Results based on Analysis Period
  const [pcaResults, setPcaResults] = useState<PCAResult | null>(null);
  const [interpretation, setInterpretation] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isFredModalOpen, setIsFredModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isFetchingFred, setIsFetchingFred] = useState(false);

  // Derived Data for Analysis (Reactive)
  const analysisData = useMemo(() => {
    if (data.length === 0) return [];
    if (!analysisRange.start || !analysisRange.end) return data;
    return data.filter(d => d.date >= analysisRange.start && d.date <= analysisRange.end);
  }, [data, analysisRange]);

  // Reactive PCA Execution
  useEffect(() => {
    if (analysisData.length < 3) {
      setPcaResults(null);
      setInterpretation("Insufficient data in selected range (need at least 3 points).");
      return;
    }

    const results = performPCA(analysisData, activeTenors);
    setPcaResults(results);
    
    // Auto-analyze
    const start = analysisData[0].date;
    const end = analysisData[analysisData.length - 1].date;
    const text = generateInterpretation(results, { start, end });
    setInterpretation(text);

  }, [analysisData, activeTenors]);

  // Helper to load new data and reset ranges
  const handleNewData = (newData: YieldCurvePoint[], newTenors: Tenor[]) => {
    setData(newData);
    setActiveTenors(newTenors);
    if (newData.length > 0) {
      setAnalysisRange({
        start: newData[0].date,
        end: newData[newData.length - 1].date
      });
    }
  };

  // Initial Load
  useEffect(() => {
    handleLoadMockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMockData = useCallback(() => {
    const mockData = generateMockData(90);
    handleNewData(mockData, TENORS);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const { data: parsedData, availableTenors } = parseCSV(content);
        handleNewData(parsedData, availableTenors);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        alert(`Failed to import CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleFredFetch = async (apiKey: string, startDate: string) => {
    setIsFetchingFred(true);
    try {
      const { data: fredData, availableTenors } = await fetchFredData(apiKey, startDate);
      handleNewData(fredData, availableTenors);
      setIsFredModalOpen(false);
    } catch (error: any) {
      alert(`FRED Import Failed: ${error.message}`);
    } finally {
      setIsFetchingFred(false);
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const downloadTemplate = () => {
    const header = "Date,1M,3M,6M,1Y,2Y,3Y,5Y,7Y,10Y,20Y,30Y\n";
    const row = "2023-10-01,5.55,5.50,5.48,5.40,5.10,4.90,4.80,4.85,4.90,5.20,5.05";
    const blob = new Blob([header + row], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'yield_curve_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Yield Curve <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">PCA Analyst</span></h1>
          <p className="text-slate-400 mt-1">Principal Component Analysis for Fixed Income Markets</p>
        </div>
        <div className="flex gap-3 flex-wrap">
           <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".csv" 
            className="hidden" 
          />
          <button 
            onClick={() => setIsFredModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg hover:shadow-emerald-500/30 transition-all text-sm font-medium flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"/></svg>
            FRED Import
          </button>

          <button 
            onClick={triggerFileUpload}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all text-sm font-medium flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            Import CSV
          </button>
          
          <button 
            onClick={() => setIsDataModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-lg hover:shadow-blue-500/30 transition-all text-sm font-medium flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            View Data
          </button>

          <button 
            onClick={downloadTemplate}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 transition-colors text-sm font-medium"
            title="Download CSV Template"
          >
            Template
          </button>
          <button 
            onClick={handleLoadMockData}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg border border-slate-700 transition-colors text-sm font-medium"
          >
            Reset
          </button>
        </div>
      </header>

      {/* Analysis Range Controls */}
      {data.length > 0 && (
        <div className="max-w-7xl mx-auto mb-6 bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span className="font-semibold">Analysis Period:</span>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={analysisRange.start}
              min={data[0]?.date}
              max={analysisRange.end}
              onChange={(e) => setAnalysisRange(prev => ({ ...prev, start: e.target.value }))}
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <span className="text-slate-500">to</span>
            <input 
              type="date" 
              value={analysisRange.end}
              min={analysisRange.start}
              max={data[data.length-1]?.date}
              onChange={(e) => setAnalysisRange(prev => ({ ...prev, end: e.target.value }))}
              className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="text-xs text-slate-500 ml-auto">
            Points: {analysisData.length} / {data.length}
          </div>
        </div>
      )}

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 pb-12">
        
        {/* Top Row: Key Metrics */}
        {pcaResults && (
           <>
            {/* Left Col: Loadings & Scree */}
            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-[400px]">
                <LoadingsChart pcaData={pcaResults} />
              </div>
              <div className="h-[400px]">
                 <ScreePlot pcaData={pcaResults} />
              </div>
            </div>

            {/* Right Col: Analysis Panel */}
            <div className="lg:col-span-4 h-[400px]">
               <AnalysisPanel 
                 text={interpretation} 
                 isLoading={isAnalyzing} 
                 onRefresh={() => {
                   const start = analysisData[0].date;
                   const end = analysisData[analysisData.length - 1].date;
                   const text = generateInterpretation(pcaResults, { start, end });
                   setInterpretation(text);
                 }} 
               />
            </div>

            {/* Middle Row: Scores Time Series */}
            <div className="lg:col-span-12 h-[350px]">
               <ScoreTimeSeries pcaData={pcaResults} rawData={analysisData} />
            </div>
            
            {/* Third Row: Rolling Variance & Loadings Surface */}
            <div className="lg:col-span-6 h-[350px]">
               <RollingVarianceChart data={analysisData} tenors={activeTenors} />
            </div>

             <div className="lg:col-span-6 h-[350px]">
               <RollingLoadingsSurface data={analysisData} tenors={activeTenors} />
            </div>

            {/* NEW SECTION: 3D Visualization */}
            <div className="lg:col-span-12 mt-8 mb-2">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <span className="w-1 h-6 bg-purple-500 rounded-full"></span>
                 3D Market Structure
               </h2>
            </div>

            <div className="lg:col-span-6 h-[400px]">
               {/* 3D Yield Curve */}
               <RotatableSurfaceChart 
                  data={analysisData} 
                  tenors={activeTenors} 
                  type="yield" 
                  height={400} 
                  width={600}
                />
            </div>

            <div className="lg:col-span-6 h-[400px]">
               {/* 3D Rich/Cheap Surface */}
               <RotatableSurfaceChart 
                  data={analysisData} 
                  tenors={activeTenors} 
                  type="residual" 
                  height={400}
                  width={600} 
                />
            </div>

            {/* Trading Strategy & Benchmarks */}
            <div className="lg:col-span-12 mt-8 mb-2">
               <h2 className="text-xl font-bold text-white flex items-center gap-2">
                 <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
                 Trading Strategy & Benchmarks
               </h2>
            </div>
            
            <div className="lg:col-span-8 h-[350px]">
               <BenchmarkYieldsChart data={analysisData} />
            </div>

            <div className="lg:col-span-4 h-[350px]">
               <RichCheapAnalysis rawData={analysisData} pcaData={pcaResults} />
            </div>

            {/* Backtester Panel - PASSING FULL DATA HERE so user can backtest any period */}
            <div className="lg:col-span-12 h-[450px]">
               <BacktestDashboard data={data} tenors={activeTenors} />
            </div>
           </>
        )}
      </main>
      
      <footer className="max-w-7xl mx-auto border-t border-slate-800 text-center text-slate-500 text-sm py-8">
        <p>PCA computed client-side using Jacobi Algorithm.</p>
        <p className="mt-1 opacity-75">Supported CSV Headers: Date, 1M, 3M, 6M, 1Y, 2Y, 3Y, 5Y, 7Y, 10Y, 20Y, 30Y</p>
      </footer>

      {/* FRED Modal */}
      <FredDataModal 
        isOpen={isFredModalOpen}
        onClose={() => setIsFredModalOpen(false)}
        onFetch={handleFredFetch}
        loading={isFetchingFred}
      />
      
      {/* Data Review Modal using analysisData */}
      <DataReviewModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        data={analysisData}
        pcaResult={pcaResults}
        activeTenors={activeTenors}
      />
    </div>
  );
};

export default App;
