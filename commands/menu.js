module.exports = {
    command: ["menu", "help", "?"],
    tags: "info",
    help: "Tampilkan daftar command",

    async run(sock, msg, { from, prefix }) {
        const commands = global.commands;
        const settings = global.settings;


        const grouped = {};
        for (const name in commands) {
            const cmd = commands[name];
            const tag = cmd.tags || "lainnya";
            if (!grouped[tag]) grouped[tag] = [];
            const aliases = Array.isArray(cmd.command) ? cmd.command : [cmd.command];
            grouped[tag].push({ alias: aliases[0], help: cmd.help || "" });
        }

        let text = `╔══════════════════════╗\n`;
        text += `║  🤖 *${settings.botName}*  ║\n`;
        text += `╚══════════════════════╝\n\n`;
        text += `Prefix: *${prefix}*\n\n`;

        for (const tag in grouped) {
            text += `📂 *${tag.toUpperCase()}*\n`;
            for (const cmd of grouped[tag]) {
                text += `  ├ ${prefix}${cmd.alias}${cmd.help ? ` - ${cmd.help}` : ""}\n`;
            }
            text += "\n";
        }

        text += `_Total: ${Object.keys(commands).length} command(s)_`;

        await sock.sendMessage(from, { text }, { quoted: msg });
    },
};
