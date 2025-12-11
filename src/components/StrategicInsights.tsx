import React, { useState } from 'react';
import { AlertTriangle, TrendingUp, AlertOctagon, ChevronDown, ChevronUp, Zap, X } from 'lucide-react';
import { StrategicInsight } from '../types';

export const StrategicInsights: React.FC<{ insights: StrategicInsight[]; isVisible: boolean; onClose: () => void; }> = ({ insights, isVisible, onClose }) => {
  const [isExpanded, setIsExpanded] = useState(false); // Default to collapsed to save space

  if (!isVisible || insights.length === 0) return null;

  const criticalCount = insights.filter(i => i.type === 'critical').length;
  const totalSavings = insights.reduce((acc, curr) => acc + (curr.potential_savings ? parseFloat(curr.potential_savings.replace(/[^0-9.-]+/g,"")) || 0 : 0), 0);

  return (
    <div className="mb-6 animate-in slide-in-from-top-4 duration-500 ease-out">
      <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-xl border shadow-lg overflow-hidden transition-all duration-300 ${criticalCount > 0 ? 'border-red-500/30 ring-1 ring-red-500/20' : 'border-indigo-500/20'}`}>
        
        {/* COMPACT HEADER - Fills the empty space without dominating */}
        <div 
            className="px-4 py-3 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
            onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-4">
            <div className={`p-1.5 rounded-md flex items-center justify-center shadow-sm ${criticalCount > 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'}`}>
              {criticalCount > 0 ? <AlertOctagon className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            </div>

            <div className="flex flex-col">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-wide uppercase flex items-center">
                  Strategic Audit 
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-mono ${criticalCount > 0 ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                    {insights.length} Findings
                  </span>
                </h3>
                {!isExpanded && (
                    <div className="flex items-center space-x-3 mt-0.5">
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {criticalCount > 0 ? `${criticalCount} Critical Issues` : 'Optimization opportunities found'} 
                        </p>
                        {totalSavings > 0 && (
                            <span className="flex items-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
                                <TrendingUp className="w-3 h-3 mr-1" /> Save ${totalSavings.toFixed(2)}
                            </span>
                        )}
                    </div>
                )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                {isExpanded ? 'Hide Details' : 'View Report'}
            </span>
            <button className="text-slate-400 hover:text-indigo-500 transition-colors bg-white dark:bg-slate-700 p-1 rounded-md shadow-sm border border-slate-200 dark:border-slate-600">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* EXPANDED GRID */}
        {isExpanded && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 bg-white/50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2">
            {insights.map((insight, index) => {
                const isCritical = insight.type === 'critical';
                const isWarning = insight.type === 'warning';
                
                return (
                <div key={index} className={`
                    relative p-3 rounded-lg border transition-all duration-300 hover:shadow-md group flex flex-col justify-between
                    ${isCritical 
                    ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/50' 
                    : isWarning 
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50' 
                        : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50'}
                `}>
                    <div>
                    <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-2">
                            {isCritical ? <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400" /> : 
                            isWarning ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" /> : 
                            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                            <h4 className={`text-xs font-bold uppercase tracking-wide ${
                            isCritical ? 'text-red-700 dark:text-red-400' : isWarning ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                            }`}>{insight.title}</h4>
                        </div>
                    </div>
                    
                    <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed pl-6">
                        {insight.message}
                    </p>
                    </div>

                    {insight.potential_savings && (
                    <div className="mt-2 pl-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-sm">
                            Save {insight.potential_savings}
                        </span>
                    </div>
                    )}
                </div>
                );
            })}
            </div>
        )}
      </div>
    </div>
  );
};