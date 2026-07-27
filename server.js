import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { google } from 'googleapis';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const SHARE_WITH_EMAIL = process.env.SHARE_WITH_EMAIL || '';

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(process.cwd(), 'dist'), { fallthrough: true, index: false }));

function getAuth() {
  const email = process.env.GOOGLE_CLIENT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Google credentials not configured.');
  return new google.auth.JWT({
    email,
    key,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
}

async function getOrCreateSheet(auth, city) {
  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  const sheetName = `WHATSAPP_DATA_${city.toUpperCase()}`;

  // Check if sheet already exists
  const list = await drive.files.list({
    q: `name='${sheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: 'files(id, name)',
  });

  if (list.data.files.length > 0) {
    return list.data.files[0].id;
  }

  // Create new sheet
  const newSheet = await sheets.spreadsheets.create({
    requestBody: { properties: { title: sheetName } },
  });
  const spreadsheetId = newSheet.data.spreadsheetId;

  // Share with user email if configured
  if (SHARE_WITH_EMAIL) {
    await drive.permissions.create({
      fileId: spreadsheetId,
      requestBody: { role: 'writer', type: 'user', emailAddress: SHARE_WITH_EMAIL },
      sendNotificationEmail: false,
    });
  }

  // Add header row
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['Partner Number', 'Group Name', 'Member Name', 'Member Number']] },
  });

  return spreadsheetId;
}

async function syncToSheet({ city, fileName, rows }) {
  if (!rows || rows.length === 0) throw new Error('No contact rows to sync.');

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = await getOrCreateSheet(auth, city);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Sheet1!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  return {
    ok: true,
    message: `${rows.length} contacts from ${fileName} synced for ${city}.`,
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
