import React, { useState, useRef } from 'react';
import { ReportDefinition } from '../types';

declare const XLSX: any;

interface BatchImportModalProps {
  definition: ReportDefinition;
  onClose: () => void;
  onImport: (data: any[]) => Promise<void>;
}

const BatchImportModal: React.FC<BatchImportModalProps> = ({ definition, onClose, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = () => {
    if (typeof XLSX === 'undefined') {
        alert("Excel library not loaded. Please refresh.");
        return;
    }

    const headers = ['City', 'Barangay', ...definition.fields.map(f => f.label)];
    const sampleRow = ['CITY NAME', 'BARANGAY NAME', ...definition.fields.map(f => {
        if (f.type === 'select') return `Options: ${f.options?.join('/')}`;
        if (f.type === 'number') return '0';
        return 'Text';
    })];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${definition.id}_Import_Template.xlsx`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
        setFile(selectedFile);
        parseFile(selectedFile);
    }
  };

  const parseFile = (file: File) => {
      setIsProcessing(true);
      setError(null);
      const reader = new FileReader();
      
      reader.onload = (e) => {
          try {
              const data = e.target?.result;
              const workbook = XLSX.read(data, { type: 'binary' });
              const sheetName = workbook.SheetNames[0];
              const sheet = workbook.Sheets[sheetName];
              const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

              if (json.length < 2) {
                  setError("File appears empty or missing headers.");
                  setIsProcessing(false);
                  return;
              }

              const headers = (json[0] as any[]).map(h => String(h || "").toLowerCase().trim());
              const rows = json.slice(1);
              
              const cityIdx = headers.findIndex(h => h.includes('city') || h.includes('lgu'));
              const brgyIdx = headers.findIndex(h => h.includes('barangay') || h.includes('brgy'));

              if (cityIdx === -1) {
                  setError("Could not find 'City' or 'LGU' column.");
                  setIsProcessing(false);
                  return;
              }

              const parsedData = rows.map((r: any) => {
                  if (!r || r.length === 0) return null;
                  
                  // This object structure must match what importBatchDataBackend expects
                  const rowObj: any = {
                      city: String(r[cityIdx] || "").trim().toUpperCase(),
                      barangay: brgyIdx !== -1 ? String(r[brgyIdx] || "").trim() : ""
                  };
                  
                  definition.fields.forEach(f => {
                      const keyMatchIdx = headers.indexOf(f.key.toLowerCase().trim());
                      const labelMatchIdx = headers.indexOf(f.label.toLowerCase().trim());
                      const finalIdx = keyMatchIdx !== -1 ? keyMatchIdx : labelMatchIdx;
                      
                      if (finalIdx !== -1) {
                          rowObj[f.key] = r[finalIdx];
                      }
                  });
                  return rowObj;
              }).filter((r: any) => r !== null && r.city);

              if (parsedData.length === 0) {
                  setError("No valid rows with City data found.");
              }

              setPreviewData(parsedData);
          } catch (err: any) {
              setError("Failed to parse file: " + err.message);
          } finally {
              setIsProcessing(false);
          }
      };
      
      reader.readAsBinaryString(file);
  };

  const handleImport = async () => {
      if (previewData.length === 0) return;
      setIsProcessing(true);
      try {
          await onImport(previewData);
          onClose();
      } catch (err: any) {
          setError("Import failed: " + (err.message || "Unknown error"));
          setIsProcessing(false);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-slate-200 flex flex-col max-h-[85vh]">
        <div className="bg-slate-800 px-6 py-4 flex justify-between items-center border-b border-slate-700 shrink-0">
          <h3 className="text-lg font-bold text-white tracking-tight">Batch Import: {definition.title}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white transition-colors">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            <div className="mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h4 className="font-bold text-blue-800 mb-2 text-sm">Step 1: Get the Template</h4>
                <p className="text-sm text-blue-600 mb-3">Download the template to ensure column headers match.</p>
                <button onClick={handleDownloadTemplate} className="flex items-center px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-md text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Download Template (.xlsx)
                </button>
            </div>

            <div className="mb-6">
                <h4 className="font-bold text-slate-800 mb-2 text-sm">Step 2: Upload Data</h4>
                <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileChange} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {error && <p className="mt-2 text-sm text-red-600 font-medium bg-red-50 p-2 rounded border border-red-100">⚠️ {error}</p>}
            </div>

            {previewData.length > 0 && (
                <div>
                    <h4 className="font-bold text-slate-800 mb-2 text-sm">Step 3: Preview ({previewData.length} rows found)</h4>
                    <div className="max-h-48 overflow-auto border border-slate-200 rounded-lg">
                        <table className="min-w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Target</th>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-200">
                                {previewData.slice(0, 50).map((r, i) => (
                                    <tr key={i}>
                                        <td className="px-3 py-2 text-xs text-slate-900 font-medium">{r.city} | {r.barangay}</td>
                                        <td className="px-3 py-2 text-xs text-green-600 font-bold uppercase tracking-widest">Ready</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>

        <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-200 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:text-slate-800 text-sm uppercase tracking-wide transition-colors">Cancel</button>
            <button onClick={handleImport} disabled={previewData.length === 0 || isProcessing} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center uppercase tracking-wide transition-all">
                {isProcessing ? 'Processing...' : 'Import Records'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default BatchImportModal;