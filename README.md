# Contact Consolidation Portal

This project is a Vite React app plus a small Express backend that can sync uploaded contact files to a Google Sheet.

## What it does
- Step 1: pick a city
- Step 2: upload an Excel / CSV file
- The backend will create city tabs and append a log row to the selected Google Sheet

## Setup
1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

3. Fill in `.env` with your Google service account values:
   ```env
   GOOGLE_CLIENT_EMAIL=your-service-account-email
   GOOGLE_PRIVATE_KEY=your-private-key
   PORT=3001
   ```

4. Share the target Google Sheet with the service account email.

## Run
- Start the backend:
  ```bash
  node server.js
  ```
- Start the frontend:
  ```bash
  npm run dev
  ```

Then open the app at `http://127.0.0.1:5173/`.

## Notes
- The app defaults to your provided spreadsheet link.
- The backend currently writes a log row to the selected city tab and creates missing tabs for all cities.
