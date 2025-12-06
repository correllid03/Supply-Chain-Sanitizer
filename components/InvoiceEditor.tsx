
import React, { useRef, useEffect } from 'react';
import { InvoiceData, LineItem } from '../types';
import { Plus, Trash2, Calendar, Building, Tag, AlertTriangle, FileCheck, FileBox, FileText, History, ShieldAlert } from 'lucide-react';
import { TranslationDictionary } from '../utils/translations';
import { getExchangeRate, CODE_TO_SYMBOL } from '../utils/currency';

interface InvoiceEditorProps {
  data: InvoiceData;
  onChange: (newData: InvoiceData) => void;
  t: TranslationDictionary;
  targetCurrency?: string;
}

export const InvoiceEditor: React.FC<InvoiceEditorProps> = ({ data, onChange, t, targetCurrency = 'Original' }) => {
  
  const handleHeaderChange = (field: keyof InvoiceData, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const newItems = [...data.lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
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

  // --- Risk Engine Logic ---
  const isStaleDate = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    // Check if valid date and older than 2 years
    return !isNaN(date.getTime()) && date < twoYearsAgo;
  };

  const isHighRiskItem = (category: string, price: number) => {
    const cat = (category || '').toLowerCase();
    const isTargetCategory = cat.includes('meal') || cat.includes('office');
    return isTargetCategory && price > 100;
  };
  // -------------------------

  // --- Currency Conversion Logic ---
  const currencySymbol = data.currencySymbol || '$';
  const showConversion = targetCurrency !== 'Original';
  const { rate, sourceCode } = getExchangeRate(currencySymbol, targetCurrency);
  const isActuallyDifferent = showConversion && (rate !== 1 || sourceCode !== targetCurrency);

  // Calculate Display Values for Header
  let displayTotalAmount = data.totalAmount;
  let displayCurrencySymbol = data.currencySymbol;
  let isReadOnlyHeader = false;

  if (isActuallyDifferent) {
    // Calculate Sum of Converted Line Items
    const sumConverted = data.lineItems.reduce((acc, item) => {
        return acc + ((item.totalAmount || 0) * rate);
    }, 0);
    
    displayTotalAmount = parseFloat(sumConverted.toFixed(2));
    displayCurrencySymbol = CODE_TO_SYMBOL[targetCurrency] || targetCurrency;
    isReadOnlyHeader = true;
  }
  // ---------------------------------

  const badgeStyle = getBadgeStyle(data.documentType);
  const BadgeIcon = badgeStyle.icon;

  const headerFields = [
    { icon: Building, label: t.vendorName, value: data.vendorName, field: 'vendorName', type: 'text', readOnly: false },
    { 
      icon: Calendar, 
      label: t.invoiceDate, 
      value: data.invoiceDate, 
      field: 'invoiceDate', 
      type: 'date',
      warning: isStaleDate(data.invoiceDate) ? t.staleDataWarning : null,
      readOnly: false
    },
    { 
        icon: Tag, 
        label: t.currency, 
        value: displayCurrencySymbol, // Use displayed symbol
        field: 'currencySymbol', 
        type: 'text', 
        width: 'w-16',
        readOnly: isReadOnlyHeader 
    },
    { 
        icon: null, 
        customIcon: <span className="text-sm font-bold">{displayCurrencySymbol}</span>, 
        label: t.totalAmount, 
        value: displayTotalAmount, // Use displayed total
        field: 'totalAmount', 
        type: 'number',
        readOnly: isReadOnlyHeader
    }
  ];

  // Auto-resize textarea logic
  const autoResizeTextarea = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = `${target.scrollHeight}px`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-8">
      
      {/* Document Type Badge */}
      <div className="flex items-start">
        <div className={`px-4 py-2 rounded-lg border flex items-center space-x-2 backdrop-blur-md transition-all duration-300 ${badgeStyle.className}`}>
            <BadgeIcon className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">
                {t.documentType}: {data.documentType || 'UNKNOWN'}
            </span>
        </div>
      </div>

      {/* Header Fields - Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {headerFields.map((item, idx) => (
          <div key={idx} className={`bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm p-5 rounded-xl border border-slate-200 dark:border-slate-700/50 shadow-lg dark:shadow-sm transition-all group overflow-hidden duration-500 ${!item.readOnly ? 'hover:border-indigo-500/30' : ''}`}>
            
            <div className="flex justify-between items-center mb-3">
              <label className="flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">
                {item.icon ? <item.icon className="w-3.5 h-3.5 mr-2 opacity-70" /> : <span className="mr-2 opacity-70">{item.customIcon}</span>} 
                {item.label}
              </label>

              {/* Stale Data Warning Banner - Flex positioning to prevent overlap */}
              {item.warning && (
                <div className="flex items-center space-x-1.5 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wide animate-pulse">
                  <History className="w-3 h-3" />
                  <span>{t.staleTag}</span>
                </div>
              )}
            </div>

            <input
              type={item.type}
              step={item.type === 'number' ? '0.01' : undefined}
              value={item.value}
              onChange={(e) => !item.readOnly && handleHeaderChange(item.field as keyof InvoiceData, item.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
              className={`w-full bg-transparent border-b rounded-none px-0 py-1 text-slate-800 dark:text-slate-100 font-medium focus:outline-none transition-all placeholder-slate-400 dark:placeholder-slate-600 ${item.readOnly ? 'border-transparent cursor-default' : 'border-slate-200 dark:border-slate-700/50 focus:border-indigo-500'}`}
              placeholder={item.label}
              maxLength={item.field === 'currencySymbol' ? 3 : undefined}
              readOnly={item.readOnly}
            />
          </div>
        ))}
      </div>

      {/* Line Items Table */}
      <div className="bg-white/40 dark:bg-slate-800/30 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-2xl dark:shadow-2xl transition-colors duration-500">
        <div className="p-5 border-b border-slate-200 dark:border-slate-700/50 flex justify-between items-center bg-white/40 dark:bg-white/5">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 tracking-wide">{t.lineItems}</h3>
          <div className="px-3 py-1 bg-white/50 dark:bg-slate-900/50 rounded-full border border-slate-200 dark:border-slate-700/50">
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">{data.lineItems.length} {t.itemsDetected}</span>
          </div>
        </div>
        
        {/* Responsive Table Wrapper */}
        <div className="w-full">
          <table className="w-full text-left border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-100/50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-widest">
                <th className={`p-3 font-bold ${isActuallyDifferent ? 'w-[8%]' : 'w-[10%]'} truncate`}>{t.sku}</th>
                <th className={`p-3 font-bold ${isActuallyDifferent ? 'w-[22%]' : 'w-[30%]'} truncate`}>{t.description}</th>
                <th className={`p-3 font-bold ${isActuallyDifferent ? 'w-[15%]' : 'w-[20%]'} truncate`}>{t.glCategory}</th>
                <th className={`p-3 font-bold ${isActuallyDifferent ? 'w-[8%]' : 'w-[10%]'} text-center truncate`}>{t.qty}</th>
                <th className={`p-3 font-bold ${isActuallyDifferent ? 'w-[9%]' : 'w-[10%]'} text-right truncate`}>{t.unitPrice}</th>
                <th className={`p-3 font-bold ${isActuallyDifferent ? 'w-[9%]' : 'w-[10%]'} text-right truncate`}>{t.lineTotal}</th>
                {isActuallyDifferent && (
                  <th className="p-3 font-bold w-[14%] text-right bg-emerald-50/50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-l border-emerald-100 dark:border-emerald-500/20 truncate">
                    <div className="flex flex-col items-end">
                      <span className="truncate w-full text-right">{t.convertedTotal}</span>
                    </div>
                  </th>
                )}
                <th className="p-3 w-[5%] text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/50">
              {data.lineItems.map((item, index) => {
                const calculatedTotal = item.quantity * item.unitPrice;
                const extractedTotal = item.totalAmount || 0;
                const hasVariance = Math.abs(calculatedTotal - extractedTotal) > 0.01;
                const isRisk = isHighRiskItem(item.glCategory, item.unitPrice);
                const convertedValue = isActuallyDifferent ? extractedTotal * rate : 0;

                return (
                  <tr 
                    key={index} 
                    className={`transition-all duration-200 group ${hasVariance ? 'bg-red-50 dark:bg-red-500/5' : isRisk ? 'bg-orange-50 dark:bg-orange-500/5' : 'hover:bg-white/40 dark:hover:bg-white/5'}`}
                  >
                    {/* SKU */}
                    <td className="p-2 pl-3 align-top">
                      <input
                        type="text"
                        value={item.sku || ''}
                        onChange={(e) => handleLineItemChange(index, 'sku', e.target.value)}
                        className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500/50 rounded px-2 py-1.5 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 font-mono"
                        placeholder={t.sku}
                      />
                    </td>

                    {/* Description (Text Area for wrapping) */}
                    <td className="p-2 align-top relative">
                      <textarea
                        value={item.description}
                        onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                        onInput={autoResizeTextarea}
                        rows={1}
                        className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500/50 rounded px-2 py-1.5 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 resize-none overflow-hidden min-h-[34px] whitespace-normal break-words leading-relaxed"
                      />
                       {/* High Risk Tag */}
                       {isRisk && (
                          <div className="absolute top-1 right-2 pointer-events-none z-10">
                            <span className="flex items-center space-x-1 text-[9px] font-bold text-red-500 dark:text-red-400 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm">
                                <ShieldAlert className="w-3 h-3" />
                                <span>{t.highRisk}</span>
                            </span>
                          </div>
                      )}
                    </td>

                    {/* GL Category */}
                    <td className="p-2 align-top">
                       <div className="relative">
                        <input
                          type="text"
                          value={item.glCategory || ''}
                          onChange={(e) => handleLineItemChange(index, 'glCategory', e.target.value)}
                          title={item.glCategory} // Tooltip Fallback
                          className={`w-full border border-transparent hover:border-opacity-50 focus:border-opacity-80 rounded-full px-2 py-1 text-xs font-semibold text-left focus:outline-none focus:bg-opacity-100 transition-all shadow-sm truncate ${
                              isRisk 
                              ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30' 
                              : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300 hover:border-blue-400 dark:hover:border-blue-500/30'
                          }`}
                          placeholder="Uncategorized"
                        />
                       </div>
                    </td>

                    {/* Quantity */}
                    <td className="p-2 align-top">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500/50 rounded px-2 py-1.5 text-slate-800 dark:text-slate-200 text-sm text-center focus:outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 font-medium"
                      />
                    </td>

                    {/* Unit Price */}
                    <td className="p-2 text-right align-top">
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleLineItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className={`w-full bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500/50 rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 font-medium ${isRisk ? 'text-red-500 dark:text-red-300 font-bold' : 'text-slate-800 dark:text-slate-200'}`}
                      />
                    </td>

                    {/* Line Total */}
                    <td className="p-2 text-right pr-3 relative align-top">
                      <div className="flex items-center justify-end space-x-1">
                        {hasVariance && (
                          <div className="group/tooltip relative">
                            <AlertTriangle className="w-4 h-4 text-amber-500 cursor-help" />
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-slate-800 dark:bg-slate-900/95 backdrop-blur-md text-xs text-white dark:text-slate-200 p-3 rounded-lg border border-slate-700 shadow-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-10 transform translate-y-2 group-hover/tooltip:translate-y-0 duration-200">
                              <span className="block font-bold text-amber-500 mb-1 uppercase tracking-wide text-[10px]">{t.mathMismatch}</span>
                              {t.expected}: <span className="font-mono text-indigo-300">{currencySymbol}{calculatedTotal.toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center w-full justify-end">
                          <span className="text-slate-500 mr-1 text-xs font-medium">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={item.totalAmount}
                            onChange={(e) => handleLineItemChange(index, 'totalAmount', parseFloat(e.target.value) || 0)}
                            className={`w-full min-w-0 bg-transparent border border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-indigo-500/50 rounded px-1 py-1.5 text-sm text-right focus:outline-none focus:bg-white/50 dark:focus:bg-slate-900/50 font-bold ${hasVariance ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-200'}`}
                          />
                        </div>
                      </div>
                    </td>
                    
                    {/* Converted Column Cell */}
                    {isActuallyDifferent && (
                      <td className="p-2 text-right pr-3 bg-emerald-50/50 dark:bg-emerald-900/10 border-l border-emerald-100 dark:border-emerald-500/20 align-top">
                          <div className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 py-1.5">
                              {convertedValue.toFixed(2)}
                          </div>
                      </td>
                    )}

                    <td className="p-2 text-center align-top">
                      <button
                        onClick={() => removeLineItem(index)}
                        className="p-1.5 mt-0.5 text-slate-400 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 transform scale-90 hover:scale-100"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {data.lineItems.length === 0 && (
                <tr>
                  <td colSpan={isActuallyDifferent ? 8 : 7} className="p-12 text-center text-slate-500 italic text-sm">
                    {t.noLineItems}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-slate-700/50 bg-slate-50/50 dark:bg-white/[0.02]">
          <button
            onClick={addLineItem}
            className="w-full py-3 flex items-center justify-center text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500/30"
          >
            <Plus className="w-4 h-4 mr-2" /> {t.addLineItem}
          </button>
        </div>
      </div>
    </div>
  );
};
