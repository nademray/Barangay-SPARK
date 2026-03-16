
import React, { useMemo, useState } from 'react';
import { Report, ReportDefinition } from '../types';
import { REPORT_DEFINITIONS, BARANGAY_LEVEL_REPORT_IDS } from '../reportDefinitions';
import ExportMenu from './ExportMenu';

declare const XLSX: any;

interface ProvinceSummaryViewProps {
  reports: Report[];
  lgus: string[];
  barangaysMap: Record<string, string[]>;
}

const ProvinceSummaryView: React.FC<ProvinceSummaryViewProps> = ({ reports, lgus, barangaysMap }) => {
  const [selectedLgu, setSelectedLgu] = useState<string>(lgus[0] || "");
  const [searchTerm, setSearchTerm] = useState("");

  const currentBarangays = useMemo(() => {
    return barangaysMap[selectedLgu] || [];
  }, [selectedLgu, barangaysMap]);

  const tallyData = useMemo(() => {
    if (!selectedLgu) return [];

    return currentBarangays.map(brgy => {
      const row: any = { barangay: brgy };
      
      REPORT_DEFINITIONS.forEach(def => {
        const report = reports.find(r => 
          r['REPORT TYPE'] === def.id && 
          r.details?.city?.toUpperCase() === selectedLgu.toUpperCase() &&
          r.details?.barangay?.toUpperCase() === brgy.toUpperCase()
        );

        row[def.id] = {
          status: report ? report.STATUS : 'Pending',
          updated: report ? report['LAST UPDATED'] : 'Never',
          summary: report ? report['DATA SUMMARY'] : 'No data'
        };
      });

      return row;
    });
  }, [reports, selectedLgu, currentBarangays]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return tallyData;
    const term = searchTerm.toLowerCase();
    return tallyData.filter(d => d.barangay.toLowerCase().includes(term));
  }, [tallyData, searchTerm]);

  const handleExportPdf = () => {
    if (!(window as any).jspdf) return;
    const { jsPDF } = (window as any).jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(`SUBMISSION TALLY: ${selectedLgu}`, 148.5, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 148.5, 22, { align: 'center' });
    
    const headers = [['Barangay', ...REPORT_DEFINITIONS.map(d => d.id)]];
    const body = filteredData.map(row => [
      row.barangay,
      ...REPORT_DEFINITIONS.map(def => row[def.id].status)
    ]);

    (doc as any).autoTable({
      head: headers,
      body: body,
      startY: 30,
      styles: { fontSize: 6, cellPadding: 1.5 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [248, 250, 252] }
      },
      theme: 'grid'
    });

    doc.save(`Tally_${selectedLgu.replace(/\s+/g, '_')}.pdf`);
  };

  const handleExportExcel = () => {
    if (typeof XLSX === 'undefined') return;
    const headers = ['Barangay', ...REPORT_DEFINITIONS.map(d => d.id)];
    const body = filteredData.map(row => [
      row.barangay,
      ...REPORT_DEFINITIONS.map(def => row[def.id].status)
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Barangay Tally");
    XLSX.writeFile(wb, `Tally_${selectedLgu.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="w-full md:w-1/3">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select LGU Unit</label>
          <select 
            value={selectedLgu}
            onChange={(e) => setSelectedLgu(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            {lgus.map(lgu => (
              <option key={lgu} value={lgu}>{lgu}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 flex gap-4 w-full md:w-auto">
          <div className="relative flex-1">
             <input 
              type="text" 
              placeholder="Filter Barangay..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
          <ExportMenu onExportPdf={handleExportPdf} onExportExcel={handleExportExcel} label="Export LGU Tally" />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
        {/* Maximum height increased to 92vh to fill more of the vertical space */}
        <div className="overflow-auto custom-scrollbar max-h-[92vh] shadow-inner bg-slate-50/20">
          <table className="min-w-full divide-y divide-slate-100 border-separate border-spacing-0">
            <thead className="bg-slate-900 text-white sticky top-0 z-[60] shadow-md">
              <tr>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest sticky left-0 top-0 bg-slate-900 z-[70] border-r border-slate-800">
                  Barangay
                </th>
                {REPORT_DEFINITIONS.map(def => (
                  <th key={def.id} className="px-4 py-5 text-center text-[9px] font-black uppercase tracking-tighter truncate max-w-[120px] whitespace-nowrap sticky top-0 bg-slate-900 z-[60]" title={def.title}>
                    {def.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={REPORT_DEFINITIONS.length + 1} className="px-6 py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-xs italic">
                    No records found for the selected LGU
                  </td>
                </tr>
              ) : (
                filteredData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4 text-xs font-black text-slate-700 sticky left-0 bg-white z-20 border-r border-slate-100 group-hover:bg-slate-50 shadow-[1px_0_4px_rgba(0,0,0,0.05)]">
                      {row.barangay}
                    </td>
                    {REPORT_DEFINITIONS.map(def => {
                      const data = row[def.id];
                      const isCompleted = data.status === 'Completed';
                      return (
                        <td key={def.id} className="px-4 py-4 text-center border-r border-slate-50 last:border-0">
                          <div className="flex flex-col items-center group/cell relative">
                            <span className={`w-3 h-3 rounded-full shadow-sm transition-transform group-hover/cell:scale-125 ${isCompleted ? 'bg-emerald-500 ring-4 ring-emerald-500/10' : 'bg-slate-200 opacity-60'}`}></span>
                            <span className={`mt-2 text-[8px] font-black uppercase tracking-tighter ${isCompleted ? 'text-emerald-600' : 'text-slate-300'}`}>
                              {isCompleted ? 'Done' : 'Pending'}
                            </span>
                            
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white p-3 rounded-xl shadow-2xl z-[80] opacity-0 group-hover/cell:opacity-100 transition-opacity pointer-events-none text-left">
                               <p className="text-[10px] font-black border-b border-white/10 pb-1 mb-1">{def.title}</p>
                               <p className="text-[9px] font-medium opacity-80 leading-relaxed truncate">{data.summary}</p>
                               <p className="text-[8px] font-black text-slate-400 mt-2">UPDATED: {data.updated}</p>
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reduced top margin (mt-4) to minimize gap before footer elements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Color Guide</h4>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-bold text-slate-700">Submitted (Completed)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-slate-200 opacity-60"></span>
              <span className="text-sm font-bold text-slate-700">Not Yet Submitted (Pending)</span>
            </div>
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Information</p>
          <p className="text-sm font-medium leading-relaxed italic opacity-80">
            "This table shows the real-time status of all required reports for each barangay in {selectedLgu}. Both headers and the barangay column are fixed for easier navigation."
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProvinceSummaryView;
