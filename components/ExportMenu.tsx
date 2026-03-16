
import React, { useState, useRef, useEffect } from 'react';
import { DownloadIcon } from './Icons';

interface ExportMenuProps {
  onExportPdf: () => void;
  onExportExcel: () => void;
  label?: string;
  disabled?: boolean;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ onExportPdf, onExportExcel, label = "Export", disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (disabled) {
      return (
        <button disabled className="flex items-center px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed">
            <DownloadIcon /> <span className="ml-2">{label}</span>
        </button>
      )
  }

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center px-4 py-2 border rounded-lg text-sm font-bold transition-all shadow-sm ${isOpen ? 'bg-slate-100 text-slate-900 border-slate-300' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:text-slate-900'}`}
      >
        <DownloadIcon /> 
        <span className="ml-2">{label}</span>
        <svg className={`ml-2 h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-50 overflow-hidden transform origin-top-right animate-fade-in-up">
          <div className="py-1" role="menu">
            <button
              onClick={() => { onExportPdf(); setIsOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-700 flex items-center transition-colors"
            >
              <span className="bg-red-100 text-red-600 p-1 rounded mr-3 text-xs font-bold">PDF</span>
              Download PDF
            </button>
            <button
              onClick={() => { onExportExcel(); setIsOpen(false); }}
              className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-700 flex items-center transition-colors border-t border-slate-100"
            >
              <span className="bg-emerald-100 text-emerald-600 p-1 rounded mr-3 text-xs font-bold">XLS</span>
              Download Excel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
