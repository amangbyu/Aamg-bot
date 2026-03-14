const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

ffmpeg.setFfmpegPath(ffmpegStatic);

async function ffmpegConvert(buffer, ffArgs = [], inExt = 'mp3', outExt = 'mp4') {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-'));
    const inPath = path.join(tmp, `input.${inExt}`);
    const outPath = path.join(tmp, `output.${outExt}`);
    fs.writeFileSync(inPath, buffer);

    await new Promise((resolve, reject) => {
        const cmd = ffmpeg(inPath);
        if (ffArgs && ffArgs.length) cmd.outputOptions(ffArgs);
        cmd.output(outPath).on('error', reject).on('end', resolve).run();
    });

    const out = fs.readFileSync(outPath);
    try { fs.unlinkSync(inPath); } catch {}
    try { fs.unlinkSync(outPath); } catch {}
    try { fs.rmdirSync(tmp); } catch {}
    return out;
}

function ffmpegSpawn(buffer, args = [], inExt = 'bin', outExt = 'out') {
    return new Promise(async (resolve, reject) => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-'));
        const inPath = path.join(tmp, `input.${inExt}`);
        const outPath = path.join(tmp, `output.${outExt}`);
        try {
            await fs.promises.writeFile(inPath, buffer);
            const ff = spawn(ffmpegStatic || 'ffmpeg', ['-y', '-i', inPath, ...args, outPath]);
            ff.on('error', reject);
            ff.on('close', async (code) => {
                try {
                    if (code !== 0) return reject(new Error(`ffmpeg exited with code ${code}`));
                    const data = await fs.promises.readFile(outPath);
                    await fs.promises.unlink(inPath).catch(() => {});
                    await fs.promises.unlink(outPath).catch(() => {});
                    try { fs.rmdirSync(tmp); } catch {}
                    resolve(data);
                } catch (e) { reject(e); }
            });
        } catch (e) { reject(e); }
    });
}

function toPTT(buffer, inExt = 'ogg') {
    return ffmpegSpawn(buffer, [
        '-vn',
        '-acodec', 'libopus',
        '-b:a', '64k',
        '-ar', '48000',
        '-ac', '1',
        '-application', 'voip',
        '-map_metadata', '-1',
        '-f', 'ogg'
    ], inExt, 'ogg');
}

function toAudio(buffer, inExt = 'wav') {
    return ffmpegSpawn(buffer, [
        '-vn',
        '-c:a', 'libmp3lame',
        '-q:a', '4',
        '-map_metadata', '-1'
    ], inExt, 'mp3');
}

function toVideo(buffer, inExt = 'mp4') {
    return ffmpegSpawn(buffer, [
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-c:v', 'libx264',
        '-profile:v', 'baseline',
        '-level', '3.0',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        '-c:a', 'aac',
        '-ab', '128k',
        '-ar', '44100',
        '-crf', '28',
        '-preset', 'veryfast',
        '-movflags', '+faststart'
    ], inExt, 'mp4');
}

function urlToMp4(inputUrl) {
    return new Promise((resolve, reject) => {
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'conv-'));
        const outPath = path.join(tmp, 'output.mp4');
        const args = [
            '-y',
            '-i', inputUrl,
            '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
            '-c:v', 'libx264',
            '-profile:v', 'baseline',
            '-level', '3.0',
            '-pix_fmt', 'yuv420p',
            '-r', '30',
            '-c:a', 'aac',
            '-ab', '128k',
            '-ar', '44100',
            '-crf', '28',
            '-preset', 'veryfast',
            '-movflags', '+faststart',
            outPath
        ];
        const ff = spawn(ffmpegStatic || 'ffmpeg', args);
        ff.on('error', reject);
        ff.on('close', async (code) => {
            try {
                if (code !== 0) return reject(new Error(`ffmpeg exited with code ${code}`));
                const data = await fs.promises.readFile(outPath);
                await fs.promises.unlink(outPath).catch(() => {});
                try { fs.rmdirSync(tmp); } catch {}
                resolve(data);
            } catch (e) { reject(e); }
        });
    });
}

module.exports = { ffmpegConvert, ffmpegSpawn, toPTT, toAudio, toVideo, urlToMp4 };
