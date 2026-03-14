const { loadCommands } = require("../core/loader");

module.exports = {
    command: ["reload"],
    tags: "owner",
    help: "Reload semua command tanpa restart",
    owner: true,

    async run(sock, msg, { from }) {
        global.commands = loadCommands();
        await sock.sendMessage(from, {
            text: `✅ Berhasil reload *${Object.keys(global.commands).length} command(s)*!`
        }, { quoted: msg });
    },
};
