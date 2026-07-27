import { useState } from 'react';

const cityTabs = ['Bengaluru', 'Delhi', 'Mumbai', 'Hyderabad'];
const apiBaseUrl = import.meta.env.VITE_API_URL ||
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:3001'
    : '/api');
const appScriptUrl = import.meta.env.VITE_APP_SCRIPT_URL;
const syncUrl = appScriptUrl ? appScriptUrl : `${apiBaseUrl}/api/sync-sheet`;

function UploadPage({ city, onBack }) {
  const [sheetUrl, setSheetUrl] = useState(
    'https://docs.google.com/spreadsheets/d/17nk2W-eNJVKbGa4fEdEoSrHOOPHidrLZRMkIrCklXBY/edit?usp=sharing'
  );
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusTone, setStatusTone] = useState('success');

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    setFileName(selectedFile ? selectedFile.name : '');
  };

  const handleUpload = async () => {
    if (!sheetUrl || !fileName) {
      setStatusTone('error');
      setStatus('Please provide a Google Sheet URL and a file to upload.');
      return;
    }

    setIsProcessing(true);
    setStatusTone('processing');
    setStatus(`Preparing the sheet and syncing ${city}...`);

    try {
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, sheetUrl, fileName }),
      });

      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'Sync failed.');
      }

      setStatusTone('success');
      setStatus(data.message || `Sync complete for ${city}.`);
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
      <p className="eyebrow">Upload contacts</p>
      <h1 className="selected-city-title">{city}</h1>
      <p className="subtext">
        Choose your Excel or CSV file for {city} and continue with upload.
      </p>

      <label className="field-label" htmlFor="file-upload">
        Upload Excel / CSV
      </label>
      <input
        id="file-upload"
        className="input"
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFileChange}
      />

      {fileName ? <p className="file-name">Selected file: {fileName}</p> : null}

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
