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

  if (!existingTabs.includes(city)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: city } } }] },
    });
    // Add header row for new tab
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${city}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Partner Number', 'Group Name', 'Member Name', 'Member Number']] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${city}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
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
