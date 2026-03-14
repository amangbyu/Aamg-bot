const search = require("yt-search");
const fetch = require("node-fetch");
const { toPTT } = require("../core/converter");

module.exports = {
    command: ["playch", "musikch"],
    tags: "musik",
    help: "Cari & kirim lagu ke channel WA. Contoh: @playch Judul Lagu",
    owner: true,

    async run(sock, msg, ctx) {
        const { from, text, senderJid, pushName } = ctx;
        const settings = global.settings;
        const channelId = settings.channelId;

        let ppUrl = settings.thumb;
        try {
            ppUrl = await sock.profilePictureUrl(senderJid, "image");
        } catch {}

        const replyInfo = (title, body) =>
            sock.sendMessage(from, {
                text: body,
                contextInfo: {
                    externalAdReply: {
                        title,
                        body: settings.botName,
                        thumbnailUrl: ppUrl,
                        mediaType: 1,
                        renderLargerThumbnail: false,
                        showAdAttribution: false,
                    },
                },
            }, { quoted: msg });

        if (!text) {
            return replyInfo(
                "⚠️ Judul Kosong",
                `Masukkan judul atau link YouTube.\nContoh: *@playch Judul Lagu*`
            );
        }

        await sock.sendMessage(from, { react: { text: "🎵", key: msg.key } });

        try {
            const result = await search(text);
            const video = result.videos[0];

            if (!video) throw new Error("Video tidak ditemukan.");
            if (video.seconds >= 18000) throw new Error("Durasi terlalu panjang (maks 5 jam).");

            let mp3Url = null;
            let apiSource = "";
            const encodedUrl = encodeURIComponent(video.url);

            try {
                const res = await fetch(
                    `https://api.botcahx.eu.org/api/dowloader/yt?url=${encodedUrl}&apikey=${settings.apiKey}`
                );
                const data = await res.json();
                if (!data?.result?.mp3) throw new Error(`Response: ${JSON.stringify(data)}`);
                mp3Url = data.result.mp3;
                apiSource = "BotcahX";
            } catch (e1) {
                try {
                    const res2 = await fetch(`${settings.apiUrl}/api/ytmp3?url=${encodedUrl}`);
                    const data2 = await res2.json();
                    if (!data2?.data?.result?.audio_download) throw new Error(`Response: ${JSON.stringify(data2)}`);
                    mp3Url = data2.data.result.audio_download;
                    apiSource = "Fallback";
                } catch (e2) {
                    throw new Error(`Semua API gagal.\nAPI1: ${e1.message}\nAPI2: ${e2.message}`);
                }
            }

            const audioRes = await fetch(mp3Url);
            if (!audioRes.ok) throw new Error(`Gagal download audio: HTTP ${audioRes.status}`);
            const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
            const pttBuffer = await toPTT(audioBuffer, "mp3");

            const waktu = new Intl.DateTimeFormat("id-ID", {
                timeZone: "Asia/Jakarta",
                hour: "2-digit",
                minute: "2-digit",
                day: "2-digit",
                month: "long",
                year: "numeric",
            }).format(new Date()) + " WIB";

            await sock.sendMessage(channelId, {
                text:
                    `🎧 *${video.title}*\n` +
                    `⏱️ Durasi: ${video.timestamp}\n` +
                    `🧑‍🎤 ${video.author.name}\n` +
                    `🔗 ${video.url}`,
                contextInfo: {
                    mentionedJid: [senderJid],
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: channelId,
                        newsletterName: `Request by: ${pushName}`,
                        serverMessageId: -1,
                    },
                    externalAdReply: {
                        title: "🎶 Music Request",
                        body: video.title,
                        thumbnailUrl: video.image || ppUrl,
                        sourceUrl: video.url,
                        mediaType: 1,
                        renderLargerThumbnail: false,
                        showAdAttribution: false,
                    },
                },
            });

            await sock.sendMessage(channelId, {
                audio: pttBuffer,
                mimetype: "audio/ogg; codecs=opus",
                ptt: true,
            });

            const caption =
                `✅ *Lagu berhasil dikirim ke channel!*\n\n` +
                `👤 Request dari @${senderJid.split("@")[0]}\n\n` +
                `🎧 *Judul :* ${video.title}\n` +
                `⏱️ *Durasi :* ${video.timestamp}\n` +
                `👁️ *Views :* ${Number(video.views).toLocaleString("id-ID")}\n` +
                `📤 *Upload :* ${video.ago}\n` +
                `🧑‍🎤 *Artis :* ${video.author.name}\n` +
                `🌐 *API :* ${apiSource}\n` +
                `🔗 *Link :* ${video.url}`;

            await sock.sendMessage(from, {
                text: caption,
                contextInfo: {
                    mentionedJid: [senderJid],
                    isForwarded: true,
                    forwardingScore: 999,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: channelId,
                        newsletterName: "Pesan terkirim ke channel",
                        serverMessageId: -1,
                    },
                    externalAdReply: {
                        title: `Dikirim oleh: ${pushName}`,
                        body: waktu,
                        thumbnailUrl: ppUrl,
                        sourceUrl: settings.channelLink,
                        mediaType: 1,
                        renderLargerThumbnail: false,
                        showAdAttribution: false,
                    },
                },
            }, { quoted: msg });

            await sock.sendMessage(from, { react: { text: "✅", key: msg.key } });

        } catch (err) {
            await sock.sendMessage(from, { react: { text: "❌", key: msg.key } });
            return replyInfo(
                "❌ Gagal Memproses",
                `Terjadi kesalahan:\n\`\`\`${err.message || err}\`\`\``
            );
        }
    },
};
