
import React, { useRef, useState, useCallback } from 'react';
import { Upload, FileText, X, Sparkles, Files, Layers, Lock, Aperture, Camera } from 'lucide-react';
import { TranslationDictionary } from '../utils/translations';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  onClearFile: () => void;
  disabled?: boolean;
  onError: (message: string, code: 'INVALID_FILE') => void;
  t: TranslationDictionary;
  isDemoMode?: boolean;
  onToggleDemoMode?: () => void;
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
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const MAX_FILES = 5;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(false);
  }, [disabled]);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const validFiles: File[] = [];
    let hasInvalid = false;

    Array.from(files).forEach((file: File) => {
        if (file.type.startsWith('image/')) {
            validFiles.push(file);
        } else {
            hasInvalid = true;
        }
    });
    
    if (hasInvalid) onError(t.fileTypeError, 'INVALID_FILE');
    if (validFiles.length === 0) return;

    // Calculate how many we can add
    const remainingSlots = MAX_FILES - selectedFiles.length;
    if (remainingSlots <= 0) return;

    const filesToAdd = validFiles.slice(0, remainingSlots);
    const newFileList = [...selectedFiles, ...filesToAdd];
    
    onFileSelect(newFileList);
  }, [selectedFiles, onFileSelect, onError, t, MAX_FILES]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }, [handleFiles, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset input so the same file can be selected again if needed
    e.target.value = '';
  };

  const isMultiple = selectedFiles.length > 1;
  const remainingSlots = MAX_FILES - selectedFiles.length;
  const isMaxed = remainingSlots <= 0;

  return (
    <div className="w-full space-y-4">
      {/* Selected File Card - Always visible if files exist */}
      {selectedFiles.length > 0 && (
        <div className="w-full p-4 bg-white/70 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in zoom-in duration-300 ring-1 ring-black/5 dark:ring-white/5 transition-colors duration-500">
          <div className="flex items-center space-x-4 min-w-0 flex-1 mr-4">
            <div className="relative">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 rounded-xl border border-indigo-500/20 shrink-0 relative z-10">
                  {isMultiple ? <Files className="w-6 h-6 text-indigo-600 dark:text-indigo-400" /> : <FileText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />}
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
                      ? selectedFiles.map(f => f.name).slice(0, 1).join(', ') + (selectedFiles.length > 1 ? ` +${selectedFiles.length - 1} more` : '')
                      : (selectedFiles[0].size / 1024).toFixed(2) + ' KB'}
              </p>
            </div>
          </div>
          {!disabled && (
            <button
              onClick={onClearFile}
              className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-all text-slate-400 hover:text-red-500 dark:hover:text-red-400 shrink-0"
              title="Clear all files"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* MOBILE SCAN BUTTON (md:hidden) */}
      {!isMaxed && !disabled && (
        <div className="md:hidden">
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleChange}
            accept="image/*"
            capture="environment" // Forces rear camera on mobile
            className="hidden"
          />
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full py-5 bg-slate-900 border-2 border-cyan-400 text-cyan-400 rounded-xl font-bold tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.3)] animate-pulse flex items-center justify-center space-x-3 active:scale-95 transition-transform uppercase text-sm relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-cyan-400/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <Aperture className="w-6 h-6 relative z-10" />
            <span className="relative z-10">{t.initScan || "INITIALIZE SCAN"}</span>
          </button>
          <div className="mt-3 text-center">
             <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Or select from library</p>
             <button onClick={() => fileInputRef.current?.click()} className="mt-2 text-xs font-semibold text-indigo-500 underline">Browse Files</button>
          </div>
        </div>
      )}

      {/* DESKTOP DROP ZONE (hidden md:flex) */}
      {!isMaxed && (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !disabled && fileInputRef.current?.click()}
            className={`
            hidden md:flex
            w-full p-6 sm:p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-500 ease-out relative overflow-hidden group
            flex-col items-center justify-center space-y-3
            ${isDragging 
                ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 scale-[1.01] shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)]' 
                : 'border-slate-300 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/20 hover:bg-white/80 dark:hover:bg-slate-800/40 hover:border-indigo-500/30 hover:shadow-[0_0_30px_-5px_rgba(99,102,241,0.15)]'}
            ${disabled ? 'opacity-50 cursor-not-allowed !hidden' : ''}
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

            <div className={`relative p-3 rounded-2xl transition-all duration-500 ${isDragging ? 'bg-indigo-100 dark:bg-indigo-500/20 rotate-3' : 'bg-slate-100 dark:bg-slate-800/50 group-hover:scale-110 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:-rotate-2'}`}>
            {isDragging ? (
                <Layers className="w-6 h-6 text-indigo-500 dark:text-indigo-300 transition-colors duration-300" />
            ) : (
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors duration-300" />
            )}
            {!isDragging && <Sparkles className="absolute -top-2 -right-2 w-3 h-3 text-amber-400 dark:text-amber-300 opacity-0 group-hover:opacity-100 animate-bounce duration-1000" />}
            </div>
            
            <div className="text-center relative z-10">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
                {selectedFiles.length > 0 ? "Add more invoices" : t.dropZoneMain}
            </p>
            <p className="text-[10px] text-slate-500 mt-1 font-medium group-hover:text-indigo-500 dark:group-hover:text-indigo-300/80 transition-colors">
                {selectedFiles.length > 0 
                    ? `${selectedFiles.length} of ${MAX_FILES} selected (${remainingSlots} remaining)` 
                    : t.dropZoneSub}
            </p>
            </div>
        </div>
      )}

      {/* Privacy Notice */}
      <div 
        className="flex items-center justify-center space-x-2 py-2 opacity-70 hover:opacity-100 transition-opacity cursor-help"
        title="All invoice processing happens in your browser. No data is sent to external servers except for AI processing via Gemini API. Data is never stored permanently."
      >
        <Lock className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 text-center">
          Secure Processing - Data processed locally, not stored on servers
        </span>
      </div>
    </div>
  );
};
