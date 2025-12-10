
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import FredDataModal from './components/FredDataModal';
import DataReviewModal from './components/DataReviewModal';

const App: React.FC = () => {
  const [data, setData] = useState<YieldCurvePoint[]>([]);
  const [activeTenors, setActiveTenors] = useState<Tenor[]>(TENORS);
  const [pcaResults, setPcaResults] = useState<PCAResult | null>(null);
  const [interpretation, setInterpretation] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [isFredModalOpen, setIsFredModalOpen] = useState(false);
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [isFetchingFred, setIsFetchingFred] = useState(false);

  // Initial Load
  useEffect(() => {
    handleLoadMockData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLoadMockData = useCallback(() => {
    // 1. Generate Data
    const mockData = generateMockData(60); // 60 days
    setData(mockData);
    setActiveTenors(TENORS);

    // 2. Perform PCA
    const results = performPCA(mockData, TENORS);
    setPcaResults(results);
    
    // 3. Trigger Analysis
    handleAnalyze(results, mockData);
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        const { data: parsedData, availableTenors } = parseCSV(content);
        
        // Update state
        setData(parsedData);
        setActiveTenors(availableTenors);
        
        // Run PCA on new data
        const results = performPCA(parsedData, availableTenors);
        setPcaResults(results);
        
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        // Auto analyze new data
        handleAnalyze(results, parsedData);

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
      
      setData(fredData);
      setActiveTenors(availableTenors);
      
      const results = performPCA(fredData, availableTenors);
      setPcaResults(results);
      
      setIsFredModalOpen(false);
      
      // Auto analyze new data
      handleAnalyze(results, fredData);
      
    } catch (error: any) {
      alert(`FRED Import Failed: ${error.message}`);
    } finally {
      setIsFetchingFred(false);
    }
  };

  const handleAnalyze = (results: PCAResult, rawData: YieldCurvePoint[]) => {
    if (!results || rawData.length === 0) return;
    
    // Use local interpretation service
    const start = rawData[0].date;
    const end = rawData[rawData.length - 1].date;
    
    const text = generateInterpretation(results, { start, end });
    setInterpretation(text);
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
      <header className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
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
            View Data & Results
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

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
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
                 onRefresh={() => handleAnalyze(pcaResults, data)} 
               />
            </div>

            {/* Middle Row: Scores Time Series */}
            <div className="lg:col-span-8 h-[350px]">
               <ScoreTimeSeries pcaData={pcaResults} rawData={data} />
            </div>

            {/* Middle Row: Curve Visualization */}
            <div className="lg:col-span-4 h-[350px]">
               <YieldSurface data={data} />
            </div>
           </>
        )}
      </main>
      
      <footer className="max-w-7xl mx-auto mt-12 text-center text-slate-500 text-sm pb-8">
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
      
      {/* Data Review Modal */}
      <DataReviewModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        data={data}
        pcaResult={pcaResults}
        activeTenors={activeTenors}
      />
    </div>
  );
};

export default App;
