
/**
 * DILG SPARK - Backend Support Script
 * This script handles all CRUD operations and file management for the dashboard.
 */

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse(e.postData.contents);
  } catch (error) {
    return responseJSON({ status: 'error', message: 'Invalid JSON' });
  }

  const functionName = body.functionName;
  const args = body.args || [];

  const ALLOWED_FUNCTIONS = [
    'getPOGOData', 'getLPCCData', 'getRoadClearingData', 
    'getCockpitData', 'getCCTVData', 'getTradeunionData', 'getFTJSData',
    'updatePOGORow', 'updateLPCCRow', 'updateRoadClearingRow', 
    'updateCockpitRow', 'updateCCTVRow', 'updateTradeunionRow',
    'updateFTJSRow', 'resetAllFtjsDataBackend', 'batchUpdateFtjsZeroBackend',
    'getQP1Data', 'updateQP1Row', 'getQP2Data', 'updateQP2Row',
    'getQP4Data', 'updateQP4Row', 'getQP5Data', 'updateQP5Row', 'getQP6Data', 'updateQP6Row',
    'getQP7Data', 'updateQP7Row', 'getQP23Data', 'updateQP23Row',
    'getAntiRabiesData', 'updateAntiRabiesRow', 'getASFData', 'updateASFRow',
    'getASFBarangayData', 'updateASFBarangayRow', 'getBabayAsfData', 'updateBabayAsfRow', 'getPharmaceuticalData',
    'updatePharmaceuticalRow', 'getCLUPData', 'updateCLUPRow', 'getCDRAData', 'updateCDRARow', 'getLCCAPData',
    'updateLCCAPRow', 'getDRRMPlansData', 'updateDRRMPlansRow', 'getBFDPData', 'updateBFDPRow', 'batchUpdateBfdpColumnBackend',
    'getSKFPDData', 'updateSKFPDRow', 'batchUpdateSkfpdColumnBackend', 'getVawVacData', 'updateVawVacRow', 'getICADData',
    'updateICADRow', 'getKasambahayData', 'updateKasambahayRow', 'batchUpdateBarangayReportBackend', 'importBatchDataBackend',
    'updateKalinisanBrgyRow', 'getKalinisanBrgyData', 'updateKalinisanRow', 'getKalinisanData', 'getBarcoData', 'updateBarcoRow', 'getMidwivesData', 'updateMidwivesRow',
    'getESWMData', 'updateESWMRow', 'getABEData', 'updateABERow', 'getBarcoAnnexGData', 'updateBarcoAnnexGRow',
    'getCapDevData', 'updateCapDevRow', 'getICADIECData', 'updateICADIECRow', 'getBarcoBrgyData', 'updateBarcoBrgyRow',
    'getHAPAGData', 'updateHAPAGRow', 'getHAPAG2Data', 'updateHAPAG2Row'
  ];

  if (!ALLOWED_FUNCTIONS.includes(functionName)) {
    return responseJSON({ status: 'error', message: 'Function not allowed: ' + functionName });
  }

  try {
    const result = this[functionName](...args);
    return responseJSON({ status: 'success', data: result });
  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  }
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- CORE UTILITIES ---

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  return sheet.getDataRange().getDisplayValues();
}

function processIncomingData_(dataArray, folderId, lguName) {
  return dataArray.map(val => {
    if (typeof val === 'string' && val.startsWith('data:')) {
      if (!folderId) throw new Error("Google Drive Folder ID is missing. Cannot save file.");
      return uploadBase64ToDrive_(val, folderId, lguName);
    }
    return val;
  });
}

function uploadBase64ToDrive_(base64Data, folderId, prefix) {
  const splitData = base64Data.split(',');
  const contentTypeMatch = splitData[0].match(/:(.*?);/);
  if (!contentTypeMatch) return base64Data; 
  
  const contentType = contentTypeMatch[1];
  const byteCharacters = Utilities.base64Decode(splitData[1]);
  const blob = Utilities.newBlob(byteCharacters, contentType);
  
  const ext = contentType.split('/')[1] || 'bin';
  const dateStr = Utilities.formatDate(new Date(), "Asia/Manila", "MM-dd-yyyy");
  
  blob.setName(`${prefix}_${dateStr}.${ext}`);

  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  return file.getUrl();
}

