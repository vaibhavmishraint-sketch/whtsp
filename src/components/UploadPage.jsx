import { useState } from 'react';
import * as XLSX from 'xlsx';

const apiBaseUrl = import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3001'
    : '/api');
const appScriptUrl = import.meta.env.VITE_APP_SCRIPT_URL;
const syncUrl = appScriptUrl ? appScriptUrl : `${apiBaseUrl}/sync-sheet`;

function parseExcelToRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const rows = [];
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

          // Find header row index
          const headerIdx = rawRows.findIndex(
            (r) => r.some((cell) => String(cell).toLowerCase().includes('member id') || String(cell).toLowerCase().includes('group name'))
          );
          if (headerIdx === -1) return;

          const headers = rawRows[headerIdx].map((h) => String(h).trim().toLowerCase());
          const groupNameIdx = headers.findIndex((h) => h.includes('group name'));
          const memberIdIdx = headers.findIndex((h) => h.includes('member id'));
          const remarkIdx = headers.findIndex((h) => h.includes('remark'));
          const roleIdx = headers.findIndex((h) => h.includes('role'));

          for (let i = headerIdx + 1; i < rawRows.length; i++) {
            const row = rawRows[i];
            if (!row || row.every((c) => c === '')) continue;

            const rawMemberId = String(row[memberIdIdx] ?? '').trim();
            const memberNumber = rawMemberId.replace('@c.us', '');
            const groupName = String(row[groupNameIdx] ?? sheetName).trim();
            const memberName = String(row[remarkIdx] ?? '').trim();

            if (!rawMemberId) continue;

            // Group Name | Member Name | Member Number
            rows.push([groupName, memberName, memberNumber]);
          }
        });

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

function UploadPage({ city, onBack }) {
  const [sheetUrl] = useState(
    'https://docs.google.com/spreadsheets/d/1DdNS0dhicuLkC-VK6Q1vknvA5UirHLcQfH7lC3OM4VY/edit?usp=sharing'
  );
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusTone, setStatusTone] = useState('success');

  const handleFileChange = (event) => {
    setFile(event.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (!sheetUrl || !file) {
      setStatusTone('error');
      setStatus('Please provide a Google Sheet URL and a file to upload.');
      return;
    }

    setIsProcessing(true);
    setStatusTone('processing');
    setStatus(`Reading file and parsing groups for ${city}...`);

    try {
      const rows = await parseExcelToRows(file);
      if (rows.length === 0) {
        throw new Error('No valid contact rows found in the file. Make sure the sheet has Member ID, Group Name, Nickname, Country Code columns.');
      }

      setStatus(`Parsed ${rows.length} contacts from ${file.name}. Syncing to sheet...`);

      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, fileName: file.name, rows }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Sync failed.');
      }

      setStatusTone('success');
      setStatus(data.message || `Sync complete for ${city}. ${rows.length} contacts added.`);
    } catch (error) {
      console.error(error);
      setStatusTone('error');
      const message = error.message || 'Something went wrong while syncing. Please try again.';
      setStatus(
        message.includes('Failed to fetch')
          ? `Sync endpoint is not reachable. Start the backend, configure VITE_API_URL, or set VITE_APP_SCRIPT_URL if using Apps Script.`
          : message
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="card">
      <h1 className="selected-city-title">{city}</h1>
      <p className="subtext">
        Choose your Excel or CSV file for {city}. All groups in the file will be synced to the master sheet.
      </p>

      <a
        href="https://docs.google.com/spreadsheets/d/1DdNS0dhicuLkC-VK6Q1vknvA5UirHLcQfH7lC3OM4VY/edit?usp=sharing"
        target="_blank"
        rel="noreferrer"
        className="sheet-link"
      >
        View Master Sheet →
      </a>

      <label className="field-label" htmlFor="file-upload" style={{ marginTop: '16px' }}>
        Upload Excel / CSV
      </label>
      <input
        id="file-upload"
        className="input"
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
      />

      {file ? <p className="file-name">Selected file: {file.name}</p> : null}

      <div className="button-row">
        <button className="secondary-btn" onClick={onBack}>
          Back
        </button>
        <button className="primary-btn" onClick={handleUpload} disabled={isProcessing}>
          {isProcessing ? 'Processing...' : 'Upload & Sync'}
        </button>
      </div>

      {status ? <div className={`status ${statusTone}`}>{status}</div> : null}
    </section>
  );
}

export default UploadPage;
