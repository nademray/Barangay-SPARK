
import { Report, ReportDefinition } from '../types';
import { REPORT_DEFINITIONS, BARANGAY_LEVEL_REPORT_IDS } from '../reportDefinitions';

declare global {
  interface Window {
    google?: {
      script: {
        run: {
          withSuccessHandler: (callback: (response: any) => void) => {
             withFailureHandler: (callback: (error: any) => void) => {
               [key: string]: (...args: any[]) => void;
             }
          }
        }
      }
    }
  }
}

// Conceptual link to the target spreadsheet database
const SPREADSHEET_ID = "1qBdEkK9XXhcyU0YCC8bkiRicKG06vDBk1P4T1XkgS4Q";
const GAS_API_URL: string = "https://script.google.com/macros/s/AKfycbwbcqRFSojMfv2EvO1B-gEUbm6j11MpsHlrXykP_AJ_nFE7wmCo4U4emEx5rGb4Xg/exec"; 

export const LGU_LIST = [
  'ALMAGRO', 'BASEY', 'CALBIGA', 'CITY OF CALBAYOG', 'CITY OF CATBALOGAN (Capital)',
  'DARAM', 'GANDARA', 'HINABANGAN', 'JIABONG', 'MARABUT', 'MATUGUINAO', 'MOTIONG',
  'PAGSANGHAN', 'PARANAS', 'PINABACDAO', 'SAN JORGE', 'SAN JOSE DE BUAN',
  'SAN SEBASTIAN', 'SANTA MARGARITA', 'SANTA RITA', 'STO. NIÑO', 'TAGAPUL-AN',
  'TALALORA', 'TARANGNAN', 'VILLAREAL', 'ZUMARRAGA'
];

/**
 * Robust date formatter to handle M/D/YYYY HH:mm:ss (24h)
 * Example: 1/19/2026 10:30:00
 */
export const formatTimestamp = (val: string | Date | null | undefined): string => {
    if (!val || val === 'Not Submitted' || val === 'Legacy Data') return String(val || 'Not Submitted');
    
    const d = new Date(val);
    if (isNaN(d.getTime())) return String(val);

    const year = d.getFullYear();
    const month = d.getMonth() + 1; // Month is 0-indexed
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');

    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
};

const runGas = async (functionName: string, ...args: any[]): Promise<any> => {
    if (window.google && window.google.script) {
        return new Promise((resolve, reject) => {
            window.google!.script.run
                .withSuccessHandler((data) => {
                    if (typeof data === 'string' && data.startsWith('Error:')) {
                        reject(new Error(data));
                    } else {
                        resolve(data);
                    }
                })
                .withFailureHandler((error) => {
                    console.error(`GAS Error [${functionName}]:`, error);
                    reject(error);
                })
                [functionName](...args);
        });
    }
    
    if (GAS_API_URL && GAS_API_URL !== "") {
        try {
            const response = await fetch(GAS_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ functionName, args })
            });
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
            const json = await response.json() as { status: string; data?: any; message?: string };
            if (json.status === 'success') {
                if (typeof json.data === 'string' && json.data.startsWith('Error:')) {
                    throw new Error(json.data);
                }
                return json.data;
            }
            else throw new Error(json.message || 'Script Error');
        } catch (error) {
            console.error(`Web API Connection Failed [${functionName}]:`, error);
            throw error;
        }
    }
    return null;
};

const normalizeLguName = (name: string): string => {
    const clean = String(name || "").trim().toUpperCase();
    if (!clean) return "";
    return clean;
};

const parseDateRobust = (val: string): Date => {
    if (!val || val.trim() === "") return new Date(NaN);
    let d = new Date(val);
    if (!isNaN(d.getTime())) return d;
    return new Date(NaN);
};

