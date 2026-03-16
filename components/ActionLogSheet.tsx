
import React, { useMemo, useState, useEffect } from 'react';
import { Report } from '../types';
import ExportMenu from './ExportMenu';

declare const XLSX: any;

interface ActionLogSheetProps {
    reports: Report[];
    currentLgu: string; // 'Province' or specific LGU name
}

const ActionLogSheet: React.FC<ActionLogSheetProps> = ({ reports, currentLgu }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPeriod, setSelectedPeriod] = useState<string>("All");

    // Logic to prepare the log data
    const { filteredData, availablePeriods } = useMemo(() => {
        // 1. We only care about COMPLETED reports (submissions)
        let baseData = reports.filter(r => r.STATUS === 'Completed');
        
        // 2. Filter by LGU context
        if (currentLgu !== 'Province' && currentLgu !== 'All' && currentLgu !== '') {
            const search = currentLgu.toUpperCase();
            baseData = baseData.filter(r => {
                const reportLguBrgy = r['LGU/BARANGAY'].toUpperCase();
                const detailsCity = (r.details?.city || "").toUpperCase();
                const detailsBrgy = (r.details?.barangay || "").toUpperCase();

                return reportLguBrgy === search || 
                       detailsCity === search || 
                       detailsBrgy === search || 
                       reportLguBrgy.startsWith(search + ",") ||
                       reportLguBrgy.endsWith(", " + search);
            });
        }

        // 3. Extract unique Month-Year periods
        const periods = new Set<string>();
        baseData.forEach(r => {
            if (r['LAST UPDATED']) {
                const date = new Date(r['LAST UPDATED']);
                if (!isNaN(date.getTime())) {
                    const period = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                    periods.add(period);
                }
            }
        });

        const sortedPeriods = Array.from(periods).sort((a, b) => {
            return new Date(b).getTime() - new Date(a).getTime();
        });

        // 4. Filter by selected Period and Search Term
        let displayData = baseData;
        if (selectedPeriod !== "All") {
            displayData = displayData.filter(r => {
                if (!r['LAST UPDATED']) return false;
                const d = new Date(r['LAST UPDATED']);
                return d.toLocaleString('en-US', { month: 'long', year: 'numeric' }) === selectedPeriod;
            });
        }

        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            displayData = displayData.filter(r => 
                r['REPORT TYPE'].toLowerCase().includes(term) ||
                r['LGU/BARANGAY'].toLowerCase().includes(term)
            );
        }

        // Sort by Date (Most recent first)
        displayData.sort((a, b) => new Date(b['LAST UPDATED']).getTime() - new Date(a['LAST UPDATED']).getTime());

        return { filteredData: displayData, availablePeriods: sortedPeriods };
    }, [reports, currentLgu, searchTerm, selectedPeriod]);

    // Auto-select latest month if "All" but data is available
    useEffect(() => {
        if (selectedPeriod === "All" && availablePeriods.length > 0) {
            setSelectedPeriod(availablePeriods[0]);
        }
    }, [availablePeriods]);

    const handleExportPdf = () => {
        if (!(window as any).jspdf) return;
        const { jsPDF } = (window as any).jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const dateStr = new Date().toLocaleDateString();
        
        doc.setFontSize(16);
        doc.setTextColor(30, 41, 59);
        doc.text("MONTHLY SUBMISSION LOG", 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(`DILG Samar Provincial Office | Report Keeper`, 105, 26, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text(`Office: ${currentLgu}`, 20, 40);
        doc.text(`Period: ${selectedPeriod}`, 20, 47);
        doc.text(`Total Submissions: ${filteredData.length}`, 190, 47, { align: 'right' });

        const headers = [['#', 'Submission Date & Time', 'Report Title / Unit']];
        const body = filteredData.map((r, i) => [
            i + 1,
            r['LAST UPDATED'],
            r['REPORT TYPE'] + (r['LGU/BARANGAY'] !== currentLgu ? ` (${r['LGU/BARANGAY']})` : '')
        ]);

        (doc as any).autoTable({
            head: headers,
            body: body,
            startY: 55,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: { 0: { width: 10 }, 1: { width: 60 } }
        });

        doc.save(`${currentLgu}_Submission_Log_${selectedPeriod.replace(/\s+/g, '_')}.pdf`);
    };

    const handleExportExcel = () => {
        if (typeof XLSX === 'undefined') return;
        const headers = ['Submission Date', 'Report Title', 'Target Unit'];
        const body = filteredData.map(r => [
            r['LAST UPDATED'],
            r['REPORT TYPE'],
            r['LGU/BARANGAY']
        ]);
        
        const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Submissions");
        XLSX.writeFile(wb, `${currentLgu}_Log_${selectedPeriod.replace(/\s+/g, '_')}.xlsx`);
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20 max-w-5xl mx-auto">
            {/* Monthly Selector */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-wrap items-center gap-3">
                <div className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0 shadow-md shadow-blue-200">
                    Monthly Form
                </div>
                <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar flex-1">
                    <button 
                        onClick={() => setSelectedPeriod("All")}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                            selectedPeriod === "All" 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-slate-100'
                        }`}
                    >
                        All Time
                    </button>
                    {availablePeriods.map(p => (
                        <button 
                            key={p}
                            onClick={() => setSelectedPeriod(p)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                                selectedPeriod === p 
                                ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-100' 
                                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            {/* Utility Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-80">
                    <input 
                        type="text" 
                        placeholder="Search specific report..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entries Found</p>
                        <p className="text-sm font-black text-slate-700">{filteredData.length} Submissions</p>
                    </div>
                    <ExportMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} label="Generate Log PDF" />
                </div>
            </div>

            {/* The Simplified Log List */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Submission Date</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Title</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredData.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="px-6 py-20 text-center">
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No submissions logged for {selectedPeriod}</p>
                                </td>
                            </tr>
                        ) : (
                            filteredData.map((log, i) => (
                                <tr key={i} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-3 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <span className="text-sm font-bold text-slate-600 tabular-nums">
                                                {log['LAST UPDATED']}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800">
                                                {log['REPORT TYPE']}
                                            </span>
                                            {/* Show Barangay info if it's different from the parent LGU */}
                                            {log['LGU/BARANGAY'] !== currentLgu && (
                                                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">
                                                    {log['LGU/BARANGAY']}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Log Footer Decoration */}
            <div className="flex justify-center items-center gap-4 py-8 opacity-20 grayscale">
                <img src="https://upload.wikimedia.org/wikipedia/commons/c/c9/Department_of_the_Interior_and_Local_Government_%28DILG%29_Seal_-_Logo.svg" alt="Seal" className="h-10" />
                <div className="h-px w-24 bg-slate-400"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">DILG SPARK LOG</p>
                <div className="h-px w-24 bg-slate-400"></div>
            </div>
        </div>
    );
};

export default ActionLogSheet;
