import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const MASTER_SHEET_ID = process.env.MASTER_SHEET_ID || '1DdNS0dhicuLkC-VK6Q1vknvA5UirHLcQfH7lC3OM4VY';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(process.cwd(), 'dist'), { fallthrough: true, index: false }));

function getAuth() {
  const b64 = process.env.GOOGLE_CREDENTIALS_B64;
  if (!b64) throw new Error('GOOGLE_CREDENTIALS_B64 is not configured.');
  const creds = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
  return new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function syncToSheet({ city, fileName, rows }) {
  if (!rows || rows.length === 0) throw new Error('No contact rows to sync.');

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = MASTER_SHEET_ID;

  // Ensure city tab exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTabs = meta.data.sheets.map(s => s.properties.title);

  let sheetId;
  if (!existingTabs.includes(city)) {
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: city } } }] },
    });
    sheetId = addRes.data.replies[0].addSheet.properties.sheetId;
  } else {
    sheetId = meta.data.sheets.find(s => s.properties.title === city).properties.sheetId;
  }

  // Check if tab is empty (no data at all)
  const checkData = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${city}!A1` });
  const isEmpty = !checkData.data.values || checkData.data.values.length === 0;

  if (isEmpty) {
    // Write header row
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${city}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: [['Sr. No.', 'Potential Partner Number', 'Group Name', 'Member Name', 'Member Number']] },
    });

    // Bold the header row
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
            cell: { userEnteredFormat: { textFormat: { bold: true } } },
            fields: 'userEnteredFormat.textFormat.bold',
          },
        }],
      },
    });
  }

  // Get current row count to assign Sr. No. sequentially
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${city}!A:A`,
  });
  const existingCount = existing.data.values ? existing.data.values.length : 1;
  // existingCount includes header row, so data starts at existingCount
  const rowsWithSrNo = rows.map((row, i) => [existingCount + i, ...row]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${city}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: rowsWithSrNo },
  });

  return {
    ok: true,
    message: `${rows.length} contacts from ${fileName} synced to ${city} tab.`,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}

app.post('/api/sync-sheet', async (req, res) => {
  try {
    const result = await syncToSheet(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || 'Sync failed.' });
  }
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/', (_req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    return res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  }
  next();
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Server ready on http://0.0.0.0:${port}`);
});
