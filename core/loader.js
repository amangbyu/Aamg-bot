const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

function loadCommands() {
    const commandsDir = path.join(__dirname, "../commands");
    const commands = {};

    if (!fs.existsSync(commandsDir)) fs.mkdirSync(commandsDir, { recursive: true });

    const files = fs.readdirSync(commandsDir).filter((f) => f.endsWith(".js"));

    for (const file of files) {
        try {
            const filePath = path.join(commandsDir, file);
            delete require.cache[require.resolve(filePath)];
            const cmd = require(filePath);
            if (!cmd.command || !cmd.run) {
                console.log(chalk.yellow(`[SKIP] ${file} tidak punya 'command' atau 'run'.`));
                continue;
            }
            commands[file] = cmd;
        } catch (e) {
            console.log(chalk.red(`[ERROR LOAD] ${file}: ${e.message}`));
        }
    }

    return commands;
}

module.exports = { loadCommands };
