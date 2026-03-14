function patchMsg(sock, msg) {
    const from = msg.key.remoteJid;
    const settings = global.settings;

    msg.reply = (text) =>
        sock.sendMessage(from, { text: String(text) }, { quoted: msg });

    msg.adReply = (text, title = "", body = "", thumb = "", url = "") =>
        sock.sendMessage(from, {
            text: String(text),
            contextInfo: {
                externalAdReply: {
                    title: title || settings.botName,
                    body: body || "",
                    thumbnailUrl: thumb || settings.thumb,
                    sourceUrl: url || settings.channelLink,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    showAdAttribution: false,
                },
            },
        }, { quoted: msg });

    msg.react = (emoji) =>
        sock.sendMessage(from, { react: { text: emoji, key: msg.key } });

    msg.sendToChannel = (content, extra = {}) => {
        const channelId = settings.channelId;
        if (!channelId) throw new Error("channelId belum diset di settings.js");
        const payload = typeof content === "string" ? { text: content, ...extra } : { ...content, ...extra };
        return sock.sendMessage(channelId, payload);
    };

    msg.sendAudioToChannel = (audioUrl, ptt = true) => {
        const channelId = settings.channelId;
        if (!channelId) throw new Error("channelId belum diset di settings.js");
        return sock.sendMessage(channelId, {
            audio: { url: audioUrl },
            mimetype: "audio/mpeg",
            ptt,
        });
    };

    msg.sendRichToChannel = ({ text = "", title = "", body = "", thumb = "", sourceUrl = "", channelName = "", mentions = [] } = {}) => {
        const channelId = settings.channelId;
        if (!channelId) throw new Error("channelId belum diset di settings.js");
        return sock.sendMessage(channelId, {
            text,
            contextInfo: {
                mentionedJid: mentions,
                isForwarded: true,
                forwardingScore: 999,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: channelId,
                    newsletterName: channelName || settings.botName,
                    serverMessageId: -1,
                },
                externalAdReply: {
                    title: title || settings.botName,
                    body: body || "",
                    thumbnailUrl: thumb || settings.thumb,
                    sourceUrl: sourceUrl || settings.channelLink,
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    showAdAttribution: false,
                },
            },
        });
    };

    msg.downloadQuoted = async () => {
        const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) throw new Error("Tidak ada pesan yang dikutip.");
        const type = Object.keys(quoted)[0];
        const stream = await downloadContentFromMessage(quoted[type], type.replace("Message", ""));
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    };

    return msg;
}

module.exports = { patchMsg };
