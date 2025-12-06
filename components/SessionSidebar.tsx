
import React from 'react';
import { InvoiceData } from '../types';
import { FileText, FileBox, FileCheck, AlertCircle, CheckCircle2, ChevronRight, History } from 'lucide-react';
import { TranslationDictionary } from '../utils/translations';

interface SessionSidebarProps {
  history: InvoiceData[];
  currentId?: string;
  onSelect: (data: InvoiceData) => void;
  t: TranslationDictionary;
}

export const SessionSidebar: React.FC<SessionSidebarProps> = ({ history, currentId, onSelect, t }) => {
  
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

  return (
    <div className="h-full flex flex-col bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border-r border-slate-200 dark:border-white/5 w-full">
      <div className="p-5 border-b border-slate-200 dark:border-white/5 flex items-center space-x-2">
        <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {t.sessionTrail}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
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
    </div>
  );
};
