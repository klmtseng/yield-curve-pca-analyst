
import React from 'react';

interface Props {
  text: string;
  isLoading: boolean;
  onRefresh: () => void;
}

const AnalysisPanel: React.FC<Props> = ({ text, isLoading }) => {
  return (
    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-sm h-full flex flex-col relative overflow-hidden">
       <div className="flex justify-between items-center mb-4">
        <div>
           <h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
             Regime Analysis
           </h3>
           <p className="text-xs text-slate-400">Automated Statistical Inference</p>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
          <div className="prose prose-invert prose-sm max-w-none">
            {text.split('\n').map((line, i) => {
              if (line.startsWith('####')) return <h4 key={i} className="text-md font-bold text-indigo-300 mt-4 mb-1">{line.replace('####', '')}</h4>;
              if (line.startsWith('###')) return <h3 key={i} className="text-lg font-bold text-slate-200 mt-2 mb-2">{line.replace('###', '')}</h3>;
              if (line.startsWith('**') && line.endsWith('**')) return <p key={i} className="text-slate-300 font-bold mb-2">{line.replace(/\*\*/g, '')}</p>;
              if (line.startsWith('-')) return <li key={i} className="ml-4 text-slate-300 list-disc">{line.replace('-', '')}</li>;
              if (line.trim() === '') return <br key={i} />;
              return <p key={i} className="text-slate-300 mb-2 leading-relaxed">{line.replace(/\*\*/g, '')}</p>;
            })}
          </div>
      </div>

      {/* Decorative background blur */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
};

export default AnalysisPanel;
