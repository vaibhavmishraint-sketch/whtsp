const CITY_TABS = ['Bengaluru', 'Delhi', 'Mumbai', 'Hyderabad'];
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/17nk2W-eNJVKbGa4fEdEoSrHOOPHidrLZRMkIrCklXBY/edit?usp=sharing';

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheetUrl = payload.sheetUrl;
    const city = payload.city;
    const csvText = payload.csvText;

    if (!sheetUrl || !city || !csvText) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, message: 'Missing sheetUrl, city, or csvText.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, message: 'Invalid Google Sheet URL.' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.openById(spreadsheetId);
    ensureTabs(ss);
    const targetSheet = ss.getSheetByName(city) || ss.insertSheet(city);
    appendCsvToSheet(targetSheet, csvText);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true, message: `Success: synced ${city} data.` }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function extractSpreadsheetId(url) {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

function ensureTabs(ss) {
  const existing = ss.getSheets().map((sheet) => sheet.getName());
  CITY_TABS.forEach((tabName) => {
    if (!existing.includes(tabName)) {
      ss.insertSheet(tabName);
    }
  });
}

function appendCsvToSheet(sheet, csvText) {
  const rows = Utilities.parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error('CSV content is empty or invalid.');
  }

  const lastRow = sheet.getLastRow();
  const startRow = lastRow === 0 ? 1 : lastRow + 1;
  sheet.getRange(startRow, 1, rows.length, rows[0].length).setValues(rows);
}

function createTimeDrivenTrigger() {
  ScriptApp.getProjectTriggers().forEach((trigger) => {
    if (trigger.getHandlerFunction() === 'periodicSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('periodicSync')
    .timeBased()
    .everyHours(2)
    .create();
}

function periodicSync() {
  const sheetUrl = DEFAULT_SHEET_URL;
  if (!sheetUrl) {
    Logger.log('No DEFAULT_SHEET_URL configured for periodic sync.');
    return;
  }

  const spreadsheetId = extractSpreadsheetId(sheetUrl);
  if (!spreadsheetId) {
    Logger.log('Invalid DEFAULT_SHEET_URL.');
    return;
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  ensureTabs(ss);
  Logger.log('Periodic sync completed: ensured tabs exist.');
}
