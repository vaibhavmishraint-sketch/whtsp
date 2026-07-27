import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const cityTabs = ['Bengaluru', 'Delhi', 'Mumbai', 'Hyderabad'];

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'dist'), { fallthrough: true, index: false }));

function extractSheetId(sheetUrl) {
  if (!sheetUrl) return null;
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || null;
}

function sanitizeTabName(name) {
  return name.replace(/[^a-zA-Z0-9 ]/g, '').trim().slice(0, 30) || 'Sheet1';
}

async function syncToGoogleSheet({ city, sheetUrl, fileName }) {
  const spreadsheetId = extractSheetId(sheetUrl);
  if (!spreadsheetId) {
    throw new Error('A valid Google Sheets URL is required.');
  }

  const serviceAccountEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!serviceAccountEmail || !privateKey) {
    return {
      ok: true,
      mode: 'mock',
      message: `Google Sheets credentials are not configured yet, so the app prepared a local sync simulation for ${city}.`,
      spreadsheetId,
    };
  }

  const auth = new google.auth.JWT({
    email: serviceAccountEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const sheetMetadata = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = (sheetMetadata.data.sheets || []).map((sheet) => sheet.properties?.title);

  const requests = [];
  for (const tabName of cityTabs) {
    const title = sanitizeTabName(tabName);
    if (!existingTitles.includes(title)) {
      requests.push({ addSheet: { properties: { title } } });
    }
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });
  }

  const tabName = sanitizeTabName(city);
  const row = [
    new Date().toISOString(),
    city,
    fileName || 'No file selected',
    sheetUrl,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tabName}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });

  return {
    ok: true,
    mode: 'live',
    message: `Data for ${city} was synced to the connected Google Sheet in the ${tabName} tab.`,
    spreadsheetId,
  };
}

app.post('/api/sync-sheet', async (req, res) => {
  try {
    const result = await syncToGoogleSheet(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, message: error.message || 'Sync failed.' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

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
