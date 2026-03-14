module.exports = {
    command: ["restart", "reboot"],
    tags: "owner",
    help: "Restart bot",
    owner: true,

    async run(sock, msg, { from }) {
        await sock.sendMessage(from, {
            text: "🔄 *Bot sedang restart...* Tunggu sebentar ya!"
        }, { quoted: msg });

        setTimeout(() => process.exit(), 1000);
    },
};
