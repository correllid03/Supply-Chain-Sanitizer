
import React, { useRef, useEffect } from 'react';
import { InvoiceData, LineItem } from '../types';
import { Plus, Trash2, Calendar, Building, Tag, AlertTriangle, FileCheck, FileBox, FileText, History, ShieldAlert, CheckCircle, AlertCircle, Calculator, Info, Languages } from 'lucide-react';
import { TranslationDictionary } from '../utils/translations';
import { getExchangeRate, CODE_TO_SYMBOL } from '../utils/currency';

interface InvoiceEditorProps {
  data: InvoiceData;
  onChange: (newData: InvoiceData) => void;
  t: TranslationDictionary;
  targetCurrency?: string;
}

// Helper component for auto-resizing textarea
const AutoResizeTextarea = ({ value, onChange, className, placeholder, isRisk, tabIndex }: { 
  value: string, 
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, 
  className?: string, 
  placeholder?: string,
  isRisk?: boolean,
  tabIndex?: number
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      rows={1}
      placeholder={placeholder}
      className={`${className} ${isRisk ? 'pr-20' : ''}`}
      title={value}
      tabIndex={tabIndex}
    />
  );
};

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ data, onChange, t, targetCurrency = 'Original' }) => {
  
  const handleHeaderChange = (field: keyof InvoiceData, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...data.lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    // Learning Trigger: If GL Category changed manually
    if (field === 'glCategory') {
         // Simple learning simulation: Save keyword mapping to local storage
         const item = newItems[index];
         const words = item.description.split(' ').filter(w => w.length > 4); // simplistic keyword extraction
         if (words.length > 0) {
             const keyword = words[0].toLowerCase();
             const existing = localStorage.getItem('ester_learned_corrections');
             const learned = existing ? JSON.parse(existing) : {};
             learned[keyword] = value;
             localStorage.setItem('ester_learned_corrections', JSON.stringify(learned));
             
             // In a real app, we'd bubble this event up to show a toast
             const event = new CustomEvent('ester-learning', { detail: { keyword, category: value } });
             window.dispatchEvent(event);
         }
    }
    onChange({ ...data, lineItems: newItems });
  };

  const removeLineItem = (index: number) => {
    const newItems = data.lineItems.filter((_, i) => i !== index);
    onChange({ ...data, lineItems: newItems });
  };

  const addLineItem = () => {
    onChange({
      ...data,
      lineItems: [
        ...data.lineItems,
        { sku: '', description: '', glCategory: '', quantity: 1, unitPrice: 0, totalAmount: 0 }
      ]
    });
  };

  const recalculateTotals = () => {
      const newItems = data.lineItems.map(item => ({
          ...item,
          totalAmount: parseFloat((item.quantity * item.unitPrice).toFixed(2))
      }));
      onChange({ ...data, lineItems: newItems });
  };

  const recalculateRow = (index: number) => {
      const newItems = [...data.lineItems];
      const item = newItems[index];
      newItems[index] = { ...item, totalAmount: parseFloat((item.quantity * item.unitPrice).toFixed(2)) };
      onChange({ ...data, lineItems: newItems });
  };

  const getBadgeStyle = (type: string = '') => {
    const tStr = type.toUpperCase();
    if (tStr.includes('INVOICE')) return { 
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]', 
      icon: FileText 
    };
    if (tStr.includes('PACKING')) return { 
      className: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 shadow-[0_0_15px_-3px_rgba(249,115,22,0.2)]', 
      icon: FileBox 
    };
    if (tStr.includes('BOL') || tStr.includes('LADING')) return { 
      className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]', 
      icon: FileCheck 
    };
    return { 
      className: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20', 
      icon: FileText 
    };
  };

  const isStaleDate = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    return !isNaN(date.getTime()) && date < twoYearsAgo;
  };

  const isHighRiskItem = (category: string, price: number) => {
    const cat = (category || '').toLowerCase();
    const isTargetCategory = cat.includes('meal') || cat.includes('office');
    return isTargetCategory && price > 100;
  };

  // --- Currency Conversion Logic ---
  const currencySymbol = data.currencySymbol || '$';
  const showConversion = targetCurrency !== 'Original';
  const { rate, sourceCode } = getExchangeRate(currencySymbol, targetCurrency);
  const isActuallyDifferent = showConversion && (rate !== 1 || sourceCode !== targetCurrency);

  let displayTotalAmount = data.totalAmount;
  let displayCurrencySymbol = data.currencySymbol;
  let isReadOnlyHeader = false;

  if (isActuallyDifferent) {
    displayTotalAmount = parseFloat((data.totalAmount * rate).toFixed(2));
    displayCurrencySymbol = CODE_TO_SYMBOL[targetCurrency] || targetCurrency;
    isReadOnlyHeader = true;
  }

  const badgeStyle = getBadgeStyle(data.documentType);
  const BadgeIcon = badgeStyle.icon;

  const isHighConfidence = data.confidenceScore === 'High';
  const hasMathMismatch = data.lineItems.some(i => Math.abs((i.quantity * i.unitPrice) - (i.totalAmount || 0)) > 0.01);
  const [viewMode, setViewMode] = React.useState<'flat' | 'group'>('flat');

  // Grouping Logic
  const groupedItems = viewMode === 'group' 
    ? data.lineItems.reduce((acc, item) => {
        const cat = item.glCategory || 'Uncategorized';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
      }, {} as Record<string, LineItem[]>)
    : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 slide-in-from-bottom-8">
      
      {/* Header Metadata - Compact View */}
      <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm p-4 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-sm transition-colors duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-slate-200 dark:border-white/5 pb-4">
            {/* Document Type Badge */}
            <div className={`px-3 py-1.5 rounded-lg border flex items-center space-x-2 w-fit ${badgeStyle.className}`}>
                <BadgeIcon className="w-4 h-4" />
                <span className="text-xs font-bold tracking-widest uppercase">
                    {t.documentType}: {data.documentType || 'UNKNOWN'}
                </span>
            </div>
            
            {/* Quality Assurance Bar */}
            <div className="flex flex-wrap items-center gap-2">
               {/* Confidence Badge */}
               <div 
                 className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border flex items-center space-x-1.5 ${isHighConfidence ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'}`}
                 title={isHighConfidence ? "High confidence in data extraction" : "This invoice has data quality issues that need manual review"}
               >
                 {isHighConfidence ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                 <span>{isHighConfidence ? t.confidenceHigh : t.confidenceReview}</span>
               </div>
               
               {/* UNSUPPORTED CURRENCY WARNING */}
               {data.validationFlags?.unsupportedCurrency && (
                 <div className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center space-x-1.5" title="Exchange rates not available for this currency">
                    <AlertCircle className="w-3 h-3" />
                    <span>UNKNOWN CURRENCY</span>
                 </div>
               )}

               {/* UNSUPPORTED LANGUAGE WARNING */}
               {data.validationFlags?.unsupportedLanguage && (
                 <div className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center space-x-1.5" title="UI translation not fully supported for this language">
                    <AlertTriangle className="w-3 h-3" />
                    <span>UNSUPPORTED LANG</span>
                 </div>
               )}
               
               {/* Specific Validation Warnings */}
               {data.validationFlags?.hasZeroPrices && (
                 <div className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 flex items-center space-x-1.5" title="Some items have 0.00 price">
                    <AlertCircle className="w-3 h-3" />
                    <span>{t.verifyPrices}</span>
                 </div>
               )}
               {data.validationFlags?.lowItemCount && (
                 <div 
                    className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center space-x-1.5" 
                    title="This invoice has fewer line items than expected"
                 >
                    <AlertCircle className="w-3 h-3" />
                    <span>{t.lowItemCount}</span>
                 </div>
               )}
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {/* Vendor Name */}
            <div className="col-span-1 md:col-span-1 space-y-1">
                 <div className="flex justify-between items-center">
                    <label className="flex items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        <Building className="w-3 h-3 mr-1.5 opacity-70" />
                        {t.vendorName}
                    </label>
                 </div>
                 <input
                    type="text"
                    value={data.vendorName}
                    onChange={(e) => handleHeaderChange('vendorName', e.target.value)}
                    className="w-full bg-transparent border-b-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-indigo-500 focus:bg-white/50 dark:focus:bg-slate-900/50 rounded-t-sm px-1 py-1 text-sm font-bold text-slate-800 dark:text-slate-100 focus:outline-none transition-all placeholder-slate-400"
                    placeholder={t.vendorName}
                    tabIndex={1}
                 />
            </div>

            {/* Invoice Date */}
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <label className="flex items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                        {t.invoiceDate}
                    </label>
                    {isStaleDate(data.invoiceDate) && (
                        <div className="flex items-center space-x-1 bg-amber-500/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-amber-600 dark:text-amber-500" title={t.staleDataWarning}>
                            <History className="w-2.5 h-2.5" />
                            <span>{t.staleTag}</span>
                        </div>
                    )}
                </div>
                <input
                    type="date"
                    value={data.invoiceDate}
                    onChange={(e) => handleHeaderChange('invoiceDate', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none focus:border-indigo-500 transition-all"
                    tabIndex={2}
                />
            </div>

            {/* Detected Language (NEW) */}
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <label className="flex items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        <Languages className="w-3 h-3 mr-1.5 opacity-70" />
                        Language
                    </label>
                </div>
                <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-medium flex items-center">
                    {data.detectedLanguage || data.language || 'Unknown'}
                </div>
            </div>

            {/* Currency */}
            <div className="space-y-1">
                <div className="flex justify-between items-center">
                    <label className="flex items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        <Tag className="w-3 h-3 mr-1.5 opacity-70" />
                        {t.currency}
                    </label>
                </div>
                <input
                    type="text"
                    value={displayCurrencySymbol}
                    onChange={(e) => !isReadOnlyHeader && handleHeaderChange('currencySymbol', e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-slate-900/50 border rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-medium focus:outline-none transition-all ${isReadOnlyHeader ? 'border-transparent cursor-default' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'}`}
                    maxLength={3}
                    readOnly={isReadOnlyHeader}
                    tabIndex={3}
                />
            </div>

            {/* Total Amount */}
            <div className="space-y-1">
                 <div className="flex justify-between items-center">
                    <label className="flex items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                        <span className="mr-1.5 opacity-70 font-bold">{displayCurrencySymbol}</span> 
                        {t.totalAmount}
                    </label>
                 </div>
                 <input
                    type="number"
                    step="0.01"
                    value={displayTotalAmount}
                    onChange={(e) => !isReadOnlyHeader && handleHeaderChange('totalAmount', parseFloat(e.target.value) || 0)}
                    className={`w-full bg-slate-50 dark:bg-slate-900/50 border rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-bold focus:outline-none transition-all ${isReadOnlyHeader ? 'border-transparent cursor-default' : 'border-slate-200 dark:border-slate-700 focus:border-indigo-500'}`}
                    readOnly={isReadOnlyHeader}
                    tabIndex={4}
                 />
            </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white/40 dark:bg-slate-800/30 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-2xl dark:shadow-2xl transition-colors duration-500 overflow-hidden">
        <div className="p-3 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center bg-white/40 dark:bg-white/5">
          <div className="flex items-center space-x-4">
             <h3 className="font-semibold text-slate-800 dark:text-slate-200 tracking-wide text-xs uppercase">{t.lineItems}</h3>
             <span className="text-[10px] text-slate-500 font-mono bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full">{data.lineItems.length} {t.itemsDetected}</span>
             
             {/* View Toggle */}
             <div className="flex bg-slate-100 dark:bg-slate-700/50 rounded-lg p-0.5">
                 <button 
                    onClick={() => setViewMode('flat')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${viewMode === 'flat' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}
                 >
                    List
                 </button>
                 <button 
                    onClick={() => setViewMode('group')}
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${viewMode === 'group' ? 'bg-white dark:bg-slate-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-slate-500'}`}
                 >
                    Group
                 </button>
             </div>
          </div>
          {hasMathMismatch && (
              <button 
                onClick={recalculateTotals}
                className="flex items-center space-x-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold uppercase tracking-wide hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors border border-indigo-200 dark:border-indigo-500/30 animate-pulse"
              >
                  <Calculator className="w-3 h-3" />
                  <span>{t.fixAll}</span>
              </button>
          )}
        </div>
        
        <div className="w-full overflow-x-auto">
          {viewMode === 'flat' ? (
              <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-[10px] uppercase tracking-widest">
                    <th className={`p-2 font-bold ${isActuallyDifferent ? 'w-[12%]' : 'w-[12%]'} whitespace-nowrap`}>{t.sku}</th>
                    <th className={`p-2 font-bold ${isActuallyDifferent ? 'w-[28%]' : 'w-[32%]'}`}>{t.description}</th>
                    <th className={`p-2 font-bold ${isActuallyDifferent ? 'w-[18%]' : 'w-[20%]'}`}>{t.glCategory}</th>
                    <th className={`p-2 font-bold w-[7%] text-center whitespace-nowrap`}>{t.qty}</th>
                    <th className={`p-2 font-bold w-[12%] text-right whitespace-nowrap`}>{t.unitPrice}</th>
                    <th className={`p-2 font-bold w-[12%] text-right whitespace-nowrap`}>{t.lineTotal}</th>
                    {isActuallyDifferent && (
                    <th className="p-2 font-bold w-[12%] text-right bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-l border-emerald-100 dark:border-emerald-500/20 whitespace-nowrap">
                        {t.convertedTotal}
                    </th>
                    )}
                    <th className="p-2 w-[4%] text-center"></th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
                {data.lineItems.map((item, index) => {
                    const calculatedTotal = item.quantity * item.unitPrice;
                    const extractedTotal = item.totalAmount || 0;
                    const hasVariance = Math.abs(calculatedTotal - extractedTotal) > 0.01;
                    const isRisk = isHighRiskItem(item.glCategory, item.unitPrice);
                    const convertedValue = isActuallyDifferent ? extractedTotal * rate : 0;
                    const baseTabIndex = 10 + (index * 10);
                    
                    // Confidence Color Logic
                    const conf = item.glConfidence || 0;
                    const confColor = conf > 80 ? 'bg-green-500' : conf > 50 ? 'bg-yellow-500' : 'bg-red-500';

                    return (
                    <tr 
                        key={index} 
                        className={`transition-all duration-200 group ${hasVariance ? 'bg-red-50 dark:bg-red-500/5' : isRisk ? 'bg-orange-50 dark:bg-orange-500/5' : 'hover:bg-white/40 dark:hover:bg-white/5'}`}
                    >
                        {/* SKU */}
                        <td className="p-2 align-top">
                        <AutoResizeTextarea
                            value={item.sku || ''}
                            onChange={(e) => handleLineItemChange(index, 'sku', e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500/50 rounded px-1.5 py-1 text-slate-700 dark:text-slate-300 text-xs focus:outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 font-mono resize-none overflow-hidden min-h-[28px]"
                            placeholder={t.sku}
                            tabIndex={baseTabIndex + 1}
                        />
                        </td>

                        {/* Description */}
                        <td className="p-2 align-top relative">
                        <AutoResizeTextarea
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500/50 rounded px-1.5 py-1 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 resize-none overflow-hidden min-h-[28px] whitespace-normal break-words leading-relaxed"
                            isRisk={isRisk}
                            tabIndex={baseTabIndex + 2}
                        />
                        {isRisk && (
                            <div className="absolute top-1 right-1 pointer-events-none z-10">
                                <span className="flex items-center space-x-1 text-[8px] font-bold text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-1 py-0.5 rounded uppercase tracking-wider shadow-sm">
                                    <ShieldAlert className="w-3 h-3" />
                                    <span className="hidden xl:inline">{t.highRisk}</span>
                                </span>
                            </div>
                        )}
                        </td>

                        {/* GL Category */}
                        <td className="p-2 align-top">
                        <div className="relative group/tooltip">
                            <AutoResizeTextarea
                            value={item.glCategory || ''}
                            onChange={(e) => handleLineItemChange(index, 'glCategory', e.target.value)}
                            className={`w-full border border-transparent hover:border-opacity-50 focus:border-opacity-80 rounded-xl px-2 py-1.5 text-[10px] font-bold text-left focus:outline-none focus:bg-opacity-100 transition-all shadow-sm resize-none overflow-hidden min-h-[26px] whitespace-normal break-words leading-tight ${
                                isRisk 
                                ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30' 
                                : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 hover:border-blue-400 dark:hover:border-blue-500/30'
                            }`}
                            placeholder="Uncategorized"
                            tabIndex={baseTabIndex + 3}
                            />
                            {/* Confidence Indicator Dot */}
                            {item.glConfidence && (
                                <div className={`absolute top-0 right-0 w-2 h-2 rounded-full border border-white ${confColor} transform translate-x-1/2 -translate-y-1/2`}></div>
                            )}
                            
                            {/* AI Reasoning Tooltip */}
                            {item.glReasoning && (
                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-slate-900/95 backdrop-blur text-[10px] text-white p-2 rounded shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-20">
                                    <p className="font-bold text-indigo-300 mb-1">AI Reasoning ({conf}%):</p>
                                    {item.glReasoning}
                                </div>
                            )}
                        </div>
                        </td>

                        {/* Quantity */}
                        <td className="p-2 align-top">
                        <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500/50 rounded px-1 py-1 text-slate-800 dark:text-slate-200 text-xs text-center focus:outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 font-medium"
                            tabIndex={baseTabIndex + 4}
                        />
                        </td>

                        {/* Unit Price */}
                        <td className="p-2 text-right align-top">
                        <input
                            type="number"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                            className={`w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500/50 rounded px-1 py-1 text-xs text-right focus:outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 font-medium ${isRisk ? 'text-red-500 dark:text-red-300 font-bold' : 'text-slate-800 dark:text-slate-200'}`}
                            tabIndex={baseTabIndex + 5}
                        />
                        </td>

                        {/* Line Total */}
                        <td className="p-2 text-right pr-2 relative align-top">
                        <div className="flex items-center justify-end space-x-1">
                            {hasVariance && (
                            <div className="group/tooltip relative">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                                <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 dark:bg-slate-900/95 backdrop-blur-md text-xs text-white dark:text-slate-200 p-3 rounded-lg border border-slate-700 shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-auto z-10 transform translate-y-2 group-hover/tooltip:translate-y-0 duration-200">
                                <span className="block font-bold text-amber-500 mb-1 uppercase tracking-wide text-[10px]">{t.mathMismatch}</span>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-mono text-indigo-300">{currencySymbol}{calculatedTotal.toFixed(2)}</span>
                                    <button onClick={() => recalculateRow(index)} className="px-2 py-0.5 bg-indigo-500 text-white rounded text-[9px] hover:bg-indigo-600 font-bold">{t.recalculate}</button>
                                </div>
                                </div>
                            </div>
                            )}
                            <div className="flex items-center w-full justify-end">
                            <span className="text-slate-500 mr-0.5 text-[10px] font-medium">{currencySymbol}</span>
                            <input
                                type="number"
                                step="0.01"
                                value={item.totalAmount}
                                onChange={(e) => handleLineItemChange(index, 'totalAmount', parseFloat(e.target.value) || 0)}
                                className={`w-full min-w-0 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500/50 rounded px-1 py-1 text-xs text-right focus:outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 font-bold ${hasVariance ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}
                                tabIndex={baseTabIndex + 6}
                            />
                            </div>
                        </div>
                        </td>
                        
                        {/* Converted Column */}
                        {isActuallyDifferent && (
                        <td className="p-2 text-right pr-2 bg-emerald-50/50 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-500/20 align-top">
                            <div className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400 py-1">
                                {convertedValue.toFixed(2)}
                            </div>
                        </td>
                        )}

                        <td className="p-2 text-center align-top">
                        <button
                            onClick={() => removeLineItem(index)}
                            className="p-1.5 mt-0.5 text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 transform scale-90 hover:scale-100"
                            tabIndex={-1}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        </td>
                    </tr>
                    );
                })}
                {data.lineItems.length === 0 && (
                    <tr>
                    <td colSpan={isActuallyDifferent ? 8 : 7} className="p-8 text-center text-slate-500 italic text-xs">
                        {t.noLineItems}
                    </td>
                    </tr>
                )}
                </tbody>
              </table>
          ) : (
            // GROUPED VIEW
            <div className="space-y-4 p-4">
                 {Object.entries(groupedItems || {}).map(([category, items]) => (
                     <div key={category} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                         <div className="bg-slate-100 dark:bg-slate-800 p-2 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                             <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">{category}</h4>
                             <span className="text-[10px] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 font-mono">
                                 {currencySymbol}{items.reduce((sum, i) => sum + (i.totalAmount||0), 0).toFixed(2)}
                             </span>
                         </div>
                         <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                             {items.map((item, idx) => (
                                 <div key={idx} className="p-2 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                     <div className="text-xs text-slate-600 dark:text-slate-400">{item.description}</div>
                                     <div className="text-xs font-mono">{currencySymbol}{(item.totalAmount||0).toFixed(2)}</div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 ))}
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            onClick={addLineItem}
            className="w-full py-2.5 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500/30"
          >
            <Plus className="w-4 h-4 mr-2" /> {t.addLineItem}
          </button>
        </div>
      </div>
    </div>
  );
};
