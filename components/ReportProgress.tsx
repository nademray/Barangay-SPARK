
import React from 'react';
import { Report } from '../types';

interface ReportProgressProps {
  reports: Report[];
  category?: string;
}

const ReportProgress: React.FC<ReportProgressProps> = ({ reports, category }) => {
  if (!reports || reports.length === 0) return null;

  const total = reports.length;
  const completed = reports.filter(r => r.STATUS === 'Completed').length;
  const pending = total - completed;
  const percentage = Math.round((completed / total) * 100) || 0;

  // Determine color based on category
  let progressColor = 'bg-teal-500';
  let textColor = 'text-teal-700';
  let bgColor = 'bg-teal-50/50';

  if (category === 'Monthly') {
      progressColor = 'bg-blue-600';
      textColor = 'text-blue-700';
      bgColor = 'bg-blue-50/50';
  } else if (category === 'Quarterly') {
      progressColor = 'bg-orange-500';
      textColor = 'text-orange-700';
      bgColor = 'bg-orange-50/50';
  } else if (category === 'Barangay') {
      progressColor = 'bg-indigo-500';
      textColor = 'text-indigo-700';
      bgColor = 'bg-indigo-50/50';
  }

  return (
    <div className={`mb-4 p-4 rounded-xl border border-transparent ${bgColor} shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
        <div className="flex-1">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h4 className={`text-[10px] font-bold uppercase tracking-wider opacity-80 ${textColor}`}>Progress</h4>
                    <div className="flex items-baseline">
                        <p className="text-2xl font-black text-slate-800 leading-none mt-0.5">
                            {completed}
                        </p>
                        <span className="text-xs font-bold text-slate-400 ml-1">/ {total}</span>
                    </div>
                </div>
                <div className="text-right">
                    <span className={`text-xl font-black ${textColor}`}>{percentage}%</span>
                </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} 
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
        
        {/* Mini Stats */}
        <div className="flex gap-4 sm:border-l sm:border-slate-200/60 sm:pl-6 sm:ml-2">
            <div className="text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pending</span>
                <span className="block text-base font-bold text-amber-600">{pending}</span>
            </div>
            <div className="text-center">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Done</span>
                <span className="block text-base font-bold text-emerald-600">{completed}</span>
            </div>
        </div>
    </div>
  );
};

export default ReportProgress;