function getTimestampColumnIndex_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return -1;
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const searchTerms = ['LAST UPDATED', 'TIMESTAMP', 'DATE UPDATED', 'DATE OF SUBMISSION', 'TIME UPDATED', 'UPDATED'];
  for (const term of searchTerms) {
    const idx = headers.findIndex(h => String(h || "").toUpperCase().trim().includes(term));
    if (idx !== -1) return idx + 1;
  }
  return -1;
}

function updateRowGeneric(sheetName, lgu, args) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  
  const data = sheet.getDataRange().getValues();
  const searchLgu = String(lgu || "").trim().toUpperCase();

  const extra = args.pop();
  const webTimestamp = args.pop();
  const folderId = args.pop();
  
  const processedData = processIncomingData_(args, folderId, lgu);
  const fieldCount = processedData.length;
  const timestampCol = getTimestampColumnIndex_(sheet);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === searchLgu) {
      if (fieldCount > 0) {
          sheet.getRange(i + 1, 2, 1, fieldCount).setValues([processedData]);
      }
      if (timestampCol !== -1) {
          sheet.getRange(i + 1, timestampCol).setValue(webTimestamp);
      }
      SpreadsheetApp.flush();
      return "Success";
    }
  }
  throw new Error("Target unit not found in " + sheetName + " [Search: " + searchLgu + "]");
}

function updateFTJSRowGeneric(sheetName, city, barangay, dataFields) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  
  const data = sheet.getDataRange().getValues();
  const searchCity = String(city || "").trim().toUpperCase();
  const searchBrgy = String(barangay || "").trim().toUpperCase();
  
  const flatArgs = Array.isArray(dataFields[0]) ? dataFields[0] : dataFields;
  const extra = flatArgs.pop();
  const webTimestamp = flatArgs.pop();
  const folderId = flatArgs.pop();
  
  const processedData = processIncomingData_(flatArgs, folderId, city + "_" + barangay);
  const fieldCount = processedData.length;
  const timestampCol = getTimestampColumnIndex_(sheet);

  for (let i = 1; i < data.length; i++) {
    const rowCity = String(data[i][0]).trim().toUpperCase();
    const rowBrgy = String(data[i][1]).trim().toUpperCase();
    
    if (rowCity === searchCity && rowBrgy === searchBrgy) {
      if (fieldCount > 0) {
          sheet.getRange(i + 1, 3, 1, fieldCount).setValues([processedData]);
      }
      if (timestampCol !== -1) {
          sheet.getRange(i + 1, timestampCol).setValue(webTimestamp);
      }
      SpreadsheetApp.flush();
      return "Success";
    }
  }
  
  const newRow = [city, barangay, ...processedData];
  if (timestampCol !== -1) {
    while (newRow.length < timestampCol - 1) newRow.push("");
    newRow[timestampCol - 1] = webTimestamp;
  }
  sheet.appendRow(newRow);
  SpreadsheetApp.flush();
  return "Success (New Entry Created)";
}

/**
 * Specialized update for Kalinisan Weekly reports.
 * 
 * Logic Change:
 * 1. Prioritizes updating an existing row for the City+Barangay match, regardless of the Week.
 *    This ensures "updating the current brgy" behavior rather than creating duplicates.
 * 2. If an EXACT match for City+Brgy+Week is found, it updates that specific row.
 * 3. If only City+Brgy is found (but week differs), it OVERWRITES that row (updating it to the new week).
 * 4. Only appends if the Barangay has no record at all.
 * 
 * Timestamp:
 * Forces format: 'M/d/yyyy HH:mm:ss' (e.g., 1/19/2026 10:30:00)
 */
