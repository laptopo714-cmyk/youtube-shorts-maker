# ClipSplitter AI - YouTube Video Splitter & Shorts Creator

A powerful web application to automatically split YouTube videos into randomized clips, optimized for Shorts, TikTok, and Instagram Reels.

## Features
- **YouTube Downloader**: Seamlessly downloads videos from YouTube links.
- **Randomized Splitting**: Splits videos into segments based on a custom duration range (e.g., 15-60 seconds).
- **Pro Resolution Presets**:
  - Vertical (9:16) - Center Cropped.
  - Square (1:1) - Center Cropped.
  - Original Resolution.
- **Bulk Export**: Download all generated clips in a single ZIP file.
- **Modern UI**: Dark-themed, premium interface with real-time feedback.

## Tech Stack
- **Backend**: Node.js, Express.js.
- **Processing**: FFmpeg (via `fluent-ffmpeg` and `ffmpeg-static`).
- **YouTube Engine**: `yt-dlp`.
- **Frontend**: HTML5, CSS3 (Tailwind CSS), Vanilla JavaScript.

## Setup Instructions

1. **Prerequisites**:
   - [Node.js](https://nodejs.org/) installed on your system.
   - The application uses `ffmpeg-static`, so no manual FFmpeg installation is required!

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Run the Application**:
   ```bash
   npm start
   ```

4. **Access the App**:
   Open your browser and navigate to `http://localhost:3000`.

## How to Use
1. Paste a YouTube URL into the input field.
2. Define the Minimum and Maximum duration for your clips.
3. Select your desired output format (Vertical is recommended for Shorts).
4. Click **Process Video**.
5. Once processing is complete, preview your clips and download them individually or as a ZIP.

## Important Note
Processing time depends on the length of the source video and your system's performance. The application automatically crops the center of the video for Vertical and Square formats.
