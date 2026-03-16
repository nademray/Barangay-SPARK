import React, { useState, useMemo } from 'react';
import { Report } from '../types';
import { DownloadIcon } from './Icons';
import ReportProgress from './ReportProgress';
import ExportMenu from './ExportMenu';

declare const XLSX: any;

const EmptyState = () => (
    <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center">
        <div className="mx-auto w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
        </div>
        <p className="text-slate-500 font-medium">No reports found matching your criteria.</p>
    </div>
);

export const ActionButton: React.FC<{ onClick: () => void, disabled?: boolean, status?: string }> = ({ onClick, disabled, status }) => {
    const isLate = status === 'Late';
    return (
        <button 
            onClick={onClick}
            disabled={disabled}
            className={`px-3 py-1.5 rounded-md transition-colors text-[10px] uppercase font-bold shadow-sm tracking-wide border ${
                disabled 
                ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed' 
                : isLate
                ? 'bg-rose-600 text-white hover:bg-rose-700 border-rose-700'
                : 'bg-white text-blue-600 hover:text-blue-900 border-blue-300 hover:bg-blue-50'
            }`}
        >
            {disabled ? 'LOCKED' : isLate ? 'LATE UPDATE' : 'UPDATE'}
        </button>
    );
};

export const StatusBadge: React.FC<{status: string, isOverdue?: boolean}> = ({ status, isOverdue }) => {
  let bgClass = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotClass = 'bg-slate-400';
  let label = status;

  if (status === 'Completed') {
      bgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-600/20';
      dotClass = 'bg-emerald-500';
  } else if (status === 'Overdue' || status === 'Late') {
      bgClass = 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-600/20';
      dotClass = 'bg-rose-500 animate-pulse';
      label = status === 'Late' ? 'Late Submission' : 'Overdue';
  } else if (status === 'Pending') {
      bgClass = 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-600/20';
      dotClass = 'bg-amber-500';
  } else if (status === 'Partial') {
      bgClass = 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-600/20';
      dotClass = 'bg-orange-500';
  } else if (status === 'Waiting') {
      bgClass = 'bg-slate-50 text-slate-500 border-slate-200';
      dotClass = 'bg-slate-300';
      label = 'Not yet open';
  }

  return (
    <div className="flex flex-col items-start">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border shadow-sm ${bgClass}`}>
            <span className={`mr-1.5 h-2 w-2 rounded-full ${dotClass}`}></span>
            {label}
        </span>
        {(isOverdue || status === 'Overdue' || status === 'Late') && (
            <span className="text-[10px] font-bold text-rose-500 mt-1 ml-1 flex items-center">
                <span className="mr-1">⚠️</span> Beyond deadline
            </span>
        )}
    </div>
  );
};

export const LguComplianceMatrix: React.FC<{ 
    data: any[], 
    columns: string[], 
    onFocus: (lgu: string) => void 
}> = ({ data, columns, onFocus }) => {
    return (
        <div className="overflow-x-auto bg-white rounded-2xl shadow-xl border border-slate-200 animate-fade-in">
            <table className="min-w-full divide-y divide-slate-200 border-separate border-spacing-0 table-fixed">
                <thead className="bg-slate-900 text-white sticky top-0 z-20">
                    <tr>
                        <th className="w-[200px] px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest sticky left-0 z-30 bg-slate-900 border-r border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.1)]">LGU Unit</th>
                        <th className="w-[100px] px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest border-r border-slate-800">Comp. Rate</th>
                        {columns.map(col => (
                            <th key={col} className="w-[100px] px-2 py-5 text-center text-[9px] font-black uppercase tracking-tighter border-r border-slate-800" title={col}>
                                <div className="truncate">{col}</div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors group">
                            <td 
                                className="px-6 py-4 text-xs font-black text-slate-700 sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-100 cursor-pointer hover:text-blue-600 transition-colors shadow-[2px_0_5px_rgba(0,0,0,0.02)]"
                                onClick={() => onFocus(row.lgu)}
                            >
                                {row.lgu}
                            </td>
                            <td className="px-4 py-4 text-center border-r border-slate-100 bg-slate-50/30">
                                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${row.completionRate >= 90 ? 'bg-emerald-100 text-emerald-700' : row.completionRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {row.completionRate}%
                                </span>
                            </td>
                            {columns.map(col => {
                                const cell = row[col];
                                const status = cell?.status || 'Pending';
                                let bgClass = 'bg-slate-200';
                                if (status === 'Completed') bgClass = 'bg-emerald-500';
                                else if (status === 'Partial') bgClass = 'bg-amber-400';
                                else if (status === 'Late') bgClass = 'bg-rose-500';
                                
                                return (
                                    <td key={col} className="px-2 py-4 text-center border-r border-slate-50 group/cell relative">
                                        <div className="flex flex-col items-center">
                                            <div className={`w-3 h-3 rounded-full ${bgClass} shadow-sm transition-transform group-hover/cell:scale-125`}></div>
                                            <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter tabular-nums">{cell?.date || '0/0'}</span>
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
