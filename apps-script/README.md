# Google Apps Script sync for contact upload

This folder contains a Google Apps Script web app that accepts CSV text and writes data to a Google Sheet.

## How it works
- The script receives a POST request with `sheetUrl`, `city`, and `csvText`
- It creates tabs for Bengaluru, Delhi, Mumbai, and Hyderabad if they do not exist
- It appends the CSV rows into the selected city tab

## Deploying the App Script
1. Open Google Drive
2. Click `New` → `More` → `Google Apps Script`
3. Replace the default code with the contents of `Code.gs`
4. Save the script
5. Click `Deploy` → `New deployment`
6. Choose `Web app`
7. Set:
   - `Execute as`: Me
   - `Who has access`: Anyone
8. Click `Deploy`
9. Copy the Web App URL

## Request format
Send a POST request with JSON body:

```json
{
  "sheetUrl": "https://docs.google.com/spreadsheets/d/yourSheetId/edit",
  "city": "Bengaluru",
  "csvText": "name,phone\nJohn,12345"
}
```

## Notes
- This version supports CSV only.
- Excel/XLSX uploads are not handled by Apps Script directly.
- For Excel support, use a server-side conversion step before sending CSV text.
