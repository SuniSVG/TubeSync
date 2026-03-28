# TubeSync Pro Backend Setup

This folder contains the backend logic needed to power the YouTube automation flow.

## 1. Supabase Setup (PostgreSQL)

The `database/supabase_schema.sql` file contains all the necessary SQL commands to set up your Supabase project.

### What it does:
1. **Tables**:
   - `profiles`: Stores user subscription tiers and quota limits.
   - `youtube_channels`: Stores connected YouTube channels and OAuth tokens.
   - `videos`: Stores video metadata (Title, Tags, Schedule) and the Google Drive File ID.
2. **Row Level Security (RLS)**: Ensures users can only see and manage their own data.
3. **Triggers & Functions**:
   - Auto-creates a profile when a user signs up.
   - Auto-updates `updated_at` timestamps.
   - **Quota Management**: Before a video is inserted, it checks if the user has exceeded their monthly quota (`quota_used >= quota_limit`). If so, it blocks the upload. Otherwise, it increments `quota_used`.

### How to use:
1. Go to your Supabase Dashboard -> SQL Editor.
2. Create a new query.
3. Copy and paste the contents of `database/supabase_schema.sql`.
4. Click "Run".

---

## 2. Google Apps Script (GAS) Setup

The `google-apps-script/upload_to_drive.gs` file is a lightweight webhook that receives video files from your Next.js frontend and saves them directly to your Google Drive.

### Why use GAS?
Instead of setting up a complex GCP Service Account and handling Google Drive API authentication on your Next.js server (which can timeout on large uploads), you can deploy a GAS Web App. The Next.js frontend simply sends a POST request with the file data to the GAS URL, and GAS handles saving it to Drive.

### How to use:
1. Go to [script.google.com](https://script.google.com/).
2. Click "New Project".
3. Name it "TubeSync Pro Uploader".
4. Copy and paste the code from `google-apps-script/upload_to_drive.gs` into `Code.gs`.
5. Replace `YOUR_GOOGLE_DRIVE_FOLDER_ID` with the ID of the folder where you want to store the videos. (You can find the ID in the URL when viewing the folder in Google Drive).
6. Click **Deploy** -> **New deployment**.
7. Select type: **Web app**.
8. Execute as: **Me** (your Google account).
9. Who has access: **Anyone**.
10. Click Deploy and authorize the script.
11. **Copy the Web App URL**. You will use this URL in your Next.js frontend to send the video files.

### Note on File Sizes:
Google Apps Script has a payload limit (around 50MB) when receiving data via `doPost`. If your users are uploading very large video files (e.g., 1GB+), you will need to implement a **Resumable Upload** directly from the Next.js client to the Google Drive API using OAuth, rather than passing the file through GAS. However, for smaller files or MVP testing, this GAS approach is the fastest way to get started.
