const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require("@whiskeysockets/baileys");
const P = require("pino");
const { Boom } = require("@hapi/boom");
const chalk = require("chalk");
const { loadCommands } = require("./core/loader");
const { handler } = require("./core/handler");
const settings = require("./settings");

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const { version } = await fetchLatestBaileysVersion();

    global.commands = loadCommands();
    global.settings = settings;

    console.log(chalk.cyan.bold("\n╔══════════════════════════╗"));
    console.log(chalk.cyan.bold("║     AMG BOT - STARTED    ║"));
    console.log(chalk.cyan.bold("╚══════════════════════════╝\n"));
    console.log(chalk.green(`✅ ${Object.keys(global.commands).length} command(s) loaded.\n`));

    const sock = makeWASocket({
        version,
        logger: P({ level: "silent" }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, P({ level: "silent" })),
        },
        browser: ["Ubuntu", "Chrome", "20.0.04"],
        getMessage: async () => ({ conversation: "" }),
    });

    if (!sock.authState.creds.registered) {
        const phone = settings.ownerNumber;
        console.log(chalk.yellow(`[*] Meminta kode pairing untuk: ${phone}...`));
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(phone);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                console.log(chalk.bgRed.white.bold(` KODE PAIRING: `) + chalk.bgGreen.black.bold(` ${code} `) + "\n");
                console.log(chalk.white("Masukkan di WhatsApp: Perangkat Tertaut > Tautkan dengan Nomor.\n"));
            } catch (err) {
                console.log(chalk.red("[-] Gagal pairing: "), err.message);
            }
        }, 5000);
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === "close") {
            const shouldReconnect =
                lastDisconnect.error instanceof Boom
                    ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
                    : true;
            if (shouldReconnect) {
                console.log(chalk.yellow("[!] Koneksi terputus, reconnecting..."));
                startBot();
            } else {
                console.log(chalk.red("[x] Bot logout. Hapus folder auth_info lalu jalankan ulang."));
            }
        } else if (connection === "open") {
            console.log(chalk.green.bold("✅ BOT ONLINE & SIAP DIGUNAKAN!"));
        }
    });

    sock.ev.on("messages.upsert", async (m) => {
        if (m.type !== "notify") return;
        const msg = m.messages[0];
        if (!msg?.message) return;
        if (msg.key.remoteJid === "status@broadcast") return;
        await handler(sock, msg);
    });
}

startBot().catch((err) => console.error("Error fatal:", err));
