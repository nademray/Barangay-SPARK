
import React, { useState, useMemo } from 'react';
import { Report, ReportDefinition } from '../types';
import { REPORT_DEFINITIONS, BARANGAY_LEVEL_REPORT_IDS } from '../reportDefinitions';
import { CheckIcon } from './Icons';
import { formatTimestamp } from '../services/dataService';

interface SubmissionStatusViewProps {
    reports: Report[];
    categoryFilter: string;
    statusFilter: string;
    onNavigate: (def: ReportDefinition) => void;
    manualOverrides?: Record<string, 'locked' | 'unlocked' | null>;
}

const CATEGORY_ORDER = ['Barangay', 'Weekly', 'Monthly', 'Quarterly', 'Semestral', 'Annual', 'Quality Policy'];

function getNextDeadlineDate(def: ReportDefinition): Date {
    const now = new Date();
    const year = now.getFullYear();
    const D = def.deadline.day;
    const frequency = def.deadline.frequency || def.category.toLowerCase();
    const timeline: Date[] = [];

    if (frequency === 'monthly' || def.category === 'Monthly') {
        for (let y = year - 1; y <= year + 1; y++) {
            for (let m = 0; m < 12; m++) timeline.push(new Date(y, m, D, 23, 59, 59));
        }
    } else if (frequency === 'quarterly' || def.category === 'Quarterly') {
        const months = def.deadline.months || [1, 4, 7, 10];
        for (let y = year - 1; y <= year + 1; y++) {
            months.forEach(m => timeline.push(new Date(y, m - 1, D, 23, 59, 59)));
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
        for (let y = year - 1; y <= year + 1; y++) timeline.push(new Date(y, 0, D, 23, 59, 59));
    }
    timeline.sort((a, b) => a.getTime() - b.getTime());
    return timeline.find(d => d >= now) || timeline[timeline.length - 1];
}

const SubmissionStatusView: React.FC<SubmissionStatusViewProps> = ({ reports, categoryFilter, statusFilter, onNavigate, manualOverrides = {} }) => {
    const [modalData, setModalData] = useState<{ title: string, list: string[] } | null>(null);

    const sortedDefinitions = useMemo(() => {
        let defs = REPORT_DEFINITIONS.filter(d => !d.isInventory);
        if (categoryFilter !== 'All') defs = defs.filter(d => d.category === categoryFilter);
        return defs.sort((a, b) => {
            const idxA = CATEGORY_ORDER.indexOf(a.category);
            const idxB = CATEGORY_ORDER.indexOf(b.category);
            const valA = idxA === -1 ? 999 : idxA;
            const valB = idxB === -1 ? 999 : idxB;
            if (valA !== valB) return valA - valB;
            return a.title.localeCompare(b.title);
        });
    }, [categoryFilter]);

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6 pb-12 animate-fade-in">
                {sortedDefinitions.map(def => {
                    const relevantReports = reports.filter(r => r['REPORT TYPE'] === def.id);
                    const isFullyCompliant = relevantReports.length > 0 && relevantReports.every(r => r.STATUS === 'Completed');
                    if (statusFilter === 'Completed' && !isFullyCompliant) return null;
                    if (statusFilter === 'Pending' && isFullyCompliant) return null;

                    return (
                        <ReportCard 
                            key={def.id} 
                            definition={def} 
                            reports={relevantReports} 
                            onNavigate={onNavigate} 
                            onViewPending={(list) => setModalData({ title: def.title, list })}
                            manualOverride={manualOverrides[def.id] || null}
                        />
                    );
                })}
            </div>

            {modalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-white/20">
                        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center shrink-0">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Pending/Late Submissions</h4>
                                <h3 className="font-extrabold text-slate-800 text-2xl tracking-tight leading-tight">{modalData.title}</h3>
                            </div>
                            <button onClick={() => setModalData(null)} className="text-slate-400 hover:text-slate-600 bg-white border border-slate-200 p-2 rounded-full">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            {modalData.list.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {modalData.list.map((item, idx) => (
                                        <div key={idx} className="flex items-center text-slate-700 text-sm font-semibold p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-amber-50">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-slate-200 text-amber-600 mr-3 shrink-0 text-xs font-bold">{idx + 1}</span>
                                            <span className="truncate" title={item}>{item}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-center px-6">
                                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100"><CheckIcon /></div>
                                    <p className="text-emerald-700 font-extrabold text-2xl">All Compliant!</p>
                                </div>
                            )}
                        </div>
                        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 text-right"><button onClick={() => setModalData(null)} className="px-6 py-3 bg-slate-800 text-white text-sm font-bold rounded-xl">Close</button></div>
                    </div>
                </div>
            )}
        </>
    );
};

const ReportCard: React.FC<{ 
    definition: ReportDefinition, 
    reports: Report[], 
    onNavigate: (def: ReportDefinition) => void,
    onViewPending: (list: string[]) => void,
    manualOverride: 'locked' | 'unlocked' | null
}> = ({ definition, reports, onNavigate, onViewPending, manualOverride }) => {
    
    const stats = useMemo(() => {
        const total = reports.length || 1; 
        const done = reports.filter(r => r.STATUS === 'Completed').length;
        const pending = reports.filter(r => r.STATUS === 'Pending').length;
        const late = reports.filter(r => r.STATUS === 'Late').length;
        const percentage = total > 0 ? Math.round((done / total) * 100) : 0;
        
        let latest = '';
        reports.forEach(r => {
            const dateStr = r['LAST UPDATED'];
            if (dateStr && dateStr !== 'Legacy Data' && dateStr !== 'Not Submitted' && (!latest || new Date(dateStr) > new Date(latest))) {
                latest = dateStr;
            }
        });

        // The effective lock state considers manual override
        let isLocked = reports.length > 0 && reports.every(r => r.isLocked);
        if (manualOverride === 'unlocked') isLocked = false;
        else if (manualOverride === 'locked') isLocked = true;

        const windowStatus = reports[0]?.windowStatus || 'Waiting';
        const nextOpeningDate = reports[0]?.nextOpeningDate;

        return { total, done, pending, late, percentage, latest, isLocked, windowStatus, nextOpeningDate };
    }, [reports, manualOverride]);

    const deadlineDateObj = useMemo(() => getNextDeadlineDate(definition), [definition]);
    const formattedDeadline = useMemo(() => {
        return formatTimestamp(deadlineDateObj).split(' ')[0] + ' ' + formatTimestamp(deadlineDateObj).split(' ')[1]; 
    }, [deadlineDateObj]);

    const pendingList = useMemo(() => {
        if (reports.length === 0) return ['No current submission recorded'];
        return reports.filter(r => r.STATUS !== 'Completed').map(r => r['LGU/BARANGAY']).sort();
    }, [reports]);

    const getGradient = (category: string) => {
        if (category === 'Monthly') return 'from-blue-600 to-indigo-700';
        if (category === 'Quarterly') return 'from-orange-400 to-orange-600';
        if (category === 'Barangay') return 'from-indigo-600 to-purple-700';
        if (category === 'Weekly') return 'from-purple-500 to-pink-600';
        if (category === 'Quality Policy') return 'from-teal-500 to-emerald-700';
        if (category === 'Annual') return 'from-cyan-500 to-blue-700';
        return 'from-slate-600 to-slate-800';
    };

    const gradientClass = getGradient(definition.category);
    const isCompleted = stats.done === stats.total && stats.total > 0;
    const isLateAvailable = stats.late > 0 && !stats.isLocked;

    return (
        <div 
            onClick={() => onNavigate(definition)}
            className={`relative p-6 rounded-[28px] transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl cursor-pointer bg-gradient-to-br ${gradientClass} text-white flex flex-col h-full overflow-hidden border-t border-white/20`}
        >
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 2px, transparent 0)', backgroundSize: '16px 16px' }}></div>

            <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-2">
                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 w-fit">
                        {definition.category}
                    </span>
                    <div className="flex flex-col gap-1.5">
                        {manualOverride === 'unlocked' && (
                             <span className="px-4 py-1.5 bg-indigo-500/80 text-white backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 w-fit flex items-center shadow-lg">
                                <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                Forced Unlock
                             </span>
                        )}
                        {manualOverride === 'locked' && (
                             <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 w-fit flex items-center shadow-lg">
                                <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                Admin Lock
                             </span>
                        )}
                        
                        {!manualOverride && stats.isLocked ? (
                            <>
                                <span className="px-4 py-1.5 bg-slate-900/40 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 w-fit flex items-center">
                                    <svg className="w-3 h-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                    Locked
                                </span>
                                {stats.nextOpeningDate && (
                                    <div className="flex items-center gap-1.5 px-2 text-[9px] font-black text-white/60 uppercase tracking-tighter">
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                                        Opens: {stats.nextOpeningDate}
                                    </div>
                                )}
                            </>
                        ) : !manualOverride && isLateAvailable ? (
                            <span className="px-4 py-1.5 bg-rose-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center w-fit animate-pulse">
                                <span className="w-1.5 h-1.5 bg-white rounded-full mr-2"></span> LATE SUBMISSION OPEN
                            </span>
                        ) : !manualOverride && (
                            <span className="px-4 py-1.5 bg-emerald-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center w-fit animate-pulse">
                                <span className="w-1.5 h-1.5 bg-white rounded-full mr-2"></span> Open for Update
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Target Deadline</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md rounded-xl border border-white/10">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                        <span className="text-xs font-bold">{formattedDeadline}</span>
                    </div>
                </div>
            </div>

            <h3 className="text-2xl font-black mb-1 leading-tight drop-shadow-sm">{definition.title}</h3>
            <div className="flex items-center mb-6 opacity-80">
                <span className="text-[10px] font-bold uppercase tracking-widest mr-2">Last Update:</span>
                <span className="text-[10px] font-black">{stats.latest || 'No Record'}</span>
            </div>

            <div className="bg-white rounded-2xl p-5 mb-6 shadow-inner text-slate-800">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Compliance</span>
                        <div className="flex items-baseline"><span className="text-2xl font-black">{stats.done}</span><span className="text-xs font-bold text-slate-400 ml-1">/ {stats.total}</span></div>
                    </div>
                    <div className="text-3xl font-black text-blue-600">{stats.percentage}%</div>
                    <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-2"><span className="text-[9px] font-bold text-slate-400 uppercase">Pending</span><span className="text-xs font-black text-amber-500">{stats.pending}</span></div>
                        <div className="flex items-center gap-2"><span className="text-[9px] font-bold text-slate-400 uppercase">Late</span><span className="text-xs font-black text-rose-500">{stats.late}</span></div>
                    </div>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ease-out ${isCompleted ? 'bg-emerald-500' : isLateAvailable ? 'bg-rose-500' : 'bg-blue-600'}`} style={{ width: `${stats.percentage}%` }}></div>
                </div>
            </div>

            <div 
                className={`mt-auto flex items-center justify-between px-5 py-4 rounded-2xl backdrop-blur-md transition-all ${isCompleted ? 'bg-emerald-500/30 border border-emerald-400/30' : isLateAvailable ? 'bg-rose-500/20 border border-rose-400/30' : 'bg-slate-900/20 border border-white/10'}`}
                onClick={(e) => { e.stopPropagation(); onViewPending(pendingList); }}
            >
                <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-emerald-400 animate-pulse' : stats.isLocked ? 'bg-slate-400' : isLateAvailable ? 'bg-rose-400' : 'bg-amber-400'}`}></span>
                    <span className="text-xs font-black uppercase tracking-widest">
                        {isCompleted ? 'Fully Compliant' : stats.isLocked ? 'Window Closed' : isLateAvailable ? 'Action Required (Late)' : 'Pending Updates'}
                    </span>
                </div>
                <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
        </div>
    );
};

export default SubmissionStatusView;