export const fetchReports = async (): Promise<Report[]> => {
  try {
    const results: any[] = [];
    const BATCH_SIZE = 3;
    
    for (let i = 0; i < REPORT_DEFINITIONS.length; i += BATCH_SIZE) {
        const batch = REPORT_DEFINITIONS.slice(i, i + BATCH_SIZE);
        const batchPromises = batch.map(def => runGas(def.backendFetchFunction));
        // Add a small delay between batches to be extra safe, though await Promise.all is usually enough
        if (i > 0) await new Promise(resolve => setTimeout(resolve, 500));
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    const reports: Report[] = [];

    results.forEach((rows, index) => {
        const def = REPORT_DEFINITIONS[index];
        if (!Array.isArray(rows) || rows.length < 2) return;

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            if (!row[0]) continue; 

            const details: any = {};
            const isBrgy = BARANGAY_LEVEL_REPORT_IDS.includes(def.id);
            
            const rawSheetCity = String(row[0]).trim();
            const rawSheetBrgy = isBrgy ? String(row[1]).trim() : "";
            
            const normalizedLgu = normalizeLguName(rawSheetCity);
            const displayBrgy = isBrgy ? rawSheetBrgy.toUpperCase() : "";

            if (isBrgy) {
                details.city = rawSheetCity; 
                details.barangay = rawSheetBrgy;
                def.fields.forEach((field, fIdx) => { details[field.key] = row[fIdx + 2]; });
            } else {
                details.city = rawSheetCity;
                def.fields.forEach((field, fIdx) => { details[field.key] = row[fIdx + 1]; });
            }
            
            let timestamp = "";
            let hasActualData = false;
            
            const dataStartIndex = isBrgy ? 2 : 1;
            const dataEndIndex = dataStartIndex + def.fields.length;

            for (let j = row.length - 1; j >= 1; j--) {
                const val = String(row[j] || "").trim();
                if (!val) continue;

                if (!timestamp && val.length >= 6) {
                    const d = parseDateRobust(val);
                    if (!isNaN(d.getTime())) {
                        timestamp = formatTimestamp(d);
                    }
                }
                
                if (j >= dataStartIndex && j < dataEndIndex) {
                    const valClean = val.toUpperCase();
                    if (valClean !== "PENDING" && valClean !== "NONE" && valClean !== "FALSE" && val !== "") {
                        if (valClean !== "0" && valClean !== "0.0" && valClean !== "0.00") {
                            hasActualData = true;
                        } else if (timestamp) {
                            hasActualData = true;
                        }
                    }
                    if (valClean === "/" || valClean === "1") hasActualData = true;
                    if (val.includes("http") || val.startsWith("data:")) hasActualData = true;
                }
            }
            
            let status = 'Pending';
            if (hasActualData) status = 'Completed';

            reports.push({
                'LGU/BARANGAY': isBrgy ? `${displayBrgy}, ${normalizedLgu}` : normalizedLgu,
                'REPORT TYPE': def.id,
                'FREQUENCY': def.frequency,
                'STATUS': status,
                'LAST UPDATED': timestamp || (hasActualData ? 'Legacy Data' : 'Not Submitted'), 
                'DATA SUMMARY': def.fields.slice(0, 2).map(f => {
                    const val = details[f.key];
                    if (f.type === 'file' || f.type === 'url') return `${f.label}: [Attached]`;
                    return `${f.label}: ${val || '-'}`;
                }).join(' | '), 
                'ACTION PLAN': details.actionPlan || "",
                'REMARKS': details.remarks || "",
                details: details,
                isOverdue: status === 'Pending',
                isLocked: false,
                canUpdate: true
            });
        }
    });
    return reports;
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return [];
  }
};

export const updateReportData = async (type: string, lguOrId: string, data: any): Promise<string> => {
    const def = REPORT_DEFINITIONS.find(d => d.id === type);
    if (!def) throw new Error(`Unknown report type: ${type}`);
    const isBrgy = BARANGAY_LEVEL_REPORT_IDS.includes(def.id);
    const timestamp = formatTimestamp(new Date());
    
    const args: any[] = [];
    
    if (isBrgy) {
        args.push(String(data.city || "").trim());
        args.push(String(data.barangay || "").trim());
        // For Weekly reports like Kalinisan, we MUST also pass the week to identify the correct row
        if (type === 'Kalinisan Brgy') {
            args.push(String(data.weekCovered || "").trim());
        }
    } else {
        args.push(String(data.city || lguOrId || "").trim());
    }
    
    def.fields.forEach(f => {
        const val = data[f.key];
        if (f.type === 'number') args.push(Number(val) || 0);
        else args.push(String(val !== undefined && val !== null ? val : ""));
    });
    args.push(def.googleDriveFolderId || "");
    args.push(timestamp); 
    args.push(""); 
    return runGas(def.backendUpdateFunction, ...args);
};

export const importBatchData = async (reportId: string, rows: any[]): Promise<string> => {
    return runGas('importBatchDataBackend', reportId, rows);
};
