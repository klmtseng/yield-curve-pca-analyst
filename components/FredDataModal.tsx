
import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onFetch: (apiKey: string, startDate: string) => void;
  loading: boolean;
}

const FredDataModal: React.FC<Props> = ({ isOpen, onClose, onFetch, loading }) => {
  const [apiKey, setApiKey] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split('T')[0];
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey) {
      onFetch(apiKey, startDate);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Import from FRED</h2>
          <button onClick={onClose} type="button" className="text-slate-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              FRED API Key
            </label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="abcdef123456..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500 mt-1">
              Don't have a key? <a href="https://fred.stlouisfed.org/docs/api/api_key.html" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Request one here</a>.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Start Date
            </label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-4 flex gap-3">
             <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={loading || !apiKey}
              className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-all flex justify-center items-center gap-2 ${
                loading || !apiKey
                  ? 'bg-indigo-900/50 text-indigo-300 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg hover:shadow-indigo-500/30'
              }`}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Fetching...
                </>
              ) : (
                'Fetch Data'
              )}
            </button>
          </div>
          
          <div className="text-xs text-amber-500/80 bg-amber-900/10 p-2 rounded border border-amber-900/30 mt-2">
            Note: Requests are routed through a CORS proxy to bypass browser restrictions.
          </div>
        </form>
      </div>
    </div>
  );
};

export default FredDataModal;
