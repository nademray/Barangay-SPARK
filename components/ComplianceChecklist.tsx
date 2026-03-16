
import React, { useMemo } from 'react';
import { Report, ReportDefinition } from '../types';
import { REPORT_DEFINITIONS } from '../reportDefinitions';

interface ComplianceChecklistProps {
  reports: Report[];
  currentLgu: string;
  onNavigate: (def: ReportDefinition) => void;
}

/**
 * Calculates the next specific deadline date based on report definition.
 */
function getNextDeadlineDate(def: ReportDefinition): Date {
    const now = new Date();
    const year = now.getFullYear();
    const D = def.deadline.day;
    const frequency = def.deadline.frequency || def.category.toLowerCase();
    
    const timeline: Date[] = [];

    if (frequency === 'monthly' || def.category === 'Monthly' || def.category === 'Quality Policy') {
        for (let y = year - 1; y <= year + 1; y++) {
            for (let m = 0; m < 12; m++) {
                timeline.push(new Date(y, m, D, 23, 59, 59));
            }
        }
    } else if (frequency === 'quarterly' || def.category === 'Quarterly') {
        const months = def.deadline.months || [1, 4, 7, 10];
        for (let y = year - 1; y <= year + 1; y++) {
            months.forEach(m => {
                timeline.push(new Date(y, m - 1, D, 23, 59, 59));
            });
        }
    } else if (frequency === 'weekly' || def.category === 'Weekly') {
        const start = new Date(year - 1, 0, 1);
        while(start.getDay() !== D) start.setDate(start.getDate() + 1);
        const end = new Date(year + 1, 11, 31);
        const current = new Date(start);
        while(current <= end) {
            timeline.push(new Date(current.getTime()));
            current.setDate(current.getDate() + 7);
        }
    } else {
        for (let y = year - 1; y <= year + 1; y++) {
            timeline.push(new Date(y, 0, D, 23, 59, 59));
        }
    }

    timeline.sort((a, b) => a.getTime() - b.getTime());
    return timeline.find(d => d >= now) || timeline[timeline.length - 1];
}

const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({ reports, currentLgu, onNavigate }) => {
    
    const checklistItems = useMemo(() => {
        const items = REPORT_DEFINITIONS.filter(d => !d.isInventory).map(def => {
            const deadline = getNextDeadlineDate(def);
            
            // Refined filtering to handle both LGU and Barangay context names
            const lguReports = reports.filter(r => {
                const isTypeMatch = r['REPORT TYPE'] === def.id;
                if (!isTypeMatch) return false;

                const search = currentLgu.toUpperCase();
                const reportLguBrgy = r['LGU/BARANGAY'].toUpperCase();
                const detailsCity = (r.details?.city || "").toUpperCase();
                const detailsBrgy = (r.details?.barangay || "").toUpperCase();

                return reportLguBrgy === search || 
                       detailsCity === search || 
                       detailsBrgy === search || 
                       reportLguBrgy.startsWith(search + ",") ||
                       reportLguBrgy.endsWith(", " + search);
            });

            // Compliance Logic
            const isCompleted = lguReports.length > 0 && lguReports.every(r => r.STATUS === 'Completed');
            const somePartial = lguReports.some(r => r.STATUS === 'Partial' || r.STATUS === 'Completed');
            const isOverdue = new Date() > deadline && !isCompleted;
            
            let status = 'Pending';
            if (isCompleted) status = 'Completed';
            else if (isOverdue) status = 'Overdue';
            else if (somePartial) status = 'Partial';

            return {
                definition: def,
                deadline,
                status,
                reportCount: lguReports.length,
                completedCount: lguReports.filter(r => r.STATUS === 'Completed').length
            };
        });

        // Sort chronologically by deadline
        return items.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
    }, [reports, currentLgu]);

    const groupedItems = useMemo(() => {
        const now = new Date();
        const urgentThreshold = new Date();
        urgentThreshold.setDate(now.getDate() + 7);

        return {
            overdue: checklistItems.filter(i => i.status === 'Overdue'),
            upcoming: checklistItems.filter(i => i.status !== 'Overdue' && i.deadline <= urgentThreshold),
            future: checklistItems.filter(i => i.status !== 'Overdue' && i.deadline > urgentThreshold)
        };
    }, [checklistItems]);

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-20">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-xl font-black text-slate-800 mb-2">My Compliance Checklist</h3>
                <p className="text-sm text-slate-500 font-medium">Personalized chronological list of required reports for <span className="text-blue-600 font-bold">{currentLgu}</span>.</p>
            </div>

            {/* Overdue Section */}
            {groupedItems.overdue.length > 0 && (
                <section className="space-y-4">
                    <h4 className="flex items-center text-rose-600 text-[10px] font-black uppercase tracking-widest bg-rose-50 w-fit px-3 py-1 rounded-full border border-rose-100 mb-4">
                        <span className="w-2 h-2 bg-rose-500 rounded-full mr-2 animate-pulse"></span> Critical / Overdue
                    </h4>
                    <div className="space-y-3">
                        {groupedItems.overdue.map(item => (
                            <ChecklistItem key={item.definition.id} item={item} onNavigate={onNavigate} />
                        ))}
                    </div>
                </section>
            )}

            {/* Upcoming Section */}
            <section className="space-y-4">
                <h4 className="flex items-center text-amber-600 text-[10px] font-black uppercase tracking-widest bg-amber-50 w-fit px-3 py-1 rounded-full border border-amber-100 mb-4">
                    Due This Week / Pending
                </h4>
                <div className="space-y-3">
                    {groupedItems.upcoming.map(item => (
                        <ChecklistItem key={item.definition.id} item={item} onNavigate={onNavigate} />
                    ))}
                    {groupedItems.upcoming.length === 0 && <div className="p-10 text-center bg-emerald-50 text-emerald-700 font-bold rounded-2xl border border-emerald-100">✨ You are caught up for this week!</div>}
                </div>
            </section>

            {/* Future Section */}
            <section className="space-y-4">
                <h4 className="flex items-center text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50 w-fit px-3 py-1 rounded-full border border-slate-100 mb-4">
                    Future Deadlines
                </h4>
                <div className="space-y-3 opacity-80 hover:opacity-100 transition-opacity">
                    {groupedItems.future.map(item => (
                        <ChecklistItem key={item.definition.id} item={item} onNavigate={onNavigate} />
                    ))}
                </div>
            </section>
        </div>
    );
};

