
import React, { useState, useMemo } from 'react';
import { InvoiceData } from '../types';
import { FileText, FileBox, FileCheck, ChevronRight, History, Plus, Archive, Download, BarChart2, PieChart, Clock, AlertTriangle, TestTube } from 'lucide-react';
import { TranslationDictionary } from '../utils/translations';
import { getExchangeRate } from '../utils/currency';

interface SessionSidebarProps {
  history: InvoiceData[];
  currentId?: string;
  onSelect: (data: InvoiceData) => void;
  onNewInvoice: () => void;
  onExportAll: () => void;
  t: TranslationDictionary;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
}

type Tab = 'list' | 'stats';

export const SessionSidebar: React.FC<SessionSidebarProps> = ({ 
  history, 
  currentId, 
  onSelect, 
  onNewInvoice, 
  onExportAll, 
  t,
  isDemoMode,
  onToggleDemoMode
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('list');
  
  const getBadgeStyle = (type: string = '') => {
    const tStr = type.toUpperCase();
    if (tStr.includes('INVOICE')) return { 
      className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20', 
      icon: FileText,
      label: 'INV'
    };
    if (tStr.includes('PACKING')) return { 
      className: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/20', 
      icon: FileBox,
      label: 'PAK'
    };
    if (tStr.includes('BOL') || tStr.includes('LADING')) return { 
      className: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20', 
      icon: FileCheck,
      label: 'BOL'
    };
    return { 
      className: 'text-slate-600 dark:text-slate-400 bg-slate-500/10 border-slate-500/20', 
      icon: FileText,
      label: 'DOC'
    };
  };

  const calculateRisk = (data: InvoiceData) => {
    // Stale Date Check (> 2 years)
    const date = new Date(data.invoiceDate);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const isStale = !isNaN(date.getTime()) && date < twoYearsAgo;

    // High Risk Item Check
    const hasHighRiskItem = data.lineItems.some(item => {
        const cat = (item.glCategory || '').toLowerCase();
        return (cat.includes('meal') || cat.includes('office')) && item.unitPrice > 100;
    });

    return isStale || hasHighRiskItem;
  };

  // --- Statistics Logic ---
  const stats = useMemo(() => {
    if (history.length === 0) return null;

    let totalValueUSD = 0;
    let totalTime = 0;
    const catCounts: Record<string, number> = {};
    const langCounts: Record<string, number> = {};

    history.forEach(doc => {
      // Currency Conversion to USD
      const { rate } = getExchangeRate(doc.currencySymbol, 'USD');
      totalValueUSD += (doc.totalAmount || 0) * rate;

      // Processing Time
      if (doc.processingTimeMs) totalTime += doc.processingTimeMs;

      // Categories
      doc.lineItems.forEach(item => {
         const cat = item.glCategory || 'Uncategorized';
         catCounts[cat] = (catCounts[cat] || 0) + 1;
      });

      // Languages
      const lang = doc.language || 'Unknown';
      langCounts[lang] = (langCounts[lang] || 0) + 1;
    });

    // Sort Top Categories
    const topCategories = Object.entries(catCounts)
       .sort(([, a], [, b]) => b - a)
       .slice(0, 3);

    // Sort Top Languages
    const topLanguages = Object.entries(langCounts)
       .sort(([, a], [, b]) => b - a);

    return {
        totalDocs: history.length,
        totalValueUSD,
        avgTime: totalTime / history.length / 1000,
        topCategories,
        topLanguages
    };
  }, [history]);

  return (
    <div className="h-full flex flex-col bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200 dark:border-white/5 w-full">
      
      {/* Sidebar Header with New Invoice Action */}
      <div className="p-4 border-b border-slate-200 dark:border-white/5 space-y-3">
        
        {/* Tab Toggle */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
             <button 
                onClick={() => setActiveTab('list')}
                className={`flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
                <History className="w-3 h-3" />
                <span>{t.sessionTrail}</span>
             </button>
             <button 
                onClick={() => setActiveTab('stats')}
                className={`flex-1 flex items-center justify-center space-x-2 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === 'stats' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
             >
                <BarChart2 className="w-3 h-3" />
                <span>{t.sessionStats}</span>
             </button>
        </div>

        {/* Demo Mode Toggle */}
        <div 
          onClick={onToggleDemoMode}
          className={`
            w-full p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all duration-300 shadow-sm group
            ${isDemoMode 
              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 ring-1 ring-amber-500/20' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50'}
          `}
        >
           <div className="flex items-center space-x-2">
              <div className={`p-1 rounded transition-colors ${isDemoMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                 {isDemoMode ? <AlertTriangle className="w-3 h-3" /> : <TestTube className="w-3 h-3" />}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${isDemoMode ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300'}`}>
                {isDemoMode ? 'Demo Mode' : 'Real API'}
              </span>
           </div>
           <div className={`w-8 h-4 rounded-full relative transition-colors ${isDemoMode ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
              <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isDemoMode ? 'translate-x-4' : 'translate-x-0'}`} />
           </div>
        </div>

        <button 
            onClick={onNewInvoice}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center space-x-2 text-xs font-bold uppercase tracking-wide transition-all shadow-md shadow-indigo-500/20 hover:-translate-y-0.5"
        >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newInvoice}</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        
        {/* LIST VIEW */}
        {activeTab === 'list' && (
           <div className="p-4 space-y-3">
            {history.length === 0 && (
            <div className="text-center py-10 opacity-50">
                <p className="text-xs text-slate-500">{t.noDocs}</p>
            </div>
            )}

            {history.map((item) => {
            const badgeStyle = getBadgeStyle(item.documentType);
            const isRisk = calculateRisk(item);
            const isSelected = item.id === currentId;

            return (
                <div 
                key={item.id}
                onClick={() => onSelect(item)}
                className={`
                    group relative p-3 rounded-xl border transition-all duration-300 cursor-pointer
                    ${isSelected 
                    ? 'bg-white dark:bg-slate-800 border-indigo-500/50 shadow-lg shadow-indigo-500/10' 
                    : 'bg-white/40 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600'}
                `}
                >
                <div className="flex justify-between items-start mb-2">
                    <div className={`
                    flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border
                    ${badgeStyle.className}
                    `}>
                        <badgeStyle.icon className="w-3 h-3" />
                        <span>{badgeStyle.label}</span>
                    </div>
                    
                    {isRisk ? (
                    <div className="flex items-center space-x-1" title={t.riskDetected}>
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        <span className="text-[10px] font-bold text-red-500 hidden group-hover:block">{t.riskTag}</span>
                    </div>
                    ) : (
                        <div className="flex items-center space-x-1" title={t.clean}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        </div>
                    )}
                </div>

                <div className="space-y-0.5">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate pr-4">
                        {item.vendorName || 'Unknown Vendor'}
                    </h4>
                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                        {item.currencySymbol || '$'}{item.totalAmount?.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 flex justify-between">
                        <span>{item.invoiceDate}</span>
                        {item.processingTimeMs && (
                           <span className="opacity-60">{(item.processingTimeMs / 1000).toFixed(1)}s</span>
                        )}
                    </p>
                </div>

                {isSelected && (
                    <div className="absolute right-2 bottom-3 text-indigo-500">
                        <ChevronRight className="w-4 h-4" />
                    </div>
                )}
                </div>
            );
            })}
           </div>
        )}

        {/* STATS VIEW */}
        {activeTab === 'stats' && (
            <div className="p-4 space-y-6">
                {(!stats) ? (
                    <div className="text-center py-10 opacity-50">
                      <p className="text-xs text-slate-500">{t.noDocs}</p>
                    </div>
                ) : (
                    <>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                                <p className="text-[10px] uppercase font-bold text-slate-400">{t.totalDocs}</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">{stats.totalDocs}</p>
                            </div>
                             <div className="bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                                <p className="text-[10px] uppercase font-bold text-slate-400">{t.avgTime}</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white mt-1">{stats.avgTime.toFixed(1)}<span className="text-xs ml-0.5 font-normal text-slate-500">{t.seconds}</span></p>
                            </div>
                        </div>

                        {/* Total Value */}
                         <div className="bg-gradient-to-br from-indigo-500/10 to-blue-500/10 p-4 rounded-xl border border-indigo-500/20">
                            <p className="text-[10px] uppercase font-bold text-indigo-500/80">{t.totalValue}</p>
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">${stats.totalValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>

                        {/* Top Categories */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.topCategories}</h4>
                            <div className="space-y-2">
                                {stats.topCategories.map(([cat, count], idx) => (
                                    <div key={idx} className="bg-white/40 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-white/5 flex justify-between items-center text-xs">
                                        <span className="truncate font-medium text-slate-700 dark:text-slate-300 max-w-[70%]">{cat}</span>
                                        <span className="font-bold text-slate-500 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[10px]">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                         {/* Languages */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">{t.languages}</h4>
                            <div className="space-y-2">
                                {stats.topLanguages.map(([lang, count], idx) => (
                                    <div key={idx} className="flex items-center justify-between text-xs">
                                        <span className="text-slate-600 dark:text-slate-400">{lang}</span>
                                        <div className="flex items-center space-x-2 w-[60%]">
                                             <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                 <div 
                                                    className="h-full bg-emerald-500 rounded-full" 
                                                    style={{ width: `${(count / stats.totalDocs) * 100}%` }} 
                                                 />
                                             </div>
                                             <span className="text-[10px] font-mono w-4 text-right opacity-60">{count}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        )}
      </div>

      {/* Footer - Export All */}
      <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/30">
        <button 
            onClick={onExportAll}
            disabled={history.length === 0}
            className="w-full py-2 flex items-center justify-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportCombined}</span>
        </button>
      </div>
    </div>
  );
};
