
import React, { useRef, useState, useCallback } from 'react';
import { Upload, FileText, X, Sparkles, Files, Layers, TestTube, AlertTriangle } from 'lucide-react';
import { TranslationDictionary } from '../utils/translations';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  onClearFile: () => void;
  disabled?: boolean;
  onError: (message: string, code: 'INVALID_FILE') => void;
  t: TranslationDictionary;
  isDemoMode: boolean;
  onToggleDemoMode: () => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onFileSelect, 
  selectedFiles, 
  onClearFile, 
  disabled, 
  onError, 
  t, 
  isDemoMode, 
  onToggleDemoMode 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(false);
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles: File[] = [];
      Array.from(e.dataTransfer.files).forEach((file: File) => {
          if (file.type.startsWith('image/')) {
              validFiles.push(file);
          } else {
              onError(t.fileTypeError, 'INVALID_FILE');
          }
      });
      
      if (validFiles.length > 0) {
          // Limit to 5 files for now
          onFileSelect(validFiles.slice(0, 5));
      }
    }
  }, [onFileSelect, disabled, onError, t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
       const validFiles: File[] = [];
       Array.from(e.target.files).forEach((file: File) => {
          if (file.type.startsWith('image/')) {
              validFiles.push(file);
          } else {
              onError(t.fileTypeError, 'INVALID_FILE');
          }
       });
       if (validFiles.length > 0) {
           onFileSelect(validFiles.slice(0, 5));
       }
    }
  };

  if (selectedFiles.length > 0) {
    const isMultiple = selectedFiles.length > 1;
    
    return (
      <div className="w-full space-y-4">
        {/* Demo Mode Toggle - Visible even when files selected */}
        <div 
          onClick={onToggleDemoMode}
          className={`
            w-full p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-300 shadow-sm
            ${isDemoMode 
              ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30' 
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}
          `}
        >
          <div className="flex items-center space-x-3">
             <div className={`p-1.5 rounded-lg ${isDemoMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                {isDemoMode ? <AlertTriangle className="w-4 h-4" /> : <TestTube className="w-4 h-4" />}
             </div>
             <div>
                <p className={`text-xs font-bold uppercase tracking-wider ${isDemoMode ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                  {isDemoMode ? '⚠️ DEMO MODE ACTIVE' : 'REAL API MODE'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isDemoMode ? 'Using sample data (No API usage)' : 'Live Gemini extraction'}
                </p>
             </div>
          </div>
          <div className={`w-10 h-5 rounded-full relative transition-colors ${isDemoMode ? 'bg-amber-500' : 'bg-slate-300'}`}>
             <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isDemoMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </div>
        </div>

        {/* Selected File Card */}
        <div className="w-full p-6 bg-white/70 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in zoom-in duration-300 ring-1 ring-black/5 dark:ring-white/5 transition-colors duration-500">
          <div className="flex items-center space-x-5 min-w-0 flex-1 mr-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 rounded-xl border border-indigo-500/20 shrink-0 relative z-10">
                  {isMultiple ? <Files className="w-8 h-8 text-indigo-600 dark:text-indigo-400" /> : <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />}
              </div>
              {isMultiple && (
                  <div className="absolute top-1 left-1 w-full h-full bg-indigo-500/10 rounded-xl border border-indigo-500/10 -z-0 rotate-6 transform translate-x-1 translate-y-1"></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide truncate" title={selectedFiles.map(f => f.name).join(', ')}>
                {isMultiple ? `${selectedFiles.length} ${t.filesSelected}` : selectedFiles[0].name}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {isMultiple 
                      ? selectedFiles.map(f => f.name).slice(0, 2).join(', ') + (selectedFiles.length > 2 ? ` +${selectedFiles.length - 2}` : '')
                      : (selectedFiles[0].size / 1024).toFixed(2) + ' KB'}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={onClearFile}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all text-slate-400 hover:text-red-500 dark:hover:text-red-400 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Demo Mode Toggle - Prominently at top */}
      <div 
        onClick={onToggleDemoMode}
        className={`
          w-full p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-300 shadow-sm group
          ${isDemoMode 
            ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 ring-1 ring-amber-500/20' 
            : 'bg-white/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/50'}
        `}
      >
        <div className="flex items-center space-x-3">
           <div className={`p-1.5 rounded-lg transition-colors ${isDemoMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 group-hover:text-indigo-500'}`}>
              {isDemoMode ? <AlertTriangle className="w-4 h-4" /> : <TestTube className="w-4 h-4" />}
           </div>
           <div>
              <p className={`text-xs font-bold uppercase tracking-wider ${isDemoMode ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>
                {isDemoMode ? '⚠️ DEMO MODE ACTIVE' : 'REAL API MODE'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {isDemoMode ? 'Using sample data (No API usage)' : 'Live Gemini extraction'}
              </p>
           </div>
        </div>
        <div className={`w-10 h-5 rounded-full relative transition-colors ${isDemoMode ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
           <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${isDemoMode ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          w-full p-6 sm:p-10 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-500 ease-out relative overflow-hidden group
          flex flex-col items-center justify-center space-y-4
          ${isDragging 
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 scale-[1.01] shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]' 
            : 'border-slate-300 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/20 hover:bg-white/80 dark:hover:bg-slate-800/40 hover:border-indigo-500/30 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          accept="image/*"
          multiple
          className="hidden"
          disabled={disabled}
        />
        
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className={`relative p-4 rounded-2xl transition-all duration-500 ${isDragging ? 'bg-indigo-100 dark:bg-indigo-500/20 rotate-3' : 'bg-slate-100 dark:bg-slate-800/50 group-hover:scale-110 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:-rotate-2'}`}>
          {isDragging ? (
               <Layers className="w-8 h-8 text-indigo-500 dark:text-indigo-300 transition-colors duration-300" />
          ) : (
               <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors duration-300" />
          )}
          {!isDragging && <Sparkles className="absolute -top-2 -right-2 w-4 h-4 text-amber-400 dark:text-amber-300 opacity-0 group-hover:opacity-100 animate-bounce duration-1000" />}
        </div>
        
        <div className="text-center relative z-10">
          <p className="text-base font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
            {t.dropZoneMain}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-medium group-hover:text-indigo-500 dark:group-hover:text-indigo-300/80 transition-colors">
            {t.dropZoneSub}
          </p>
        </div>
      </div>
    </div>
  );
};
