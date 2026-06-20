// dotenv で環境変数を読み込む
require('dotenv').config();

// 必要なモジュールを読み込む
const Discord = require('discord.js');
const OpenAI = require('openai');
const FS = require('fs').promises;
const PATH = require('path');

const messageCreateHandler = require('../handlers/messageCreate');

const logger = require('../utils/logger');
const messenger = require('../utils/messenger');

// ログファイルのバックアップと新規作成
(async () => {
    try {
        await logger.logRotate();
    } catch (error) {
        console.error('ログファイルのバックアップと新規作成に失敗しました', error);
    }
})();

// Discord クライアントを作成
const DISCORD = new Discord.Client({
    intents: [
        Discord.GatewayIntentBits.Guilds,
        Discord.GatewayIntentBits.GuildMessages,
        Discord.GatewayIntentBits.MessageContent
    ]
});

// OpenAI API クライアントを作成
const OPENAI = new OpenAI({
    organization: process.env.OPENAI_ORG_ID,
    apiKey: process.env.OPENAI_API_KEY
});

const commands = {};

// Bot が起動したときの処理
DISCORD.once('ready', async () => {
    // コマンドを読み込む
    await loadCommands();

    // コマンドを登録
    const data = [];
    for (const commandName in commands) {
        data.push(commands[commandName].data);
    }
    await DISCORD.application.commands.set(data);

    await logger.logToFile(`${DISCORD.user.tag} でログインしました`);
});

// インタラクションがあったときの処理
DISCORD.on('interactionCreate', async (interaction) => {
    // コマンド以外のインタラクションは無視
    if (!interaction.isCommand()) return;

    // コマンドを取得
    const command = commands[interaction.commandName];

    try {
        // ユーザ情報をログファイルに書き込む
        await logger.commandToFile(interaction);
        await command.execute(interaction, OPENAI);
    } catch (error) {
        await interaction.reply({
            content: messenger.errorMessages('コマンドを実行中にエラーが発生しました', error.message),
            flags: Discord.MessageFlags.Ephemeral
        });
        await logger.errorToFile('コマンドを実行中にエラーが発生', error);
    }
});

// メッセージが作成されたときの処理
DISCORD.on('messageCreate', async (message) => {
    await messageCreateHandler.execute(message, commands, OPENAI);
});

// Bot でログイン
DISCORD.login(process.env.BOT_TOKEN);

// `../commands` ディレクトリ内のコマンドを読み込む
async function loadCommands() {
    const commandDir = PATH.resolve(__dirname, '../commands');
    const commandFiles = await FS.readdir(commandDir);
    const jsFiles = commandFiles.filter((file) => file.endsWith('.js'));

    for (const file of jsFiles) {
        const command = require(PATH.resolve(commandDir, file));
        commands[command.data.name] = command;
        await logger.logToFile(`コマンド \`${command.data.name}\` を読み込みました`);
    }
}