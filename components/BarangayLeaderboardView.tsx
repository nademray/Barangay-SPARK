
import React, { useMemo, useState } from 'react';
import { Report, ReportDefinition } from '../types';
import { REPORT_DEFINITIONS } from '../reportDefinitions';

interface BarangayLeaderboardViewProps {
    reports: Report[];
    userLgu: string; // 'Province' or specific LGU name
    lgus: string[];
    barangaysMap: Record<string, string[]>;
}

/**
 * Utility to calculate the target deadline for a report definition.
 * Replicated from App.tsx logic for consistency.
 */
function getTargetDeadlineDate(def: ReportDefinition): Date {
    const now = new Date();
    const year = now.getFullYear();
    const D = def.deadline.day;
    const frequency = def.deadline.frequency || def.category.toLowerCase();
    const timeline: Date[] = [];

    if (frequency === 'monthly' || def.category === 'Monthly' || def.category === 'Quality Policy' || def.category === 'Barangay') {
        for (let y = year - 1; y <= year + 1; y++) {
            for (let m = 0; m < 12; m++) timeline.push(new Date(y, m, D, 23, 59, 59));
        }
    } else if (frequency === 'quarterly' || def.category === 'Quarterly') {
        const months = def.deadline.months || [3, 6, 9, 12];
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

const BarangayLeaderboardView: React.FC<BarangayLeaderboardViewProps> = ({ reports, userLgu, lgus, barangaysMap }) => {
    const [selectedLgu, setSelectedLgu] = useState<string>(userLgu === 'Province' ? lgus[0] : userLgu);

    const currentBarangays = useMemo(() => {
        return barangaysMap[selectedLgu] || [];
    }, [selectedLgu, barangaysMap]);

    const leaderboardData = useMemo(() => {
        if (!selectedLgu || currentBarangays.length === 0) return [];

        const data = currentBarangays.map(brgy => {
            let totalPoints = 0;
            let onTimeCount = 0;
            let lateCount = 0;
            let totalLeadTimeHours = 0; // Total hours ahead of deadline for on-time reports
            
            const relevantReports = reports.filter(r => 
                r.details?.city?.toUpperCase() === selectedLgu.toUpperCase() &&
                r.details?.barangay?.toUpperCase() === brgy.toUpperCase()
            );

            REPORT_DEFINITIONS.forEach(def => {
                const report = relevantReports.find(r => r['REPORT TYPE'] === def.id);
                const deadline = getTargetDeadlineDate(def);
                
                if (report && report.STATUS === 'Completed') {
                    const submissionDate = new Date(report['LAST UPDATED']);
                    
                    if (isNaN(submissionDate.getTime())) {
                        totalPoints += 1.0;
                        onTimeCount++;
                    } else if (submissionDate > deadline) {
                        // LATE: Fixed penalty
                        totalPoints += 0.5;
                        lateCount++;
                    } else {
                        // ON TIME: Calculate Precision Speed Bonus
                        // Base: 1.0
                        // Bonus: 0.1 pts per 24 hours early (max 0.5 bonus)
                        const diffMs = deadline.getTime() - submissionDate.getTime();
                        const hoursEarly = diffMs / (1000 * 60 * 60);
                        
                        const speedBonus = Math.min(0.5, (hoursEarly / 24) * 0.1);
                        totalPoints += (1.0 + speedBonus);
                        
                        onTimeCount++;
                        totalLeadTimeHours += hoursEarly;
                    }
                }
            });

            // Round to 3 decimal places for internal sorting, 2 for display
            totalPoints = Math.round(totalPoints * 1000) / 1000;
            const avgLeadTime = onTimeCount > 0 ? Math.round(totalLeadTimeHours / onTimeCount) : 0;
            const maxPossible = REPORT_DEFINITIONS.length;
            const percentage = Math.round((totalPoints / (maxPossible * 1.5)) * 100);

            return {
                barangay: brgy,
                totalPoints,
                onTimeCount,
                lateCount,
                avgLeadTime,
                percentage
            };
        });

        // Sort by Points Descending. 
        // Points already include time-based fractional bonuses, so tie-breaking is built-in.
        return data.sort((a, b) => b.totalPoints - a.totalPoints);
    }, [reports, selectedLgu, currentBarangays]);

    const podium = leaderboardData.slice(0, 3);
    const rest = leaderboardData.slice(3);

    return (
        <div className="space-y-10 animate-fade-in pb-20">
            {/* Header & LGU Selector */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">Barangay Leaderboard</h3>
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded uppercase">Precision v3.0</span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Rewarding speed down to the <span className="text-blue-600 font-bold">hour</span> for <span className="text-blue-600 font-bold">{selectedLgu}</span>.</p>
                </div>
                
                {userLgu === 'Province' && (
                    <div className="w-full md:w-auto">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Switch LGU View</label>
                        <select 
                            value={selectedLgu}
                            onChange={(e) => setSelectedLgu(e.target.value)}
                            className="w-full md:w-64 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            {lgus.map(lgu => (
                                <option key={lgu} value={lgu}>{lgu}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* The Podium Display */}
            {leaderboardData.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-8">
                    {/* Silver (Rank 2) */}
                    {podium[1] && <PodiumCard data={podium[1]} rank={2} color="bg-slate-400" icon="🥈" />}
                    
                    {/* Gold (Rank 1) */}
                    {podium[0] && (
                        <div className="order-first md:order-none scale-105 md:scale-110 z-10">
                             <PodiumCard data={podium[0]} rank={1} color="bg-amber-400" icon="🥇" isMain />
                        </div>
                    )}
                    
                    {/* Bronze (Rank 3) */}
                    {podium[2] && <PodiumCard data={podium[2]} rank={3} color="bg-orange-400" icon="🥉" />}
                </div>
            )}

            {/* List for the rest */}
            <div className="space-y-4 max-w-4xl mx-auto mt-12">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-6 flex justify-between">
                    <span>LGU Standings</span>
                    <span>Precision Score</span>
                </h4>
                {rest.map((data, idx) => (
                    <div key={data.barangay} className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-200 hover:shadow-md transition-all group">
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 font-black text-sm border group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                            {idx + 4}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-2">
                                <h5 className="font-black text-slate-800 truncate pr-4">{data.barangay}</h5>
                                <div className="text-right">
                                    <span className="text-sm font-black text-slate-800 tabular-nums">{data.totalPoints.toFixed(2)}</span>
                                    <span className="text-[10px] text-slate-400 font-bold block leading-none">PTS</span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, data.percentage)}%` }}></div>
                            </div>
                        </div>
                        <div className="hidden lg:flex gap-4 border-l border-slate-100 pl-6 ml-2">
                            <div className="text-center">
                                <span className="block text-[8px] font-black text-blue-500 uppercase">Avg Lead</span>
                                <span className="text-xs font-black text-blue-600 tabular-nums">{data.avgLeadTime}h</span>
                            </div>
                            <div className="text-center">
                                <span className="block text-[8px] font-black text-emerald-500 uppercase">Complied</span>
                                <span className="text-xs font-black text-emerald-600 tabular-nums">{data.onTimeCount}</span>
                            </div>
                        </div>
                    </div>
                ))}
                
                {leaderboardData.length === 0 && (
                    <div className="p-20 text-center bg-slate-50 border border-dashed rounded-3xl">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No submission data found for ranking.</p>
                    </div>
                )}
            </div>

            {/* Precision Scoring Legend */}
            <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl max-w-4xl mx-auto relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 2px, transparent 0)', backgroundSize: '24px 24px' }}></div>
                <div className="relative z-10">
                    <div className="text-center mb-8">
                        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Precision Efficiency Model</h4>
                        <p className="text-xs font-medium text-slate-400 max-w-md mx-auto">Our system Distinguishes between AM and PM submissions. Every hour submitted before the deadline increases your score.</p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                            <div className="text-3xl font-black text-blue-400 mb-1">1.0 + BONUS</div>
                            <p className="text-[10px] font-black uppercase text-blue-200 tracking-widest mb-3">On-Time Submissions</p>
                            <p className="text-[9px] font-medium opacity-60 leading-relaxed">Earn <strong className="text-blue-300">+0.10 pts</strong> for every 24h of lead time. Capped at 1.50 pts per report.</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                            <div className="text-3xl font-black text-amber-500 mb-1">0.50 PT</div>
                            <p className="text-[10px] font-black uppercase text-amber-200 tracking-widest mb-3">Late Submissions</p>
                            <p className="text-[9px] font-medium opacity-60 leading-relaxed">Submissions received after the target deadline receive a flat penalty with no speed bonus.</p>
                        </div>
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
                            <div className="text-3xl font-black text-slate-500 mb-1">0.00 PT</div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3">Missing Records</p>
                            <p className="text-[9px] font-medium opacity-60 leading-relaxed">No submission detected for the current reporting cycle.</p>
                        </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-white/5 flex flex-wrap justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">AM Submission &gt; PM Submission</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Higher Precision Ranking</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PodiumCard: React.FC<{ data: any, rank: number, color: string, icon: string, isMain?: boolean }> = ({ data, rank, color, icon, isMain }) => {
    return (
        <div className={`relative p-6 rounded-[32px] bg-white border border-slate-100 shadow-xl flex flex-col items-center text-center overflow-hidden group hover:-translate-y-2 transition-transform duration-300 ${isMain ? 'ring-4 ring-amber-400/20' : ''}`}>
            {/* Rank Badge */}
            <div className={`absolute top-4 left-4 w-8 h-8 rounded-full ${color} text-white text-xs font-black flex items-center justify-center shadow-lg`}>
                {rank}
            </div>
            
            <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform">{icon}</div>
            
            <h4 className={`text-lg font-black text-slate-800 mb-1 truncate w-full ${isMain ? 'text-xl' : ''}`}>
                {data.barangay}
            </h4>
            
            <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-black text-blue-600 tabular-nums">{data.totalPoints.toFixed(2)}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase">PTS</span>
            </div>

            <div className="w-full space-y-3 pt-4 border-t border-slate-50">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                    <span>Performance</span>
                    <span className="text-blue-500">{data.percentage}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden shadow-inner">
                    <div className={`h-full rounded-full ${isMain ? 'bg-amber-400' : 'bg-blue-500'}`} style={{ width: `${Math.min(100, data.percentage)}%` }}></div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                    <div className="bg-blue-50 p-2 rounded-xl border border-blue-100">
                        <span className="block text-[7px] font-black text-blue-600 uppercase">Avg Advantage</span>
                        <span className="text-sm font-black text-blue-700 tabular-nums">{data.avgLeadTime}h early</span>
                    </div>
                    <div className="bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                        <span className="block text-[7px] font-black text-emerald-600 uppercase">Success Rate</span>
                        <span className="text-sm font-black text-emerald-700">{data.onTimeCount}/{REPORT_DEFINITIONS.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BarangayLeaderboardView;
