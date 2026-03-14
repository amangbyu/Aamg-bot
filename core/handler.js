const chalk = require("chalk");
const { patchMsg } = require("./message");

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function handler(sock, msg) {
    try {
        const settings = global.settings;
        const from = msg.key.remoteJid;
        const isGroup = from.endsWith("@g.us");
        const senderJid = (isGroup ? msg.key.participant : msg.key.remoteJid) || msg.key.remoteJid;
        const senderNumber = senderJid.replace(/[^0-9]/g, "");
        const pushName = msg.pushName || senderNumber;
        const isOwner = settings.ownerList.includes(senderNumber) || msg.key.fromMe;

        const msgType = Object.keys(msg.message).find(
            k => !["senderKeyDistributionMessage", "messageContextInfo", "pollCreationMessageV3"].includes(k)
        );

        const body = (
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption ||
            msg.message?.buttonsResponseMessage?.selectedButtonId ||
            msg.message?.templateButtonReplyMessage?.selectedId ||
            ""
        ).trim().replace(/[\u200B-\u200D\uFEFF]/g, "");

        const tag = msg.key.fromMe
            ? chalk.red("[SELF]")
            : isGroup
            ? chalk.cyan("[GC]")
            : chalk.blue("[PM]");

        const typeLabel = chalk.gray(`[${msgType || "unknown"}]`);
        const bodyPreview = body ? `"${body.substring(0, 60)}"` : chalk.gray("(no text)");
        console.log(`${tag}${typeLabel} ${chalk.yellow(pushName)} ${chalk.gray(senderNumber)}: ${bodyPreview}`);

        if (!body) return;
        if (settings.self && !isOwner) return;

        const prefix = settings.prefix;

        patchMsg(sock, msg);
        await sock.readMessages([msg.key]);

        if (!body.startsWith(prefix)) return;

        const commandName = body.slice(prefix.length).trim().split(/\s+/)[0].toLowerCase();
        const args = body.trim().split(/\s+/).slice(1);
        const text = args.join(" ");

        console.log(chalk.white(`[CMD] `) + chalk.yellow(pushName) + chalk.white(` → ${prefix}${commandName}`) + (text ? chalk.gray(` | args: "${text}"`) : ""));

        let found = null;
        for (const name in global.commands) {
            const cmd = global.commands[name];
            const aliases = Array.isArray(cmd.command) ? cmd.command : [cmd.command];
            if (aliases.includes(commandName)) { found = cmd; break; }
        }

        if (!found) {
            console.log(chalk.gray(`[SKIP] "${prefix}${commandName}" tidak terdaftar.`));
            return;
        }

        if (found.owner && !isOwner) {
            console.log(chalk.red(`[DENY] ${senderNumber} bukan owner, ditolak.`));
            await sock.sendMessage(from, { text: "❌ Command ini hanya untuk owner!" }, { quoted: msg });
            return;
        }

        if (!isOwner) {
            const now = Date.now();
            if (!global._spam) global._spam = {};
            if (global._spam[senderJid] && now - global._spam[senderJid] < 2000) {
                console.log(chalk.yellow(`[SPAM] ${senderNumber} kena cooldown.`));
                await sock.sendMessage(from, { text: "⚠️ Jangan spam! Tunggu 2 detik." }, { quoted: msg });
                return;
            }
            global._spam[senderJid] = now;
        }

        await sock.sendPresenceUpdate("composing", from);
        await delay(400);

        const ctx = { from, args, text, body, prefix, pushName, senderJid, senderNumber, isOwner, isGroup, msg };

        console.log(chalk.magenta(`[EXEC]`) + ` ${commandName}.js`);
        const start = Date.now();
        await found.run(sock, msg, ctx);
        console.log(chalk.green(`[DONE]`) + ` ${commandName}.js selesai dalam ${Date.now() - start}ms`);

    } catch (e) {
        console.error(chalk.red("[ERROR HANDLER]"), e.message);
        console.error(e.stack);
    }
}

module.exports = { handler };
