
import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { InvoiceEditor } from './components/InvoiceEditor';
import { SessionSidebar } from './components/SessionSidebar';
import { extractInvoiceData, translateLineItems } from './services/geminiService';
import { InvoiceData, ProcessingState } from './types';
import { Loader2, Download, Wand2, ShieldCheck, AlertCircle, Languages, Sun, Moon, Coins } from 'lucide-react';
import { translations } from './utils/translations';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [sessionHistory, setSessionHistory] = useState<InvoiceData[]>([]);
  const [processingState, setProcessingState] = useState<ProcessingState>({ status: 'idle' });
  const [targetLanguage, setTargetLanguage] = useState<string>('English');
  const [targetCurrency, setTargetCurrency] = useState<string>('Original');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Get current translations
  const t = translations[targetLanguage] || translations['English'];

  // Toggle theme handler
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    // Don't clear invoiceData immediately to allow viewing history while uploading
    setProcessingState({ status: 'idle' });
  };

  const handleClearFile = () => {
    setFile(null);
    // Only clear if we are starting a fresh flow, but typically we might want to stay on the current view
    setProcessingState({ status: 'idle' });
  };

  const handleSanitize = async () => {
    if (!file) return;

    setProcessingState({ status: 'processing', message: t.processing });
    
    try {
      const data = await extractInvoiceData(file);
      // Assign a unique ID for the session and default language
      const dataWithId: InvoiceData = { 
        ...data, 
        id: crypto.randomUUID(),
        language: 'Original',
        originalLineItems: data.lineItems // Snapshot original data
      };
      
      setInvoiceData(dataWithId);
      setSessionHistory(prev => [dataWithId, ...prev]);
      setProcessingState({ status: 'complete' });
      // Removed setTargetLanguage and setTargetCurrency resets to persist user selection
    } catch (error) {
      setProcessingState({ 
        status: 'error', 
        message: t.uploadError 
      });
    }
  };

  const handleInvoiceChange = (newData: InvoiceData) => {
    // If we are editing in 'Original' mode, update the backup so future translations are correct
    if (targetLanguage === 'Original' || newData.language === 'Original') {
      newData.originalLineItems = newData.lineItems;
    }

    setInvoiceData(newData);
    // Sync changes back to history
    setSessionHistory(prev => prev.map(item => item.id === newData.id ? newData : item));
  };

  const handleHistorySelect = (data: InvoiceData) => {
      setInvoiceData(data);
      // When selecting history, if the data language matches a target, sync dropdown
      if (data.language && ['English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Portuguese', 'Turkish', 'Polish', 'Hindi', 'Arabic'].includes(data.language)) {
          setTargetLanguage(data.language);
      } else {
          setTargetLanguage('Original');
      }
      setProcessingState({ status: 'complete' });
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetLanguage(e.target.value);
  };

  // Auto-Trigger Translation Effect
  // This watches for changes in the active document ID or the target language.
  useEffect(() => {
    if (!invoiceData?.id || !targetLanguage) return;

    // Logic: Revert to Original
    if (targetLanguage === 'Original') {
      if (invoiceData.language !== 'Original') {
        // Restore from backup if available, otherwise just keep current (fallback)
        const originalItems = invoiceData.originalLineItems || invoiceData.lineItems;
        const revertedData = { 
          ...invoiceData, 
          lineItems: originalItems, 
          language: 'Original' 
        };
        
        // Update State
        setInvoiceData(revertedData);
        setSessionHistory(prev => prev.map(item => item.id === invoiceData.id ? revertedData : item));
      }
      return;
    }

    // Logic: Translate to Target
    if (invoiceData.language !== targetLanguage) {
      const autoTranslate = async () => {
        setIsTranslating(true);
        try {
          // Always translate from the SOURCE OF TRUTH (Original) to avoid translation degradation
          const sourceItems = invoiceData.originalLineItems || invoiceData.lineItems;
          const translatedItems = await translateLineItems(sourceItems, targetLanguage);
          
          const updatedData = { 
            ...invoiceData, 
            lineItems: translatedItems, 
            language: targetLanguage,
            // Ensure we persist the original backup if it wasn't there
            originalLineItems: invoiceData.originalLineItems || sourceItems 
          };
          
          // Safer state update
          setInvoiceData(current => {
            if (current?.id === invoiceData.id) {
              return updatedData;
            }
            return current;
          });

          setSessionHistory(prev => prev.map(item => item.id === invoiceData.id ? updatedData : item));
        } catch (error) {
          console.error("Auto-translation error:", error);
        } finally {
          setIsTranslating(false);
        }
      };
      autoTranslate();
    }
  }, [invoiceData?.id, invoiceData?.language, targetLanguage]);

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTargetCurrency(e.target.value);
  };

  const handleDownloadCSV = () => {
    if (!invoiceData) return;

    // Use translated headers
    const headers = [
      t.csvDocumentType,
      t.csvVendor,
      t.csvDate,
      t.csvTotalAmount,
      t.csvCurrency,
      t.csvSku,
      t.csvDescription,
      t.csvGlCategory,
      t.csvQuantity,
      t.csvUnitPrice,
      t.csvLineTotal
    ];

    const rows = invoiceData.lineItems.map(item => [
      `"${(invoiceData.documentType || 'Unknown').replace(/"/g, '""')}"`,
      `"${invoiceData.vendorName.replace(/"/g, '""')}"`,
      invoiceData.invoiceDate,
      invoiceData.totalAmount,
      invoiceData.currencySymbol || '$',
      `"${(item.sku || '').replace(/"/g, '""')}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${(item.glCategory || '').replace(/"/g, '""')}"`,
      item.quantity,
      item.unitPrice,
      (item.totalAmount || 0).toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `sanitized_${(invoiceData.documentType || 'doc').toLowerCase().replace(/\s/g, '_')}_${invoiceData.vendorName || 'export'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div 
        dir={targetLanguage === 'Arabic' ? 'rtl' : 'ltr'}
        className="h-screen overflow-hidden transition-colors duration-500 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-[#0f172a] dark:via-[#1e293b] dark:to-[#0f172a] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30"
      >
        
        {/* Header */}
        <header className="border-b border-slate-200 dark:border-white/5 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md sticky top-0 z-50 transition-colors duration-500 shrink-0">
          <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg shadow-lg shadow-indigo-500/20 ring-1 ring-black/5 dark:ring-white/10">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  {t.appTitle} <span className="text-indigo-600 dark:text-indigo-400">{t.sanitizer}</span>
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              
              {/* Theme Toggle */}
              <button 
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm focus:outline-none group"
                title={t.toggleTheme}
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 group-hover:text-black" />}
              </button>

              {/* Currency Dropdown */}
              <div className="hidden sm:flex items-center space-x-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm group">
                  <Coins className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors" />
                  <div className="flex flex-col">
                    <label htmlFor="currency-select" className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase leading-none mb-0.5">
                      {t.targetCurrency}
                    </label>
                    <select 
                      id="currency-select"
                      value={targetCurrency}
                      onChange={handleCurrencyChange}
                      className="bg-transparent text-xs font-bold text-black dark:text-white focus:outline-none cursor-pointer pr-1 min-w-[60px]"
                    >
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Original">{t.original}</option>
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="USD">USD ($)</option>
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="EUR">EUR (€)</option>
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="GBP">GBP (£)</option>
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="JPY">JPY (¥)</option>
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="CNY">CNY (¥)</option>
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="MXN">MXN ($)</option>
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="BRL">BRL (R$)</option>
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="TRY">TRY (₺)</option>
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="PLN">PLN (zł)</option>
                      <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="INR">INR (₹)</option>
                    </select>
                  </div>
              </div>

              {/* Translation Dropdown */}
              <div className="flex items-center space-x-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm group">
                {isTranslating ? (
                  <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" />
                ) : (
                  <Languages className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                )}
                <div className="flex flex-col">
                  <label htmlFor="language-select" className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase leading-none mb-0.5">
                    {t.translateTo}
                  </label>
                  <select 
                    id="language-select"
                    value={targetLanguage}
                    onChange={handleLanguageChange}
                    disabled={isTranslating}
                    className="bg-transparent text-xs font-bold text-black dark:text-white focus:outline-none disabled:opacity-50 cursor-pointer pr-1 min-w-[80px]"
                  >
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Original">{t.original}</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="English">English</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Spanish">Spanish</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="French">French</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="German">German</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Chinese">Chinese</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Japanese">Japanese</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Portuguese">Portuguese</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Turkish">Turkish</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Polish">Polish</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Hindi">Hindi</option>
                    <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Arabic">Arabic</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Split Layout */}
        <div className="flex flex-1 overflow-hidden">
            
            {/* Sidebar - 20% Width */}
            <aside className="w-1/5 min-w-[250px] hidden lg:block h-full overflow-hidden">
                <SessionSidebar 
                    history={sessionHistory} 
                    currentId={invoiceData?.id} 
                    onSelect={handleHistorySelect}
                    t={t}
                />
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 w-full lg:w-4/5 overflow-y-auto p-4 sm:p-6 lg:p-8">
                <div className="max-w-5xl mx-auto space-y-8 pb-10">
                    
                    {/* Hero (Empty State) */}
                    {!invoiceData && sessionHistory.length === 0 && (
                        <div className="text-center space-y-6 mb-12 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {t.heroTitle} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400">{t.financialData}</span>
                        </h2>
                        <p className="text-slate-600 dark:text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
                            {t.heroSubtitle}
                        </p>
                        </div>
                    )}

                    {/* Upload Section */}
                    <div className={`transition-all duration-700 ease-in-out ${invoiceData ? 'grid grid-cols-1 lg:grid-cols-4 gap-8' : 'max-w-3xl mx-auto'}`}>
                        
                        {/* Left Panel: Upload & Actions */}
                        <div className={`space-y-6 ${invoiceData ? 'lg:col-span-1' : 'w-full'}`}>
                        <FileUpload 
                            onFileSelect={handleFileSelect} 
                            selectedFile={file} 
                            onClearFile={handleClearFile}
                            disabled={processingState.status === 'processing'}
                            t={t}
                        />

                        {/* Error Message */}
                        {processingState.status === 'error' && (
                            <div className="p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-start space-x-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                            <p className="text-sm font-medium">{processingState.message}</p>
                            </div>
                        )}

                        {/* Sanitize Action */}
                        {file && (!invoiceData || processingState.status === 'idle') && processingState.status !== 'processing' && (
                            <button
                            onClick={handleSanitize}
                            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] ring-1 ring-white/10"
                            >
                            <Wand2 className="w-5 h-5" />
                            <span>{t.sanitizeAction}</span>
                            </button>
                        )}

                        {/* Loading State */}
                        {processingState.status === 'processing' && (
                            <div className="text-center py-10 space-y-4 bg-white/50 dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-white/5 backdrop-blur-sm">
                            <div className="relative">
                                <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse rounded-full"></div>
                                <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mx-auto relative z-10" />
                            </div>
                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300 animate-pulse tracking-wide">{processingState.message}</p>
                            </div>
                        )}
                        
                        {/* Current File Preview Context */}
                        {invoiceData && (
                            <div className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm p-5 rounded-xl border border-slate-200 dark:border-white/5 text-sm text-slate-500 dark:text-slate-400 shadow-xl dark:shadow-lg transition-colors duration-500">
                                <p className="font-bold text-slate-800 dark:text-slate-300 mb-3 uppercase tracking-wider text-xs">{t.activeDoc}</p>
                                <div className="flex items-center space-x-3 mb-4">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                                        <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="truncate font-medium text-slate-800 dark:text-slate-200">{invoiceData.vendorName}</p>
                                        <p className="text-xs mt-0.5 text-slate-500">{invoiceData.documentType}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleClearFile} 
                                    className="w-full py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-700/30 hover:bg-slate-200 dark:hover:bg-slate-700/50 rounded-lg transition-all border border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                                >
                                    {t.sanitizeNew}
                                </button>
                            </div>
                        )}
                        </div>

                        {/* Right Panel: Editor */}
                        {invoiceData && (
                        <div className="lg:col-span-3 space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-wide flex items-center">
                                <span className="w-2 h-6 bg-indigo-500 rounded-full mr-3"></span>
                                {t.extractedData}
                            </h2>
                            <div className="flex items-center space-x-4">
                                {isTranslating && (
                                    <span className="flex items-center text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-full animate-pulse border border-indigo-200 dark:border-indigo-500/20">
                                        <Languages className="w-3 h-3 mr-2" />
                                        {t.translating}
                                    </span>
                                )}
                                <button
                                onClick={handleDownloadCSV}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 rounded-lg flex items-center space-x-2 transition-all font-semibold text-sm transform hover:-translate-y-0.5"
                                >
                                <Download className="w-4 h-4" />
                                <span>{t.exportCsv}</span>
                                </button>
                            </div>
                            </div>
                            
                            <InvoiceEditor 
                              data={invoiceData} 
                              onChange={handleInvoiceChange} 
                              t={t} 
                              targetCurrency={targetCurrency}
                            />
                        </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
      </div>
    </div>
  );
};

export default App;
