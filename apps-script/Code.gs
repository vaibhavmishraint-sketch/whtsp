const CITY_TABS = ['Bengaluru', 'Delhi', 'Mumbai', 'Hyderabad'];
const HEADER_ROW = ['Partner Number', 'Group Name', 'Member Name', 'Member Number'];

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheetUrl = payload.sheetUrl;
    const city = payload.city;
    const fileName = payload.fileName;
    const rows = payload.rows; // Array of [partnerNumber, groupName, memberName, memberNumber]

    if (!sheetUrl || !city || !rows || rows.length === 0) {
      return jsonResponse({ ok: false, message: 'Missing sheetUrl, city, or rows.' });
    }

    const spreadsheetId = extractSpreadsheetId(sheetUrl);
    if (!spreadsheetId) {
      return jsonResponse({ ok: false, message: 'Invalid Google Sheet URL.' });
    }

    const ss = SpreadsheetApp.openById(spreadsheetId);
    ensureTabs(ss);
    const targetSheet = ss.getSheetByName(city) || ss.insertSheet(city);

    // Add header if sheet is empty
    if (targetSheet.getLastRow() === 0) {
      targetSheet.appendRow(HEADER_ROW);
    }

    // Append all rows
    rows.forEach((row) => targetSheet.appendRow(row));

    return jsonResponse({ ok: true, message: `${rows.length} contacts from ${fileName} synced to ${city} tab.` });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
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
