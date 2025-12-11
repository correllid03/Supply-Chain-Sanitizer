import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, AlertOctagon, ChevronDown, Zap, Info } from 'lucide-react';
import { StrategicInsight } from '../types';

export const StrategicInsights: React.FC<{ insights: StrategicInsight[]; isVisible: boolean; onClose: () => void; }> = ({ insights, isVisible, onClose }) => {
  // CHANGED: Default is now TRUE so it opens automatically
  const [isExpanded, setIsExpanded] = useState(true); 
  
  if (!isVisible || insights.length === 0) return null;
  
  const criticalCount = insights.filter(i => i.type === 'critical').length;
  const totalSavings = insights.reduce((acc, curr) => acc + (curr.potential_savings ? parseFloat(curr.potential_savings.replace(/[^0-9.-]+/g,"")) || 0 : 0), 0);

  // Helper for color coding individual cards
  const getCardStyle = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30';
      case 'opportunity':
      case 'savings':
        return 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800/30';
      default:
        return 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
        case 'critical': return <AlertOctagon className="w-3.5 h-3.5 text-red-500" />;
        case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />;
        case 'opportunity': return <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
        default: return <Info className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="w-full animate-in slide-in-from-top-4 duration-500 ease-out">
      <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-xl border shadow-lg overflow-hidden transition-all duration-300 ${criticalCount > 0 ? 'border-red-500/30' : 'border-indigo-500/20'}`}>
        <div className="px-4 py-3 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center space-x-4">
            <div className={`p-1.5 rounded-md flex items-center justify-center shadow-sm ${criticalCount > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
              {criticalCount > 0 ? <AlertOctagon className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </div>
            <div className="flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase flex items-center">
                  Strategic Audit <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{insights.length} Findings</span>
                </h3>
                {!isExpanded && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{criticalCount > 0 ? `${criticalCount} Critical Issues` : 'Optimization opportunities found'} {totalSavings > 0 && <span className="text-emerald-600 font-bold ml-1">• Save ${totalSavings.toFixed(2)}</span>}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2"><span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-600 transition-colors">{isExpanded ? 'Hide Details' : 'View Report'}</span><button className="text-slate-400"><ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button></div>
        </div>
        {isExpanded && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white/50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800">
            {insights.map((insight, i) => (
                <div key={i} className={`p-3 rounded-lg border hover:shadow-md transition-all ${getCardStyle(insight.type || 'default')}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                        {getIcon(insight.type || 'default')}
                        <h4 className="text-xs font-bold uppercase opacity-90">{insight.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{insight.message}</p>
                    {insight.potential_savings && (
                        <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                            <TrendingUp className="w-3 h-3 mr-1" /> Savings: {insight.potential_savings}
                        </div>
                    )}
                </div>
            ))}
            </div>
        )}
      </div>
    </div>
  );
};