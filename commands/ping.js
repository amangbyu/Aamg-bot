const os = require("os");

module.exports = {
    command: ["ping", "p", "status"],
    tags: "info",
    help: "Cek kecepatan dan status bot",

    async run(sock, msg, { from }) {
        const start = Date.now();
        const used = process.memoryUsage().heapUsed / 1024 / 1024;
        const totalMem = os.totalmem() / 1024 / 1024 / 1024;
        const ping = Date.now() - start;

        const text = `🏓 *PONG!*

🚀 *Speed:* ${ping}ms
💻 *RAM Terpakai:* ${used.toFixed(1)} MB
🖥️ *Total RAM:* ${totalMem.toFixed(2)} GB
⏱️ *Uptime:* ${(os.uptime() / 3600).toFixed(2)} Jam
📡 *Platform:* ${os.platform()}`;

        await sock.sendMessage(from, { text }, { quoted: msg });
    },
};
