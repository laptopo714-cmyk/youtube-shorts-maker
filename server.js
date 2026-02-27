const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const ffprobePath = require('ffprobe-static').path;
const ytDlp = require('yt-dlp-exec');
const archiver = require('archiver');
const cors = require('cors');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public', {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
    }
}));
app.use('/output', express.static('output'));

// Ensure directories exist
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUT_DIR = path.join(__dirname, 'output');
fs.ensureDirSync(UPLOADS_DIR);
fs.ensureDirSync(OUTPUT_DIR);

app.post('/api/process', async (req, res) => {
    const { url, minDur, maxDur, resolution } = req.body;

    if (!url || !minDur || !maxDur || !resolution) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    const sessionId = uuidv4();
    const sessionDir = path.join(OUTPUT_DIR, sessionId);
    fs.ensureDirSync(sessionDir);

    // The video stream will be processed entirely in-memory/direct-streaming

    try {
        console.log(`[PROCESS] New session: ${sessionId}`);
        console.log(`[PROCESS] URL: ${url}, Range: ${minDur}-${maxDur}, Resolution: ${resolution}`);

        console.log(`[DOWNLOAD] Fetching direct stream URL for session ${sessionId}...`);
        // Get video metadata and direct URL using yt-dlp
        const videoInfo = await ytDlp(url, {
            dumpJson: true,
            format: 'best[ext=mp4]/best',
            noCheckCertificates: true,
            noWarnings: true,
            preferFreeFormats: true,
            addHeader: [
                'referer:youtube.com',
                'user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            ]
        });

        const streamUrl = videoInfo.url;
        const totalDuration = videoInfo.duration;
        const width = videoInfo.width;
        const height = videoInfo.height;

        if (!streamUrl || !totalDuration) {
            throw new Error('Failed to retrieve valid stream URL or video metadata from YouTube.');
        }

        console.log(`[ANALYSIS] Direct stream retrieved successfully. Total Duration: ${totalDuration}s, Resolution: ${width}x${height}`);

        // We use the direct URL as the input for FFmpeg!
        const videoPath = streamUrl;

        let currentTime = 0;
        let clipIndex = 1;
        const clips = [];

        const min = parseInt(minDur);
        const max = parseInt(maxDur);

        while (currentTime < totalDuration) {
            let randomDuration = Math.floor(Math.random() * (max - min + 1)) + min;
            
            // If remaining time is less than minDur, just take the rest if it's significant, or stop
            if (currentTime + randomDuration > totalDuration) {
                randomDuration = totalDuration - currentTime;
            }

            if (randomDuration < 1) break; // Too short

            const outputFileName = `clip_${clipIndex}.mp4`;
            const outputPath = path.join(sessionDir, outputFileName);

            console.log(`Processing clip ${clipIndex}: ${currentTime}s to ${currentTime + randomDuration}s`);

            await new Promise((resolve, reject) => {
                let command = ffmpeg(videoPath)
                    .setStartTime(currentTime)
                    .setDuration(randomDuration);

                // Apply aspect ratio filters
                if (resolution === '9:16') {
                    // Vertical crop (Center)
                    const targetWidth = Math.floor(height * (9/16));
                    command = command.videoFilters([
                        `scale=-1:${height}`,
                        `crop=${targetWidth}:${height}:(iw-${targetWidth})/2:0`
                    ]);
                } else if (resolution === '1:1') {
                    // Square crop (Center)
                    command = command.videoFilters([
                        `scale=-1:${height}`,
                        `crop=${height}:${height}:(iw-${height})/2:0`
                    ]);
                } else if (resolution === 'custom') {
                    const customW = req.body.customWidth || 1080;
                    const customH = req.body.customHeight || 1920;
                    command = command.size(`${customW}x${customH}`).autopad();
                }

                command
                    .output(outputPath)
                    .on('start', (cmd) => console.log(`[FFMPEG] Spawned: ${cmd}`))
                    .on('progress', (progress) => {
                        if (progress.percent) console.log(`[FFMPEG] Progress: ${Math.round(progress.percent)}%`);
                    })
                    .on('end', () => {
                        console.log(`[FFMPEG] Finished clip ${clipIndex}`);
                        resolve();
                    })
                    .on('error', (err) => {
                        console.error(`[FFMPEG] Error processing clip ${clipIndex}:`, err);
                        reject(err);
                    })
                    .run();
            });

            clips.push({
                name: outputFileName,
                url: `/output/${sessionId}/${outputFileName}`,
                duration: randomDuration
            });

            currentTime += randomDuration;
            clipIndex++;

            // Safety break if it's taking too long or something is wrong
            if (clipIndex > 50) break; 
        }

        // Cleanup is no longer needed since we stream directly from YouTube
        // fs.remove(videoPath).catch(...) is removed
        console.log(`[PROCESS] Session ${sessionId} completed successfully!`);

        res.json({ sessionId, clips });

    } catch (error) {
        console.error('Processing error:', error);
        res.status(500).json({ 
            error: 'Failed to process video: ' + error.message,
            stack: error.stack
        });
    }
});

app.get('/api/download-all/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    const sessionDir = path.join(OUTPUT_DIR, sessionId);

    if (!fs.existsSync(sessionDir)) {
        return res.status(404).json({ error: 'Session not found' });
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment(`clips_${sessionId}.zip`);

    archive.pipe(res);
    archive.directory(sessionDir, false);
    archive.finalize();
});

// Periodic cleanup of files older than 5 minutes
setInterval(async () => {
    const now = Date.now();
    const threshold = 5 * 60 * 1000; // 5 minutes

    const dirs = await fs.readdir(OUTPUT_DIR);
    for (const dir of dirs) {
        const fullPath = path.join(OUTPUT_DIR, dir);
        const stats = await fs.stat(fullPath);
        if (now - stats.mtimeMs > threshold) {
            console.log(`Cleaning up old session: ${dir}`);
            await fs.remove(fullPath);
        }
    }

    const files = await fs.readdir(UPLOADS_DIR);
    for (const file of files) {
        const fullPath = path.join(UPLOADS_DIR, file);
        const stats = await fs.stat(fullPath);
        if (now - stats.mtimeMs > threshold) {
            console.log(`Cleaning up old upload: ${file}`);
            await fs.remove(fullPath);
        }
    }
}, 5 * 60 * 1000); // Run every 5 minutes

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
