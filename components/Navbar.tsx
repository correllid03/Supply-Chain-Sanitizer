
import React from 'react';
import { ShieldCheck, Sun, Moon, Coins, Languages, Plus, History, ChevronRight, Home, Loader2 } from 'lucide-react';
import { TranslationDictionary } from '../utils/translations';

interface NavbarProps {
  t: TranslationDictionary;
  isDarkMode: boolean;
  toggleTheme: () => void;
  currentView: 'home' | 'processing' | 'editor';
  vendorName?: string;
  totalAmount?: number;
  currencySymbol?: string;
  onNavigateHome: () => void;
  onNewInvoice: () => void;
  onToggleHistory: () => void;
  targetCurrency: string;
  onCurrencyChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  targetLanguage: string;
  onLanguageChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  isTranslating: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  t,
  isDarkMode,
  toggleTheme,
  currentView,
  vendorName,
  totalAmount,
  currencySymbol,
  onNavigateHome,
  onNewInvoice,
  onToggleHistory,
  targetCurrency,
  onCurrencyChange,
  targetLanguage,
  onLanguageChange,
  isTranslating
}) => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="border-b border-slate-200 dark:border-white/5 bg-white/70 dark:bg-slate-900/40 backdrop-blur-md sticky top-0 z-50 transition-colors duration-500 shrink-0 shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Logo & Breadcrumbs */}
        <div className="flex items-center space-x-4 min-w-0">
          <div 
            onClick={onNavigateHome}
            className="flex items-center space-x-3 cursor-pointer group shrink-0"
            title={t.home}
          >
            <div className="p-2 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg shadow-lg shadow-indigo-500/20 ring-1 ring-black/5 dark:ring-white/10 group-hover:scale-105 transition-transform duration-300">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                {t.appTitle} <span className="text-indigo-600 dark:text-indigo-400">{t.sanitizer}</span>
              </h1>
            </div>
          </div>

          {/* Breadcrumbs Divider */}
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden sm:block"></div>

          {/* Breadcrumbs */}
          <nav className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 overflow-hidden whitespace-nowrap">
            <button 
              onClick={onNavigateHome} 
              className="flex items-center shrink-0 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition-all duration-200"
            >
              <Home className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline font-medium">{t.home}</span>
            </button>
            
            {currentView !== 'home' && (
              <>
                <ChevronRight className="w-4 h-4 mx-1.5 text-slate-300 dark:text-slate-600 shrink-0" />
                {currentView === 'processing' ? (
                  <span className="text-indigo-600 dark:text-indigo-400 animate-pulse flex items-center font-medium">
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    {t.breadcrumbsProcessing}
                  </span>
                ) : (
                  <button 
                    onClick={scrollToTop}
                    className="flex items-center group text-slate-900 dark:text-slate-200 font-semibold hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors max-w-[200px] md:max-w-[400px]"
                    title={vendorName}
                  >
                    <span className="truncate hover:underline">
                        {vendorName || 'Unknown Vendor'}
                    </span>
                    <span className="ml-2 font-mono text-xs opacity-70 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-500/30 transition-colors shrink-0">
                        {currencySymbol}{totalAmount?.toFixed(2)}
                    </span>
                  </button>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Right: Actions & Settings */}
        <div className="flex items-center space-x-2 md:space-x-3 shrink-0">
          
          {/* New Invoice Button (Visible only when in Editor) */}
          {currentView === 'editor' && (
             <button 
                onClick={onNewInvoice}
                className="hidden md:flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all font-semibold text-xs shadow-sm hover:shadow h-9"
             >
                <Plus className="w-3.5 h-3.5" />
                <span>{t.newInvoice}</span>
             </button>
          )}

          {/* Currency Dropdown */}
          <div className="hidden lg:flex items-center space-x-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm group h-9">
              <Coins className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0" />
              <div className="flex flex-col justify-center">
                <label htmlFor="currency-select" className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase leading-none mb-0.5">
                  {t.targetCurrency}
                </label>
                <select 
                  id="currency-select"
                  value={targetCurrency}
                  onChange={onCurrencyChange}
                  className="bg-transparent text-xs font-bold text-black dark:text-white focus:outline-none cursor-pointer pr-1 min-w-[60px]"
                >
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Original">{t.original}</option>
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="USD">USD ($)</option>
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="EUR">EUR (€)</option>
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="GBP">GBP (£)</option>
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="JPY">JPY (¥)</option>
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="CNY">CNY (¥)</option>
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="CAD">CAD (C$)</option>
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="MXN">MXN ($)</option>
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="AUD">AUD (A$)</option>
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="KRW">KRW (₩)</option>
                  <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="INR">INR (₹)</option>
                </select>
              </div>
          </div>

          {/* Translation Dropdown */}
          <div className="hidden md:flex items-center space-x-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm group h-9">
            {isTranslating ? (
              <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
            ) : (
              <Languages className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0" />
            )}
            <div className="flex flex-col justify-center">
              <label htmlFor="language-select" className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase leading-none mb-0.5">
                {t.translateTo}
              </label>
              <select 
                id="language-select"
                value={targetLanguage}
                onChange={onLanguageChange}
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
                <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Korean">Korean</option>
                <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Italian">Italian</option>
                <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Portuguese">Portuguese</option>
                <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Hindi">Hindi</option>
                <option className="bg-white text-black dark:bg-slate-800 dark:text-white" value="Arabic">Arabic</option>
              </select>
            </div>
          </div>
          
          {/* History Toggle (Mobile/Tablet) */}
          <button
            onClick={onToggleHistory}
            className="p-2 lg:hidden rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm focus:outline-none h-9 w-9 flex items-center justify-center"
            title={t.history}
          >
            <History className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm focus:outline-none group h-9 w-9 flex items-center justify-center"
            title={t.toggleTheme}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4 group-hover:text-black" />}
          </button>

        </div>
      </div>
    </header>
  );
};
