
import React, { useRef, useState, useCallback } from 'react';
import { Upload, FileText, X, Sparkles } from 'lucide-react';
import { TranslationDictionary } from '../utils/translations';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClearFile: () => void;
  disabled?: boolean;
  t: TranslationDictionary;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile, onClearFile, disabled, t }) => {
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onFileSelect(file);
      } else {
        alert("Please upload an image file (PNG, JPG, WEBP).");
      }
    }
  }, [onFileSelect, disabled]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  if (selectedFile) {
    return (
      <div className="w-full p-6 bg-white/70 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200 dark:border-slate-700/50 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in zoom-in duration-300 ring-1 ring-black/5 dark:ring-white/5 transition-colors duration-500">
        <div className="flex items-center space-x-5 min-w-0 flex-1 mr-4">
          <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-blue-500/10 rounded-xl border border-indigo-500/20 shrink-0">
            <FileText className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 tracking-wide truncate" title={selectedFile.name}>
              {selectedFile.name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{(selectedFile.size / 1024).toFixed(2)} KB</p>
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
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`
        w-full p-16 sm:p-20 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-500 ease-out relative overflow-hidden group
        flex flex-col items-center justify-center space-y-6
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
        className="hidden"
        disabled={disabled}
      />
      
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className={`relative p-5 rounded-2xl transition-all duration-500 ${isDragging ? 'bg-indigo-100 dark:bg-indigo-500/20 rotate-3' : 'bg-slate-100 dark:bg-slate-800/50 group-hover:scale-110 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/10 group-hover:-rotate-2'}`}>
        <Upload className={`w-10 h-10 ${isDragging ? 'text-indigo-500 dark:text-indigo-300' : 'text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'} transition-colors duration-300`} />
        {!isDragging && <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-amber-400 dark:text-amber-300 opacity-0 group-hover:opacity-100 animate-bounce duration-1000" />}
      </div>
      
      <div className="text-center relative z-10">
        <p className="text-xl font-semibold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-white transition-colors">
          {t.dropZoneMain}
        </p>
        <p className="text-sm text-slate-500 mt-2 font-medium group-hover:text-indigo-500 dark:group-hover:text-indigo-300/80 transition-colors">
          {t.dropZoneSub}
        </p>
      </div>
    </div>
  );
};