function updateKalinisanBrgyRow(city, brgy, weekMatch, ...rest) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Kalinisan Brgy');
  if (!sheet) throw new Error("Sheet 'Kalinisan Brgy' not found");
  
  const data = sheet.getDataRange().getValues();
  const searchCity = String(city || "").trim().toUpperCase();
  const searchBrgy = String(brgy || "").trim().toUpperCase();
  // Normalize search week for comparison
  const searchWeekNorm = String(weekMatch || "").toLowerCase().replace(/\s+/g, '').replace(/[–—]/g, '-');
  
  const extra = rest.pop();
  // Override client timestamp with server-side generated timestamp in strict format
  rest.pop(); 
  const webTimestamp = Utilities.formatDate(new Date(), "Asia/Manila", "M/d/yyyy HH:mm:ss");
  const folderId = rest.pop();
  
  // Use a sanitized filename
  const processedData = processIncomingData_(rest, folderId, city + "_" + brgy + "_" + String(weekMatch).replace(/[^a-zA-Z0-9]/g, ''));
  const timestampCol = getTimestampColumnIndex_(sheet);

  let targetRowIndex = -1;

  // Scan rows to find the best match
  for (let i = 1; i < data.length; i++) {
    const rowCity = String(data[i][0]).trim().toUpperCase();
    const rowBrgy = String(data[i][1]).trim().toUpperCase();
    const rowWeekRaw = String(data[i][2]);
    const rowWeekNorm = rowWeekRaw.toLowerCase().replace(/\s+/g, '').replace(/[–—]/g, '-');
    
    if (rowCity === searchCity && rowBrgy === searchBrgy) {
      // We found the barangay! 
      
      // Default: If we haven't found a target yet, mark this row as the fallback target.
      // This means we will overwrite this row if we don't find a better (exact week) match later.
      if (targetRowIndex === -1) {
        targetRowIndex = i + 1; // 1-based index
      }

      // Check for Exact Week Match
      if (rowWeekNorm === searchWeekNorm) {
        targetRowIndex = i + 1;
        break; // Found the perfect match, stop searching
      }
    }
  }

  // If we found ANY row for this Barangay (Exact or Fallback), update it.
  if (targetRowIndex !== -1) {
    sheet.getRange(targetRowIndex, 3, 1, processedData.length).setValues([processedData]);
    if (timestampCol !== -1) {
        sheet.getRange(targetRowIndex, timestampCol).setValue(webTimestamp);
    }
    SpreadsheetApp.flush();
    return "Success (Updated)";
  }
  
  // If absolutely no record for this Barangay exists, append new row.
  const newRow = [city, brgy, ...processedData];
  if (timestampCol !== -1) {
    while (newRow.length < timestampCol - 1) newRow.push("");
    newRow[timestampCol - 1] = webTimestamp;
  }
  sheet.appendRow(newRow);
  SpreadsheetApp.flush();
  return "Success (New Week Created)";
}

// --- SPECIFIC REPORT WRAPPERS ---

function getFTJSData() { return getSheetData('FTJS'); }
function getICADIECData() { return getSheetData('ICAD-IEC'); }
function getASFBarangayData() { return getSheetData('ASF Barangay'); }
function getKasambahayData() { return getSheetData('Kasambahay'); }
function getBFDPData() { return getSheetData('BFDP'); }
function getSKFPDData() { return getSheetData('SKFPD'); }
function getVawVacData() { return getSheetData('VAW-VAC Incidents'); }
function getBarcoBrgyData() { return getSheetData('BARCO'); }
function getHAPAGData() { return getSheetData('HAPAG'); }
function getHAPAG2Data() { return getSheetData('HAPAG 2'); }
function getKalinisanBrgyData() { return getSheetData('Kalinisan Brgy'); }

// --- DEDICATED UPDATE FUNCTIONS ---

function updateFTJSRow(city, brgy, ...args) { return updateFTJSRowGeneric('FTJS', city, brgy, args); }
function updateICADIECRow(city, brgy, ...args) { return updateFTJSRowGeneric('ICAD-IEC', city, brgy, args); }
function updateASFBarangayRow(city, brgy, ...args) { return updateFTJSRowGeneric('ASF Barangay', city, brgy, args); }
function updateKasambahayRow(city, brgy, ...args) { return updateFTJSRowGeneric('Kasambahay', city, brgy, args); }
function updateBFDPRow(city, brgy, ...args) { return updateFTJSRowGeneric('BFDP', city, brgy, args); }
function updateSKFPDRow(city, brgy, ...args) { return updateFTJSRowGeneric('SKFPD', city, brgy, args); }
function updateVawVacRow(city, brgy, ...args) { return updateFTJSRowGeneric('VAW-VAC Incidents', city, brgy, args); }
function updateBarcoBrgyRow(city, brgy, ...args) { return updateFTJSRowGeneric('BARCO', city, brgy, args); }
function updateHAPAGRow(city, brgy, ...args) { return updateFTJSRowGeneric('HAPAG', city, brgy, args); }
function updateHAPAG2Row(city, brgy, ...args) { return updateFTJSRowGeneric('HAPAG 2', city, brgy, args); }
