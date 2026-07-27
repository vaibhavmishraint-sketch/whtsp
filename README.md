# Contact Consolidation Portal

This project is a Vite React frontend plus a small Express backend that helps sync uploaded contact files to a Google Sheet.

## What it does
- Step 1: pick a city
- Step 2: select an Excel / CSV file
- Step 3: upload and sync to Google Sheets

## Local setup (noob-friendly)

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

3. Open `.env` and fill these values:
   ```env
   GOOGLE_CLIENT_EMAIL=your-service-account-email
   GOOGLE_PRIVATE_KEY=your-private-key
   PORT=3001
   VITE_API_URL=http://127.0.0.1:3001
   ```

4. Share your Google Sheet with the service account email.
   - Open the Google Sheet
   - Click Share
   - Add the service account email from `GOOGLE_CLIENT_EMAIL`
   - Give it Editor access

5. Start the backend server:
   ```bash
   node server.js
   ```

6. Start the frontend app:
   ```bash
   npm run dev
   ```

7. Open the app in the browser:
   - `http://127.0.0.1:5173`

## Deploying the frontend on Netlify

1. Push your code to GitHub.
2. In Netlify site settings, point the repo to this project.
3. Set the build command to:
   ```bash
   npm run build
   ```
4. Set the publish directory to:
   ```bash
   dist
   ```
5. Add an environment variable in Netlify:
   - `VITE_API_URL` = `https://your-backend.example.com`

If you are only deploying the frontend, the backend must also be available online at the `VITE_API_URL` address.

## Deploying the backend

The backend is the Express server in `server.js`. It needs Google service account credentials to work properly.

### Option A: Run locally
- Use the `.env` file and run `node server.js`
- Frontend will call `http://127.0.0.1:3001`

### Option B: Deploy to a cloud provider
- Use Render, Vercel, Railway, or Heroku
- Set these environment variables there:
  - `GOOGLE_CLIENT_EMAIL`
  - `GOOGLE_PRIVATE_KEY`
  - `PORT=3001`
- Then set `VITE_API_URL` in Netlify to that deployed backend URL.

## Why you saw the warning
If the app says:

`Google Sheets credentials are not configured yet, so the app prepared a local sync simulation for Delhi.`

It means the frontend did connect to the backend, but the backend does not have credentials yet.

So the fix is:
1. Add `GOOGLE_CLIENT_EMAIL` and `GOOGLE_PRIVATE_KEY` to your backend environment.
2. Share the Google Sheet with the service account.
3. Restart the backend.

## Notes
- The frontend now uses `VITE_API_URL` to find the backend.
- If you deploy frontend on Netlify, make sure `VITE_API_URL` is set there.
- The backend must be accessible from the frontend when the app is live.
