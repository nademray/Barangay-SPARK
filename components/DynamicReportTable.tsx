
import React, { useState, useMemo } from 'react';
import { Report, ReportDefinition } from '../types';
import { StatusBadge, ActionButton } from './ReportsTable';
import ReportProgress from './ReportProgress';
import ExportMenu from './ExportMenu';
import { LGU_LIST } from '../services/dataService';

declare const XLSX: any;

interface DynamicReportTableProps {
  reports: Report[];
  definition: ReportDefinition;
  onEdit: (report: Report) => void;
  isProvince?: boolean;
  manualOverrideState?: 'locked' | 'unlocked' | null;
  onSetOverride?: (state: 'locked' | 'unlocked' | null) => void;
}

const DynamicReportTable: React.FC<DynamicReportTableProps> = ({ 
    reports, 
    definition, 
    onEdit, 
    isProvince,
    manualOverrideState = null,
    onSetOverride
}) => {
  const [viewFiles, setViewFiles] = useState<{ title: string, urls: string[] } | null>(null);
  const [lguFilter, setLguFilter] = useState<string>("All");

  const displayedReports = useMemo(() => {
      if (!isProvince || lguFilter === "All") return reports;
      return reports.filter(r => {
          const city = (r.details?.city || "").toUpperCase();
          return city === lguFilter.toUpperCase();
      });
  }, [reports, lguFilter, isProvince]);

  const handleDownloadPdf = () => {
      if (!(window as any).jspdf) return;
      const { jsPDF } = (window as any).jspdf;
      const doc = new jsPDF('l', 'mm', 'a4');
      const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      doc.setFontSize(12).text("DILG-SAMAR", 148.5, 15, { align: 'center' });
      const filterSuffix = isProvince && lguFilter !== "All" ? ` - ${lguFilter}` : "";
      doc.setFontSize(11).text(`Full Data Export: ${definition.title}${filterSuffix} as of ${dateStr}`, 148.5, 22, { align: 'center' });
      const headers = ['LGU/BARANGAY', ...definition.fields.map(f => f.label), 'STATUS', 'LAST UPDATED'];
      const data = displayedReports.map(report => {
          const row = [report['LGU/BARANGAY']];
          definition.fields.forEach(field => {
              let val = report.details?.[field.key];
              if (Array.isArray(val)) val = `${val.length} file(s) attached`;
              else if (typeof val === 'string' && val.startsWith('data:')) val = 'File Pending Upload';
              row.push(val || '');
          });
          row.push(report.STATUS);
          row.push(report['LAST UPDATED']);
          return row;
      });
      (doc as any).autoTable({ head: [headers], body: data, startY: 30, styles: { fontSize: 6, cellPadding: 1 }, headStyles: { fillColor: [30, 41, 59], textColor: 255 }, theme: 'grid' });
      doc.save(`${definition.title}${filterSuffix.replace(/\s+/g, '_')}_Export.pdf`);
  };

  const handleDownloadExcel = () => {
      if (typeof XLSX === 'undefined') return;
      const headers = ['LGU/BARANGAY', ...definition.fields.map(f => f.label), 'STATUS', 'LAST UPDATED'];
      const data = displayedReports.map(report => {
          const row = [report['LGU/BARANGAY']];
          definition.fields.forEach(field => {
              let val = report.details?.[field.key];
              if (Array.isArray(val)) val = val.join(', ');
              row.push(val || '');
          });
          row.push(report.STATUS);
          row.push(report['LAST UPDATED']);
          return row;
      });
      const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
      const wb = XLSX.utils.book_new();
      const filterSuffix = isProvince && lguFilter !== "All" ? `_${lguFilter}` : "";
      XLSX.utils.book_append_sheet(wb, ws, "Full Report Data");
      XLSX.writeFile(wb, `${definition.title}${filterSuffix.replace(/\s+/g, '_')}_Export.xlsx`);
  };

  const getHeaderStyle = () => {
    switch(definition.category) {
      case 'Monthly': return 'bg-gradient-to-r from-blue-700 to-blue-800';
      case 'Quarterly': return 'bg-gradient-to-r from-orange-600 to-orange-700';
      case 'Barangay': return 'bg-gradient-to-r from-indigo-600 to-indigo-800';
      default: return 'bg-gradient-to-r from-teal-700 to-teal-800';
    }
  };

  const getColumnClasses = (accessor: string) => {
      if (accessor === 'LGU/BARANGAY' || accessor === 'city' || accessor === 'barangay') return "w-[200px] min-w-[160px] text-slate-900 font-bold whitespace-normal align-top";
      return "min-w-[120px] whitespace-normal break-words text-slate-700 align-top";
  };

  const renderLinkCell = (val: any, reportTitle: string) => {
      const valStr = Array.isArray(val) ? val.join(',') : String(val);
      if (valStr.startsWith('data:')) {
          return (
            <div className="inline-flex items-center px-2 py-1 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-700 font-bold uppercase tracking-tighter">
                <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5 animate-pulse"></span>
                File Attached
            </div>
          );
      }
      
      const links = valStr.split(/[\n,]+/).filter((v: string) => v.trim().startsWith('http'));
      
      if (links.length > 1) {
          return (
            <button 
                onClick={() => setViewFiles({ title: reportTitle, urls: links })} 
                className="inline-flex items-center justify-center text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold"
            >
                View {links.length} Files
            </button>
          );
      }
      
      if (links.length === 1) {
          return (
            <a 
                href={links[0].trim()} 
                target="_blank" 
                rel="noreferrer" 
                className="text-blue-600 hover:text-blue-800 font-medium"
            >
                View
            </a>
          );
      }
      
      return <span className="text-xs text-slate-400 italic">Pending Sync</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
        <ReportProgress reports={displayedReports} category={definition.category} />

        {/* ADMIN OVERRIDE PANEL */}
        {isProvince && onSetOverride && (
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden relative group">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 2px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-500/30">
                            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-white uppercase tracking-widest">Master Lock Override</h4>
                            <p className="text-xs text-slate-400 font-medium">Manually force this report open or closed across Samar.</p>
                        </div>
                    </div>

                    <div className="flex bg-slate-800 p-1.5 rounded-2xl border border-slate-700">
                        <button 
                            onClick={() => onSetOverride(null)}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${manualOverrideState === null ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Automatic
                        </button>
                        <button 
                            onClick={() => onSetOverride('locked')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${manualOverrideState === 'locked' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Force Lock
                        </button>
                        <button 
                            onClick={() => onSetOverride('unlocked')}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${manualOverrideState === 'unlocked' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                        >
                            Force Unlock
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/50 p-4 rounded-2xl border border-slate-200">
            <div className="flex-1 w-full">
                {isProvince && (
                    <div className="flex items-center gap-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Filter LGU Unit:</label>
                        <select value={lguFilter} onChange={(e) => setLguFilter(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all min-w-[200px] shadow-sm">
                            <option value="All">All Samar LGUs</option>
                            {LGU_LIST.map(lgu => <option key={lgu} value={lgu}>{lgu}</option>)}
                        </select>
                    </div>
                )}
            </div>
            <div className="flex items-center gap-3">
                <ExportMenu onExportPdf={handleDownloadPdf} onExportExcel={handleDownloadExcel} label="Export Full Data" />
            </div>
        </div>

        <div className="overflow-x-auto bg-white rounded-2xl shadow-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-100 table-fixed">
            <thead className={getHeaderStyle()}>
            <tr>
                {definition.columns.map((col) => (
                <th key={col.accessor} className={`px-4 py-5 text-left text-xs font-bold text-white uppercase tracking-wider ${getColumnClasses(col.accessor)} !text-white align-bottom opacity-90`}>
                    {col.header}
                </th>
                ))}
                <th className="px-4 py-5 text-center text-xs font-bold text-white uppercase tracking-wider w-[120px] min-w-[100px] sticky right-0 z-10 !text-white align-bottom shadow-xl" style={{backgroundColor: 'inherit'}}>Action</th>
            </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
            {displayedReports.map((report, idx) => (
                <tr key={idx} className={`transition-colors duration-150 ${report.STATUS === 'Completed' ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : (report.STATUS === 'Overdue' || report.STATUS === 'Late') ? 'bg-red-50/30 hover:bg-red-50/60' : 'hover:bg-slate-50'}`}>
                {definition.columns.map((col) => {
                    let val = (report as any)[col.accessor];
                    if (val === undefined && report.details) val = report.details[col.accessor];
                    return (
                    <td key={col.accessor} className={`px-4 py-4 text-sm ${getColumnClasses(col.accessor)}`}>
                        {col.type === 'link' && val ? (
                            renderLinkCell(val, report['LGU/BARANGAY'])
                        ) : col.type === 'badge' ? (
                        <StatusBadge status={report.STATUS} isOverdue={report.isOverdue} />
                        ) : (
                        <span>{val}</span>
                        )}
                    </td>
                    );
                })}
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium align-middle sticky right-0 bg-inherit border-l border-slate-100 text-center">
                    <ActionButton onClick={() => onEdit(report)} disabled={report.isLocked} status={report.STATUS} />
                </td>
                </tr>
            ))}
            </tbody>
        </table>
        </div>

        {viewFiles && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden border border-white/20">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="font-bold text-slate-800 text-lg">Attached Files</h3>
                            <p className="text-xs text-slate-500">{viewFiles.title}</p>
                        </div>
                        <button onClick={() => setViewFiles(null)} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-1 border border-slate-200">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1 bg-slate-50/30">
                        <div className="space-y-2">
                            {viewFiles.urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md transition-all group">
                                    <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-700 group-hover:text-blue-700">File {i + 1}</p>
                                        <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{url}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 bg-white text-right"><button onClick={() => setViewFiles(null)} className="px-5 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl">Close</button></div>
                </div>
            </div>
        )}
    </div>
  );
};

export default DynamicReportTable;
