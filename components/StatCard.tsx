
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  color: string; // Expecting classes like 'bg-blue-600'
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, color, onClick }) => {
  // Enhanced Gradients for a modern look
  const getGradient = (baseColor: string) => {
      if (baseColor.includes('blue')) return 'bg-gradient-to-br from-blue-600 to-indigo-700';
      if (baseColor.includes('emerald') || baseColor.includes('green')) return 'bg-gradient-to-br from-emerald-500 to-teal-700';
      if (baseColor.includes('amber') || baseColor.includes('yellow')) return 'bg-gradient-to-br from-amber-400 to-orange-600';
      if (baseColor.includes('rose') || baseColor.includes('red')) return 'bg-gradient-to-br from-rose-500 to-pink-700';
      return 'bg-gradient-to-br from-slate-700 to-slate-900';
  };

  const getShadow = (baseColor: string) => {
       if (baseColor.includes('blue')) return 'shadow-blue-900/20';
       if (baseColor.includes('emerald') || baseColor.includes('green')) return 'shadow-emerald-900/20';
       if (baseColor.includes('amber') || baseColor.includes('yellow')) return 'shadow-orange-900/20';
       if (baseColor.includes('rose') || baseColor.includes('red')) return 'shadow-rose-900/20';
       return 'shadow-slate-900/20';
  };

  const getIcon = (t: string) => {
      const lower = t.toLowerCase();
      if (lower.includes('compliant') || lower.includes('fully')) {
          return (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
      }
      if (lower.includes('pending') || lower.includes('action')) {
          return (
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          );
      }
      if (lower.includes('lgu')) {
          return (
             <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
             </svg>
          );
      }
      // Default / Reports
      return (
         <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
         </svg>
      );
  };

  const gradientClass = getGradient(color);
  const shadowClass = getShadow(color);
  const icon = getIcon(title);

  return (
    <div 
        onClick={onClick}
        className={`
            relative p-6 rounded-[20px] overflow-hidden group 
            text-white transition-all duration-300 ease-out
            ${gradientClass}
            shadow-xl ${shadowClass}
            border-t border-white/20 ring-1 ring-black/5
            ${onClick ? 'cursor-pointer hover:scale-[1.03] hover:-translate-y-1' : ''}
        `}
    >
      {/* Abstract Background Shapes */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:bg-white/20 transition-colors duration-500"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
      
      {/* Subtle Pattern Overlay (Dot Matrix) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 2px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex justify-between items-start mb-4">
             <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-2xl border border-white/10 shadow-inner">
                 {icon}
             </div>
             
             {onClick && (
                 <div className="opacity-60 group-hover:opacity-100 transition-opacity bg-white/10 rounded-full p-1.5 hover:bg-white/20">
                     <svg className="w-5 h-5 text-white transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                     </svg>
                 </div>
             )}
          </div>

          <div>
             <h3 className="text-ml font-bold uppercase tracking-widest text-white/70 mb-1">{title}</h3>
             <div className="flex items-end justify-between">
                <div className="text-4xl md:text-5xl font-black tracking-tight text-white drop-shadow-md tabular-nums">
                    {value}
                </div>
                <div className="mb-1.5 ml-2 px-3 py-1 rounded-lg bg-white/20 backdrop-blur-md border border-white/10 text-ml font-bold text-white/90 shadow-sm whitespace-nowrap">
                    {subtitle}
                </div>
             </div>
          </div>
      </div>
    </div>
  );
};

export default StatCard;