const ChecklistItem: React.FC<{ item: any, onNavigate: (def: ReportDefinition) => void }> = ({ item, onNavigate }) => {
    const { definition, deadline, status, reportCount, completedCount } = item;
    
    const getStatusColors = (s: string) => {
        switch(s) {
            case 'Completed': return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-600/10';
            case 'Overdue': return 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-600/10';
            case 'Partial': return 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-600/10';
            default: return 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-600/5';
        }
    };

    const isUrgent = new Date(deadline.getTime() - 2 * 24 * 60 * 60 * 1000) <= new Date() && status !== 'Completed';

    return (
        <div 
            onClick={() => onNavigate(definition)}
            className={`
                group relative flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 bg-white rounded-2xl border-2 transition-all cursor-pointer
                hover:shadow-xl hover:scale-[1.01] hover:-translate-y-0.5
                ${status === 'Completed' ? 'border-emerald-100 grayscale-[0.3]' : isUrgent ? 'border-amber-300 bg-amber-50/20' : 'border-slate-50 hover:border-blue-200'}
            `}
        >
            <div className="flex items-start md:items-center gap-4 flex-1">
                <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border shadow-inner transition-colors
                    ${status === 'Completed' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-50 text-slate-400 border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-50 group-hover:text-blue-600'}
                `}>
                    {status === 'Completed' ? (
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    )}
                </div>

                <div className="min-w-0">
                    <h5 className={`font-black text-lg tracking-tight mb-1 truncate ${status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                        {definition.title}
                    </h5>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ring-1 ${getStatusColors(status)}`}>
                            {status}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">•</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{definition.category}</span>
                        {reportCount > 1 && (
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                {completedCount} / {reportCount} COMPLIED
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-4 md:mt-0 flex flex-row md:flex-col items-center md:items-end justify-between gap-2 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0">
                <div className="flex flex-col md:items-end">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Target Deadline</span>
                    <span className={`text-sm font-black tabular-nums ${status === 'Overdue' ? 'text-rose-600' : isUrgent ? 'text-amber-600' : 'text-slate-700'}`}>
                        {deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                </div>
                <button className={`
                    px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center shadow-md
                    ${status === 'Completed' ? 'bg-slate-100 text-slate-500 cursor-default' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}
                `}>
                    {status === 'Completed' ? 'View Details' : 'Submit Now'}
                    <svg className="w-3.5 h-3.5 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
            </div>
        </div>
    );
};

export default ComplianceChecklist;
