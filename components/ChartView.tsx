
import React, { useMemo, useState } from 'react';
import { Report, ReportDefinition } from '../types';
import { REPORT_DEFINITIONS } from '../reportDefinitions';

interface ChartViewProps {
    reports: Report[];
    lguMatrix: any[]; // Current real-time matrix
}

const ChartView: React.FC<ChartViewProps> = ({ reports, lguMatrix }) => {
    const [selectedSnapshotMonth, setSelectedSnapshotMonth] = useState<string>("Current");

    // Filter definitions to only include actual compliance reports
    const complianceDefs = useMemo(() => REPORT_DEFINITIONS.filter(d => !d.isInventory), []);

    // 1. Calculate Overall Samar Stats (AGGREGATE COMPLETION - Real Time)
    const summaryStats = useMemo(() => {
        const totalCategories = complianceDefs.length;
        const totalLgus = lguMatrix.length;
        const totalPossibleSubmissions = totalCategories * totalLgus;
        
        if (totalPossibleSubmissions === 0) {
            return { total: totalCategories, completed: 0, percentage: 0 };
        }

        const grandTotalCompleted = lguMatrix.reduce((sum, row) => sum + (row.completedCount || 0), 0);
        const percentage = Math.round((grandTotalCompleted / totalPossibleSubmissions) * 100);
        const avgCompletedPerLgu = Math.round(grandTotalCompleted / totalLgus);

        return { 
            total: totalCategories, 
            completed: avgCompletedPerLgu, 
            percentage: percentage 
        };
    }, [lguMatrix, complianceDefs]);

    // 2. Generate list of available months for snapshots from existing report data
    const availableSnapshotMonths = useMemo(() => {
        const periods = new Set<string>();
        reports.forEach(r => {
            if (r['LAST UPDATED']) {
                const date = new Date(r['LAST UPDATED']);
                if (!isNaN(date.getTime()) && date.getFullYear() >= 2024) {
                    periods.add(date.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
                }
            }
        });
        return Array.from(periods).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    }, [reports]);

    // 3. Calculate Snapshot Leaderboard
    const snapshotLeaderboard = useMemo(() => {
        const lgus = lguMatrix.map(l => l.lgu);
        
        if (selectedSnapshotMonth === "Current") {
            return lguMatrix.map(row => ({
                lgu: row.lgu,
                completionRate: row.completionRate,
                completedCount: row.completedCount,
                latestTimestamp: row.latestTimestamp || 0
            })).sort((a, b) => {
                if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
                return b.latestTimestamp - a.latestTimestamp;
            });
        }

        // Snapshot Logic: Re-evaluate compliance based on date threshold
        const snapshotDate = new Date(selectedSnapshotMonth);
        const endOfMonth = new Date(snapshotDate.getFullYear(), snapshotDate.getMonth() + 1, 0, 23, 59, 59);

        const snapshotData = lgus.map(lgu => {
            let completedCount = 0;
            let latestTimestamp = 0;

            complianceDefs.forEach(def => {
                // Check if this LGU has a 'Completed' report for this category submitted BEFORE end of snapshot month
                const matchedReport = reports.find(r => {
                    const isLguMatch = r['LGU/BARANGAY'] === lgu || r.details?.city === lgu || r['LGU/BARANGAY'].endsWith(`, ${lgu}`);
                    if (!isLguMatch || r['REPORT TYPE'] !== def.id || r.STATUS !== 'Completed' || !r['LAST UPDATED']) return false;
                    
                    const updateDate = new Date(r['LAST UPDATED']);
                    return !isNaN(updateDate.getTime()) && updateDate <= endOfMonth;
                });

                if (matchedReport) {
                    completedCount++;
                    const ts = new Date(matchedReport['LAST UPDATED']).getTime();
                    if (ts > latestTimestamp) latestTimestamp = ts;
                }
            });

            return {
                lgu,
                completedCount,
                completionRate: Math.round((completedCount / complianceDefs.length) * 100),
                latestTimestamp
            };
        });

        return snapshotData.sort((a, b) => {
            if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;
            return b.latestTimestamp - a.latestTimestamp;
        });
    }, [selectedSnapshotMonth, reports, lguMatrix, complianceDefs]);

    // Trend Data (Last 6 Months)
    const trendData = useMemo(() => {
        const months = 6;
        const today = new Date();
        const data = [];
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        for (let i = months - 1; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthIdx = d.getMonth();
            const year = d.getFullYear();
            const monthName = monthNames[monthIdx];
            
            const count = reports.filter(r => {
                if (r.STATUS !== 'Completed' || !r['LAST UPDATED']) return false;
                const def = REPORT_DEFINITIONS.find(def => def.id === r['REPORT TYPE']);
                if (!def || def.isInventory) return false;
                const rDate = new Date(r['LAST UPDATED']);
                return !isNaN(rDate.getTime()) && rDate.getMonth() === monthIdx && rDate.getFullYear() === year;
            }).length;

            data.push({ label: monthName, value: count, fullLabel: `${monthName} ${year}` });
        }
        
        const max = Math.max(...data.map(d => d.value)) || 1;
        return data.map(d => ({ ...d, height: (d.value / max) * 100 }));
    }, [reports]);

    // Performance by Category Breakdown
    const categoryStats = useMemo(() => {
        const activeComplianceCategories = Array.from(new Set(complianceDefs.map(d => d.category)));
        return activeComplianceCategories.map(cat => {
            const defs = complianceDefs.filter(d => d.category === cat);
            let totalPossible = defs.length * lguMatrix.length;
            let totalActual = 0;
            
            defs.forEach(def => {
                totalActual += lguMatrix.filter(row => row[def.id]?.status === 'Completed').length;
            });

            const pct = totalPossible > 0 ? Math.round((totalActual / totalPossible) * 100) : 0;
            return { category: cat, pct, actual: totalActual, possible: totalPossible };
        }).sort((a, b) => b.pct - a.pct);
    }, [lguMatrix, complianceDefs]);

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Top Row: Overall Summary & Activity Trend */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 self-start w-full border-b border-slate-100 pb-2">Provincial Compliance</h3>
                    <div className="relative w-48 h-48 transition-transform duration-500 group-hover:scale-105">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle cx="50%" cy="50%" r="40%" stroke="#f1f5f9" strokeWidth="12" fill="transparent" />
                            <circle
                                cx="50%" cy="50%" r="40%"
                                stroke={summaryStats.percentage >= 80 ? '#10b981' : summaryStats.percentage >= 50 ? '#f59e0b' : '#ef4444'}
                                strokeWidth="12" fill="transparent"
                                strokeDasharray={`${summaryStats.percentage * 2.51} 251`}
                                strokeLinecap="round"
                                className="transition-all duration-1000 ease-out"
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-extrabold text-slate-800">{summaryStats.percentage}%</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center px-4">Overall Completion</span>
                        </div>
                    </div>
                    <div className="mt-6 text-center w-full">
                        <div className="flex justify-between px-8 text-xl">
                            <div className="flex flex-col group/tip relative">
                                <span className="font-bold text-blue-600 text-xl">{summaryStats.completed}</span>
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Avg Done</span>
                            </div>
                            <div className="w-px bg-slate-100 h-10"></div>
                            <div className="flex flex-col group/tip relative">
                                <span className="font-bold text-slate-800 text-xl">{summaryStats.total}</span>
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Total</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
                        <h3 className="text-lg font-bold text-slate-800">Submission Volume</h3>
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">Monthly Activity</span>
                    </div>
                    <div className="flex-1 flex items-end justify-between gap-4 px-4 pb-2 pt-8">
                        {trendData.map((d, i) => (
                            <div key={i} className="flex flex-col items-center w-full group relative">
                                <div className="relative w-full flex items-end justify-center h-48 bg-slate-50/50 rounded-xl group-hover:bg-slate-100 transition-colors cursor-pointer">
                                    <div 
                                        className="w-full mx-2 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg shadow-sm transition-all duration-1000 ease-out group-hover:from-blue-600 group-hover:to-cyan-500 relative"
                                        style={{ height: `${d.height}%`, minHeight: d.value > 0 ? '4px' : '0' }}
                                    >
                                        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black py-1 px-2.5 rounded shadow-xl z-20 opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 whitespace-nowrap flex flex-col items-center">
                                            <span>{d.value} Submissions</span>
                                            <span className="text-[8px] text-slate-400 mt-0.5">{d.fullLabel}</span>
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs font-bold text-slate-400 mt-3 uppercase tracking-wide">{d.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section: Leaderboard with Snapshots */}
            <div className={`bg-white p-6 rounded-2xl border shadow-sm transition-all duration-500 ${selectedSnapshotMonth !== 'Current' ? 'border-amber-200 bg-amber-50/10' : 'border-slate-100'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 flex items-center">
                            LGU Leaderboard 
                            {selectedSnapshotMonth !== 'Current' && (
                                <span className="ml-3 px-3 py-1 bg-amber-500 text-white text-[10px] font-black uppercase rounded-full shadow-sm animate-pulse">
                                    Historical Snapshot
                                </span>
                            )}
                        </h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">Ranking of LGUs based on overall compliance performance.</p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">View Snapshot:</span>
                        <select 
                            value={selectedSnapshotMonth} 
                            onChange={(e) => setSelectedSnapshotMonth(e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg text-xs font-bold p-2 outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]"
                        >
                            <option value="Current">Real-Time (Latest)</option>
                            {availableSnapshotMonths.map(m => (
                                <option key={m} value={m}>{m} Snapshot</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                    {snapshotLeaderboard.map((lgu, idx) => (
                        <div key={lgu.lgu} className={`flex items-center group p-3 rounded-xl hover:bg-white hover:shadow-lg transition-all border border-transparent relative ${idx === 0 ? 'bg-blue-50/50 border-blue-100' : ''}`}>
                            <div className={`
                                w-10 h-10 flex items-center justify-center rounded-xl text-sm font-black mr-4 shrink-0 shadow-sm
                                ${idx === 0 ? 'bg-amber-400 text-amber-900 ring-4 ring-amber-100' : 
                                  idx === 1 ? 'bg-slate-200 text-slate-700' : 
                                  idx === 2 ? 'bg-orange-100 text-orange-700' : 
                                  'bg-slate-50 text-slate-400'}
                            `}>
                                {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1.5">
                                    <span className="font-black text-slate-800 truncate pr-2">{lgu.lgu}</span>
                                    <span className={`text-sm font-black shrink-0 ${lgu.completionRate === 100 ? 'text-emerald-600' : 'text-slate-600'}`}>
                                        {lgu.completionRate}%
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden shadow-inner">
                                    <div 
                                        className={`h-full transition-all duration-1000 ease-out ${
                                            lgu.completionRate >= 90 ? 'bg-emerald-500' : 
                                            lgu.completionRate >= 70 ? 'bg-sky-500' : 
                                            lgu.completionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`} 
                                        style={{ width: `${lgu.completionRate}%` }}
                                    ></div>
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <span>{lgu.completedCount} / {complianceDefs.length} COMPLIED</span>
                                    <span className="opacity-60">
                                        {lgu.latestTimestamp ? new Date(lgu.latestTimestamp).toLocaleDateString() : 'NO UPDATES'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Detailed Tooltip on Hover */}
                            <div className="absolute inset-x-0 -top-16 mx-auto w-48 bg-slate-900 text-white p-3 rounded-xl shadow-2xl z-20 opacity-0 group-hover:opacity-100 transition-all pointer-events-none scale-90 group-hover:scale-100 flex flex-col items-center">
                                <div className="w-full text-center border-b border-white/10 pb-1 mb-1">
                                    <span className="text-[10px] font-black uppercase">{lgu.lgu}</span>
                                </div>
                                <div className="flex justify-between w-full text-[9px] font-bold">
                                    <span className="text-emerald-400">COMPLIED: {lgu.completedCount}</span>
                                    <span className="text-rose-400">PENDING: {complianceDefs.length - lgu.completedCount}</span>
                                </div>
                                <div className="mt-1 text-[8px] text-slate-400 text-center italic">
                                    {selectedSnapshotMonth === "Current" ? "Real-time compliance" : `Data as of ${selectedSnapshotMonth}`}
                                </div>
                                <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 rotate-45"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Category Performance Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Performance by Category</h3>
                    <div className="space-y-5">
                        {categoryStats.map((stat) => (
                            <div key={stat.category} className="group/cat relative">
                                <div className="flex justify-between text-sm mb-1.5">
                                    <span className="font-bold text-slate-600">{stat.category}</span>
                                    <span className={`font-bold ${stat.pct >= 80 ? 'text-emerald-500' : stat.pct >= 50 ? 'text-amber-500' : 'text-red-500'}`}>{stat.pct}%</span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                    <div 
                                        className={`h-2.5 rounded-full transition-all duration-1000 ${
                                            stat.pct >= 80 ? 'bg-emerald-400' : 
                                            stat.pct >= 50 ? 'bg-amber-400' : 'bg-red-400'
                                        }`} 
                                        style={{ width: `${stat.pct}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">Specific Report Compliance</h3>
                    <div className="flex-1 overflow-y-auto pr-2 max-h-[300px] custom-scrollbar">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            {useMemo(() => {
                                const stats = complianceDefs.map(def => {
                                    const completedCount = lguMatrix.filter(row => row[def.id]?.status === 'Completed').length;
                                    const totalLGUs = lguMatrix.length;
                                    return {
                                        id: def.id,
                                        title: def.title,
                                        pct: totalLGUs > 0 ? Math.round((completedCount / totalLGUs) * 100) : 0,
                                        completedCount,
                                        totalLGUs
                                    };
                                }).sort((a, b) => a.pct - b.pct);
                                return stats;
                            }, [lguMatrix, complianceDefs]).map((stat) => (
                                <div key={stat.id} className="border-b border-slate-50 pb-2 last:border-0 group/item relative">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-bold text-slate-600 truncate w-2/3" title={stat.title}>
                                            {stat.title}
                                        </span>
                                        <span className={`font-bold ${stat.pct === 100 ? 'text-emerald-500' : 'text-slate-400'}`}>{stat.pct}%</span>
                                    </div>
                                    <div className="w-full bg-slate-50 rounded-full h-2 overflow-hidden">
                                        <div 
                                            className={`h-2 rounded-full transition-all duration-1000 ${
                                                stat.pct === 100 ? 'bg-emerald-400' : 
                                                stat.pct >= 75 ? 'bg-sky-400' : 
                                                stat.pct >= 50 ? 'bg-amber-400' : 'bg-slate-300'
                                            }`} 
                                            style={{ width: `${stat.pct}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChartView;
