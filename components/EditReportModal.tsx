
import React, { useState, useEffect, useMemo } from 'react';
import { Report, FieldDefinition } from '../types';
import { REPORT_DEFINITIONS } from '../reportDefinitions';

interface EditReportModalProps {
  report: Report;
  onSave: (updatedDetails: any) => void;
  onClose: () => void;
}

/**
 * Calculates a uniform week string for the Kalinisan weekly report.
 * Format: Week [N] - [Month] [Start]-[Month] [End], [Year]
 * Adjusted Logic: 
 * - If today is Fri (5) or Sat (6), "Offset 0" is the current week ending this Saturday (Early Open).
 * - If today is Sun (0) to Thu (4), "Offset 0" is the previous week ending last Saturday.
 */
function getKalinisanWeekString(offsetWeeks: number = 0) {
  const date = new Date();
  const day = date.getDay(); // 0 (Sun) - 6 (Sat)
  
  // Find Sunday of the CURRENT calendar week
  const currentSunday = new Date(date);
  currentSunday.setDate(date.getDate() - day);
  currentSunday.setHours(0, 0, 0, 0);

  // Determine Base Reporting Week (Offset 0) based on Reporting Window
  // The Kalinisan window opens on Friday (Day 5). 
  // If Today is Fri (5) or Sat (6), we include the current week ending this Saturday.
  // If Today is Sun (0) to Thu (4), we target the previous week ending last Saturday.
  let baseSunday = new Date(currentSunday);
  if (day < 5) {
      baseSunday.setDate(baseSunday.getDate() - 7);
  }

  // Apply the requested offset
  const targetSunday = new Date(baseSunday);
  targetSunday.setDate(baseSunday.getDate() - (offsetWeeks * 7));

  const targetSaturday = new Date(targetSunday);
  targetSaturday.setDate(targetSunday.getDate() + 6);

  // Calculate Week Number based on first Sunday of the year
  const firstDayOfYear = new Date(targetSunday.getFullYear(), 0, 1);
  let firstSundayOfYear = new Date(firstDayOfYear);
  while (firstSundayOfYear.getDay() !== 0) {
    firstSundayOfYear.setDate(firstSundayOfYear.getDate() + 1);
  }

  let weekNo = 1;
  if (targetSunday < firstSundayOfYear) {
    // If before the first Sunday of this year, it's the tail end of the previous year
    const prevYear = targetSunday.getFullYear() - 1;
    const firstDayPrev = new Date(prevYear, 0, 1);
    let firstSunPrev = new Date(firstDayPrev);
    while (firstSunPrev.getDay() !== 0) firstSunPrev.setDate(firstSunPrev.getDate() + 1);
    weekNo = Math.floor((targetSunday.getTime() - firstSunPrev.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  } else {
    weekNo = Math.floor((targetSunday.getTime() - firstSundayOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
  }

  const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
  const startStr = targetSunday.toLocaleDateString('en-US', options);
  const endStr = targetSaturday.toLocaleDateString('en-US', options);
  const year = targetSunday.getFullYear();

  return `Week ${weekNo} - ${startStr}-${endStr}, ${year}`;
}

const EditReportModal: React.FC<EditReportModalProps> = ({ report, onSave, onClose }) => {
  const [formData, setFormData] = useState<any>({});
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const definition = useMemo(() => 
    REPORT_DEFINITIONS.find(d => d.id === report['REPORT TYPE']), 
    [report]
  );

  useEffect(() => {
    if (report && report.details) {
      const initialData = { ...report.details };
      
      // Smart Defaulting for Kalinisan:
      // If the report status is NOT 'Completed' (meaning it's Pending, Late, or Overdue),
      // we assume the user is updating for the NEW cycle that just ended.
      // Therefore, we overwrite the date to the latest "Week that Ended".
      if (report['REPORT TYPE'] === 'Kalinisan Brgy') {
          const isResetMode = report.STATUS === 'Pending' || report.STATUS === 'Late' || report.STATUS === 'Overdue' || !initialData.weekCovered;
          
          if (isResetMode) {
              initialData.weekCovered = getKalinisanWeekString(0); // Default to the latest finished/open week
          }
      }

      // Initial BARCO percentage compute
      if (report['REPORT TYPE'] === 'BARCO Brgy') {
          const total = parseFloat(initialData.totalRoads) || 0;
          const cleared = parseFloat(initialData.clearedRoads) || 0;
          if (total > 0) {
              initialData.percentage = ((cleared / total) * 100).toFixed(2) + '%';
          } else {
              initialData.percentage = initialData.percentage || '0%';
          }
      }
      
      setFormData(initialData);
    }
  }, [report]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => {
        const next = { ...prev, [name]: value };

        // Auto-compute BARCO Percentage
        if (report['REPORT TYPE'] === 'BARCO Brgy') {
            if (name === 'totalRoads' || name === 'clearedRoads') {
                const total = parseFloat(next.totalRoads) || 0;
                const cleared = parseFloat(next.clearedRoads) || 0;
                if (total > 0) {
                    next.percentage = ((cleared / total) * 100).toFixed(2) + '%';
                } else {
                    next.percentage = '0%';
                }
            }
        }

        return next;
    });
  };

  const handleFileChange = (key: string, dataUrl: string | string[]) => {
      setFormData((prev: any) => ({ ...prev, [key]: dataUrl }));
  };

  const handleRemoveFile = (key: string, indexToRemove: number) => {
      setFormData((prev: any) => {
          const currentVal = prev[key];
          let newArray: string[] = [];
          if (Array.isArray(currentVal)) newArray = [...currentVal];
          else if (typeof currentVal === 'string' && currentVal) {
              if (currentVal.trim().startsWith('data:')) newArray = [currentVal];
              else newArray = currentVal.split(/[\n,]+/).filter(v => v.trim() !== '');
          }
          if (indexToRemove >= 0 && indexToRemove < newArray.length) newArray.splice(indexToRemove, 1);
          return { ...prev, [key]: newArray.length === 0 ? '' : newArray };
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingFile) return;
    setValidationError(null);

    if (definition) {
        for (const field of definition.fields) {
            if (field.required) {
                const val = formData[field.key];
                const isEmpty = val === undefined || val === null || (typeof val === 'string' && val.trim() === '') || (Array.isArray(val) && val.length === 0);
                if (isEmpty) {
                    setValidationError(`Please fill out the required field: "${field.label}"`);
                    const el = document.getElementById(field.key);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    return;
                }
            }
        }
    }

    // SPECIALIZED VALIDATION FOR FTJS
    if (report['REPORT TYPE'] === 'FTJS') {
        const total = parseFloat(formData.totalBeneficiaries) || 0;
        const male = parseFloat(formData.male) || 0;
        const female = parseFloat(formData.female) || 0;
        const hs = parseFloat(formData.hs) || 0;
        const college = parseFloat(formData.college) || 0;
        const osy = parseFloat(formData.osy) || 0;

        const genderSum = male + female;
        const eduSum = hs + college + osy;

        // Check Gender Breakdown
        if (genderSum > total) {
            setValidationError(`Gender Integrity Error: The sum of Male (${male}) and Female (${female}) cannot exceed the Total Beneficiaries (${total}). Current sum: ${genderSum}`);
            const el = document.getElementById('male');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }

        // Check Education/Status Breakdown
        if (eduSum > total) {
            setValidationError(`Education Integrity Error: The sum of HS/Elem (${hs}), College (${college}), and OSY (${osy}) cannot exceed the Total Beneficiaries (${total}). Current sum: ${eduSum}`);
            const el = document.getElementById('hs');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }

    onSave(formData);
  };

  // Special handler for Kalinisan Week Options
  const kalinisanWeeks = useMemo(() => {
    if (report['REPORT TYPE'] !== 'Kalinisan Brgy') return [];
    return [
        getKalinisanWeekString(0), // Latest week (Activity week that just ended or is ending)
        getKalinisanWeekString(1), // Prev
        getKalinisanWeekString(2), // 2 weeks ago
        getKalinisanWeekString(3), // 3 weeks ago
    ];
  }, [report]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md transition-opacity">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-slate-200 transform transition-all scale-100">
        <div className="bg-slate-900 px-6 py-5 flex justify-between items-center border-b border-slate-800">
          <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Update Report Data</h3>
              <p className="text-xs text-slate-400 font-medium">{report['REPORT TYPE']}</p>
          </div>
          <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-1.5 rounded-full transition-colors focus:outline-none">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto bg-white text-slate-900 custom-scrollbar">
          <div className="mb-6 pb-4 border-b border-slate-100">
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Target LGU/Barangay</label>
             <div className="text-xl text-slate-900 font-extrabold tracking-tight">{report['LGU/BARANGAY']}</div>
          </div>

          {validationError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold animate-pulse">
                  ⚠️ {validationError}
              </div>
          )}

          {report['REPORT TYPE'] === 'FTJS' && (
              <div className="mb-6 p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs space-y-3">
                  <p className="font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-200 pb-1">Data Integrity Instructions</p>
                  <ul className="text-indigo-700 space-y-1 font-medium">
                      <li>• <strong>Gender Sum:</strong> Male + Female must not exceed the Total.</li>
                      <li>• <strong>Category Sum:</strong> HS/Elem + College + OSY must not exceed the Total.</li>
                  </ul>
              </div>
          )}

          {report['REPORT TYPE'] === 'ESWM' && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-3">
                  <p className="font-bold text-amber-800 uppercase tracking-widest border-b border-amber-200 pb-1">Instructions</p>
                  <ul className="text-amber-700 space-y-1 font-medium">
                      <li>• Put <strong className="text-amber-900">(1)</strong> if indicator applies.</li>
                      <li>• Put <strong className="text-amber-900">(0)</strong> if indicator does not apply.</li>
                  </ul>
                  <p className="font-bold text-amber-800 uppercase tracking-widest border-b border-amber-200 pb-1 pt-2">Notes for 4d & 4e Compliance</p>
                  <ul className="grid grid-cols-2 gap-2 text-[10px] text-amber-700 font-bold uppercase">
                      <li>a. EO/ Ordinance</li>
                      <li>b. TWG Created</li>
                      <li>c. Presence of IECs</li>
                      <li>d. Violation Reports</li>
                  </ul>
              </div>
          )}

          {report['REPORT TYPE'] === 'HAPAG 2' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs">
                  <p className="font-bold text-blue-800 uppercase tracking-widest border-b border-blue-200 pb-1 mb-2">Instructions</p>
                  <p className="text-blue-700 font-black text-sm">ENCODE "1" IF YES; 0 IF NONE</p>
              </div>
          )}
          
          <div className="space-y-5">
            {definition?.fields.map(field => {
                // Inject dynamic options for Kalinisan week selector
                const fieldOverride = { ...field };
                if (report['REPORT TYPE'] === 'Kalinisan Brgy' && field.key === 'weekCovered') {
                    fieldOverride.options = kalinisanWeeks;
                }

                return (
                    <FormField 
                        key={field.key} 
                        field={fieldOverride} 
                        value={formData[field.key]} 
                        onChange={handleChange} 
                        onFileChange={handleFileChange}
                        onRemoveFile={handleRemoveFile}
                        setProcessing={setIsProcessingFile}
                    />
                );
            })}
          </div>
          
          <div className="mt-8 flex justify-end space-x-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" disabled={isProcessingFile} className={`px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg transition-all ${isProcessingFile ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}>
              {isProcessingFile ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Reading...
                  </div>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FormField: React.FC<{ 
    field: FieldDefinition;
    value: any; 
    onChange: (e: React.ChangeEvent<any>) => void; 
    onFileChange?: (key: string, dataUrl: string | string[]) => void;
    onRemoveFile?: (key: string, index: number) => void;
    setProcessing?: (isProcessing: boolean) => void;
}> = ({ field, value, onChange, onFileChange, onRemoveFile, setProcessing }) => {
  const labelClass = "block text-sm font-bold text-slate-700 mb-2";
  const inputClass = "w-full p-3 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 text-slate-900 bg-slate-50 font-medium transition-all outline-none";
  const readonlyClass = "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-bold";

  const renderLabel = () => (
      <label htmlFor={field.key} className={labelClass}>
          {field.label} {field.required && <span className="text-red-500 font-black ml-0.5">*</span>}
      </label>
  );

  if (field.type === 'select') {
      return (
        <div>
            {renderLabel()}
            <select id={field.key} name={field.key} value={value || ''} onChange={onChange} className={inputClass} required={field.required}>
                <option value="">Select...</option>
                {field.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
      );
  }

  if (field.type === 'textarea') {
    return (
        <div>
            {renderLabel()}
            <textarea id={field.key} name={field.key} value={value || ''} onChange={onChange} rows={3} className={inputClass} required={field.required} />
        </div>
    );
  }

  if (field.type === 'file') {
      let filesToDisplay: string[] = [];
      if (Array.isArray(value)) filesToDisplay = value;
      else if (typeof value === 'string' && value) {
          if (value.trim().startsWith('data:')) filesToDisplay = [value];
          else filesToDisplay = value.split(/[\n,]+/).filter(v => v.trim() !== '');
      }

      return (
        <div className={`p-5 rounded-2xl border-2 border-dashed transition-colors group ${field.required && filesToDisplay.length === 0 ? 'bg-red-50/30 border-red-200 hover:border-red-400' : 'bg-slate-50 border-slate-200 hover:border-blue-400'}`}>
            <div className="flex justify-between items-start mb-2">
                <label className={`${labelClass} group-hover:text-blue-700 transition-colors mb-0`}>
                    {field.label} {field.required && <span className="text-red-500 font-black ml-0.5">*</span>}
                </label>
                {field.required && filesToDisplay.length === 0 && (
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-white px-2 py-0.5 rounded border border-red-100">Required</span>
                )}
            </div>
            
            {filesToDisplay.length > 0 && (
                <div className="space-y-2 mb-4 mt-2">
                    {filesToDisplay.map((url, i) => {
                        const isPending = url.startsWith('data:');
                        return (
                            <div key={i} className={`flex items-center justify-between p-3 rounded-xl border shadow-sm transition-all ${isPending ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                                <div className="flex items-center min-w-0">
                                    <div className={`p-2 rounded-lg mr-3 ${isPending ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                        </svg>
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-bold text-slate-800 truncate">{isPending ? 'Ready for Upload' : 'Remote Attachment'}</p>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{isPending ? 'Local File' : 'Sync Active'}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => onRemoveFile?.(field.key, i)} className="ml-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="relative overflow-hidden cursor-pointer mt-2">
                <input
                    type="file"
                    id={field.key}
                    multiple={field.multiple}
                    required={field.required && filesToDisplay.length === 0}
                    onChange={(e) => {
                        const files = e.target.files;
                        if (files && files.length > 0 && onFileChange) {
                            setProcessing?.(true);
                            const readers = Array.from(files).map((file: File) => new Promise<string>(res => {
                                const r = new FileReader();
                                r.onload = ev => res((ev.target?.result as string) || '');
                                r.readAsDataURL(file as Blob);
                            }));
                            Promise.all(readers).then(results => {
                                onFileChange(field.key, field.multiple ? [...filesToDisplay, ...results] : results[0]);
                                setProcessing?.(false);
                                e.target.value = '';
                            }).catch(err => {
                                console.error("File Read Error:", err);
                                setProcessing?.(false);
                            });
                        }
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
                <div className={`flex flex-col items-center justify-center py-4 transition-colors ${field.required && filesToDisplay.length === 0 ? 'text-red-400 group-hover:text-red-600' : 'text-slate-400 group-hover:text-blue-500'}`}>
                    <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <span className="text-xs font-bold uppercase tracking-widest">{field.placeholder || (field.multiple ? 'Choose Files' : 'Choose File')}</span>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div>
        {renderLabel()}
        <input 
            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} 
            id={field.key} 
            name={field.key} 
            value={value || ''} 
            onChange={onChange} 
            className={`${inputClass} ${field.type === 'readonly' ? readonlyClass : ''}`} 
            required={field.required}
            readOnly={field.type === 'readonly'}
        />
    </div>
  );
};

export default EditReportModal;
