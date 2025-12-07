
import React, { useState, useMemo, useEffect } from 'react';
import { InvoiceData } from '../types';
import { FileText, FileBox, FileCheck, ChevronRight, History, Archive, Download, BarChart2, PieChart, Clock, AlertTriangle, TestTube, Trash2, ShieldAlert } from 'lucide-react';
import { TranslationDictionary } from '../utils/translations';
import { getExchangeRate } from '../utils/currency';

interface SessionSidebarProps {
  history: InvoiceData[];
  currentId?: string;
  onSelect: (data: InvoiceData) => void;
  onNewInvoice: () => void;
  onExportAll: () => void;
  onClearAll: () => void;
  t: TranslationDictionary;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
  sessionStartTime: number | null;
  exportFormat?: string; // Optional if you have export format logic
  onFormatChange?: (format: string) => void;
}

type Tab = 'list' | 'stats';

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#ef4444', '#64748b'];

export const SessionSidebar: React.FC<SessionSidebarProps> = ({ 
  history, 
  currentId, 
  onSelect, 
  onNewInvoice, 
  onExportAll, 
  onClearAll,
  t,
  isDemoMode,
  onToggleDemoMode,
  sessionStartTime,
  exportFormat = 'csv',
  onFormatChange
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('list');
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Update elapsed time every minute
  useEffect(() => {
    if (!sessionStartTime) {
        setElapsedMinutes(0);
        return;
    }

    const updateTimer = () => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((now - sessionStartTime) / 60000));
        setElapsedMinutes(diff);
    };

    updateTimer(); // Initial update
    const interval = setInterval(updateTimer, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [sessionStartTime]);
  
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

    // Sensitive Data Check
    const hasSensitive = data.hasSensitiveData;

    return isStale || hasHighRiskItem || hasSensitive;
  };

  // --- Statistics Logic ---
  const stats = useMemo(() => {
    if (history.length === 0) return null;

    let totalValueUSD = 0;
    let totalTime = 0;
    const catCounts: Record<string, number> = {};
    const categorySpend: Record<string, number> = {};
    const vendorFrequency: Record<string, number> = {};
    const currencyDist: Record<string, number> = {};

    history.forEach(doc => {
      // Currency Conversion to USD
      const { rate } = getExchangeRate(doc.currencySymbol, 'USD');
      totalValueUSD += (doc.totalAmount || 0) * rate;

      // Processing Time
      if (doc.processingTimeMs) totalTime += doc.processingTimeMs;

      // Categories Counts & Spend
      doc.lineItems.forEach(item => {
         const cat = item.glCategory || 'Uncategorized';
         catCounts[cat] = (catCounts[cat] || 0) + 1;
         
         // Add to category spend (normalized to USD)
         const itemTotalUSD = (item.totalAmount || 0) * rate;
         categorySpend[cat] = (categorySpend[cat] || 0) + itemTotalUSD;
      });

      // Vendor Frequency
      const vendor = doc.vendorName || 'Unknown';
      vendorFrequency[vendor] = (vendorFrequency[vendor] || 0) + 1;

      // Currency Distribution
      const curr = doc.currencySymbol || 'UNK';
      currencyDist[curr] = (currencyDist[curr] || 0) + 1;
    });

    // --- Prepare Chart Data ---

    // 1. Spending Breakdown (Pie Chart Data)
    const sortedSpend = Object.entries(categorySpend)
        .sort(([, a], [, b]) => b - a);
    
    // Cap at top 5 for cleaner chart, group rest as "Other"
    let finalSpend = sortedSpend.slice(0, 5);
    const otherSpend = sortedSpend.slice(5).reduce((acc, [, val]) => acc + val, 0);
    if (otherSpend > 0) finalSpend.push([t.other, otherSpend]);

    const spendTotal = finalSpend.reduce((acc, [, val]) => acc + val, 0);
    const spendingChartData = finalSpend.map(([label, value], idx) => ({
        label,
        value,
        percent: (value / spendTotal) * 100,
        color: CHART_COLORS[idx % CHART_COLORS.length]
    }));

    // Generate Conic Gradient String for CSS Pie Chart
    let currentDeg = 0;
    const conicGradient = spendingChartData.map(item => {
        const deg = (item.percent / 100) * 360;
        const segment = `${item.color} ${currentDeg}deg ${currentDeg + deg}deg`;
        currentDeg += deg;
        return segment;
    }).join(', ');


    // 2. Vendor Frequency (Bar Chart Data)
    const topVendors = Object.entries(vendorFrequency)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([label, value], idx) => ({
            label,
            value,
            percent: (value / history.length) * 100, // Relative to total docs mostly
            color: CHART_COLORS[idx % CHART_COLORS.length]
        }));
    // Normalize bar widths to the max value for better visual
    const maxVendorCount = Math.max(...topVendors.map(v => v.value));
    topVendors.forEach(v => v.percent = (v.value / maxVendorCount) * 100);

    // 3. Currency Distribution (Simple Bar)
    const currencyChartData = Object.entries(currencyDist)
        .sort(([, a], [, b]) => b - a)
        .map(([label, value], idx) => ({
            label,
            value,
            color: CHART_COLORS[idx % CHART_COLORS.length]
        }));


    return {
        totalDocs: history.length,
        totalValueUSD,
        avgTime: totalTime / history.length / 1000,
        spendingChartData,
        conicGradient,
        topVendors,
        currencyChartData
    };
  }, [history, t]);

  return (
    <div className="h-full flex flex-col bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200 dark:border-white/5 w-full">
      
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-200 dark:border-white/5 space-y-3">
        
        {/* Session Timer & Privacy Info */}
        {sessionStartTime && (
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 font-medium px-1">
                <div className="flex items-center space-x-1.5" title={t.sessionPrivacyInfo}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="cursor-help border-b border-dashed border-slate-400/50 dark:border-slate-500/50">
                        {t.sessionActive.replace('{minutes}', elapsedMinutes.toString())}
                    </span>
                </div>
                <Clock className="w-3 h-3 opacity-70" />
            </div>
        )}
        
        {/* Demo Mode Toggle */}
        <div 
          onClick={onToggleDemoMode}
          className={`
            w-full p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all duration-300 shadow-sm group mb-3
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
        
        {/* Separator */}
        <div className="border-b border-slate-200 dark:border-slate-700/50 my-2"></div>

        {/* Tab Toggle - Fixed Spacing */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg gap-2 mb-4">
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
                         {item.hasSensitiveData ? <ShieldAlert className="w-3 h-3 text-amber-500" /> : <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>}
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

                        {/* Chart 1: Spending Breakdown (Pie) */}
                        <div className="bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">{t.spendingBreakdown}</h4>
                            <div className="flex items-center">
                                {/* CSS Conic Gradient Donut Chart */}
                                <div className="relative w-24 h-24 shrink-0">
                                    <div 
                                        className="w-full h-full rounded-full"
                                        style={{ background: `conic-gradient(${stats.conicGradient})` }}
                                    ></div>
                                    <div className="absolute inset-4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center">
                                        <PieChart className="w-5 h-5 text-slate-300" />
                                    </div>
                                </div>
                                {/* Legend */}
                                <div className="ml-4 flex-1 space-y-1.5 min-w-0">
                                    {stats.spendingChartData.map((d, i) => (
                                        <div key={i} className="flex items-center text-xs justify-between">
                                            <div className="flex items-center min-w-0">
                                                <div className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: d.color }}></div>
                                                <span className="truncate text-slate-600 dark:text-slate-300 max-w-[80px]">{d.label}</span>
                                            </div>
                                            <span className="font-mono text-[9px] text-slate-400">{Math.round(d.percent)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Chart 2: Top Vendors (Bar) */}
                        <div className="bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3">{t.vendorFrequency}</h4>
                            <div className="space-y-2">
                                {stats.topVendors.map((v, idx) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                                            <span className="truncate">{v.label}</span>
                                            <span className="font-mono text-[9px] opacity-60">{v.value}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full rounded-full transition-all duration-1000" 
                                                style={{ width: `${v.percent}%`, backgroundColor: v.color }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Chart 3: Currency & Activity */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{t.currencyDist}</h4>
                                <div className="space-y-1.5">
                                    {stats.currencyChartData.map((c, i) => (
                                        <div key={i} className="flex items-center justify-between text-xs">
                                            <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{c.label}</span>
                                            <div className="flex items-center">
                                                <div className="h-1.5 w-12 bg-slate-100 dark:bg-slate-700 rounded-r-md rounded-l-sm overflow-hidden mr-1.5">
                                                    <div 
                                                        className="h-full rounded-full" 
                                                        style={{ width: `${(c.value / stats.totalDocs) * 100}%`, backgroundColor: c.color }} 
                                                    />
                                                </div>
                                                <span className="text-[9px] opacity-60">{c.value}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                             {/* Timeline / Activity */}
                             <div className="bg-white/40 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-white/5">
                                <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">{t.recentActivity}</h4>
                                <div className="space-y-2 relative">
                                    <div className="absolute left-1.5 top-1 bottom-1 w-px bg-slate-200 dark:bg-slate-700"></div>
                                    {history.slice(0, 4).map((doc, i) => (
                                        <div key={doc.id} className="relative pl-4 flex flex-col justify-center min-h-[24px]">
                                            <div className="absolute left-0 top-1.5 w-3 h-3 bg-white dark:bg-slate-800 border-2 border-indigo-500 rounded-full z-10"></div>
                                            <span className="text-[10px] text-slate-700 dark:text-slate-300 truncate font-medium">{doc.vendorName}</span>
                                            <span className="text-[8px] text-slate-400 font-mono">
                                                {doc.processingTimeMs ? `${(doc.processingTimeMs/1000).toFixed(1)}s` : 'Processed'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </>
                )}
            </div>
        )}
      </div>

      {/* Footer - Export Format & Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
        {onFormatChange && (
          <div className="space-y-1">
             <label className="text-[9px] font-bold uppercase tracking-wide text-slate-500">Export Format</label>
             <select 
               value={exportFormat}
               onChange={(e) => onFormatChange(e.target.value)}
               className="w-full text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
             >
                <option value="csv">Generic CSV</option>
                <option value="quickbooks">QuickBooks Import</option>
                <option value="xero">Xero Import</option>
                <option value="sap">SAP Format</option>
                <option value="excel">Excel Template</option>
             </select>
          </div>
        )}

        <button 
            onClick={onExportAll}
            disabled={history.length === 0}
            className="w-full py-2 flex items-center justify-center space-x-2 text-xs font-semibold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Download className="w-3.5 h-3.5" />
            <span>{t.exportCombined}</span>
        </button>
        <button 
            onClick={onClearAll}
            disabled={history.length === 0}
            className="w-full py-2 flex items-center justify-center space-x-2 text-xs font-semibold text-red-500/80 dark:text-red-400/80 border border-red-200/50 dark:border-red-500/20 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.clearData}</span>
        </button>
      </div>
    </div>
  );
};
