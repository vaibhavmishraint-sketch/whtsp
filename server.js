import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const APP_SCRIPT_URL = process.env.APP_SCRIPT_URL;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(process.cwd(), 'dist'), { fallthrough: true, index: false }));

async function syncViaAppScript({ city, sheetUrl, fileName, rows }) {
  if (!rows || rows.length === 0) {
    throw new Error('No contact rows to sync.');
  }

  if (!APP_SCRIPT_URL) {
    throw new Error('APP_SCRIPT_URL is not configured on the server.');
  }

  const response = await fetch(APP_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city, sheetUrl, fileName, rows }),
    redirect: 'follow',
  });

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Apps Script returned unexpected response: ${text.slice(0, 200)}`);
  }
}

app.post('/api/sync-sheet', async (req, res) => {
  try {
    const result = await syncViaAppScript(req.body);
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
