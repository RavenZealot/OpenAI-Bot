// dotenv で環境変数を読み込む
require('dotenv').config();

// 必要なモジュールを読み込む
const Discord = require('discord.js');
const OpenAI = require('openai');
const FS = require('fs');
const PATH = require('path');

const logger = require('../utils/logger');
const messenger = require('../utils/messenger');

// Discord クライアントを作成
const DISCORD = new Discord.Client({ intents: [Discord.GatewayIntentBits.Guilds] });

// OpenAI API クライアントを作成
const configuration = new OpenAI({
    organization: process.env.OPENAI_ORG_ID,
    apiKey: process.env.OPENAI_API_KEY
});
const OPENAI = new OpenAI(configuration);

// コマンドを読み込む
const commands = {};
const commandFiles = FS.readdirSync(PATH.resolve(__dirname, `../commands`)).filter((file) => file.endsWith(`.js`));

for (const file of commandFiles) {
    const command = require(PATH.resolve(__dirname, `../commands/${file}`));
    commands[command.data.name] = command;
    logger.logToFile(`コマンド \`${command.data.name}\` を読み込みました`);
}

// Bot が起動したときの処理
DISCORD.once('ready', async () => {
    // コマンドを登録
    const data = [];
    for (const commandName in commands) {
        data.push(commands[commandName].data);
    }
    await DISCORD.application.commands.set(data);

    // ログファイルのバックアップと新規作成
    logger.logRotate();

    logger.logToFile(`${DISCORD.user.tag} でログインしました`);
});

// インタラクションがあったときの処理
DISCORD.on('interactionCreate', async (interaction) => {
    // コマンド以外のインタラクションは無視
    if (!interaction.isCommand()) return;

    // コマンドを取得
    const command = commands[interaction.commandName];

    try {
        // ユーザ情報をログファイルに書き込む
        logger.commandToFile(interaction);
        await command.execute(interaction, OPENAI);
    } catch (error) {
        await interaction.reply({
            content: messenger.errorMessages(`コマンドを実行中にエラーが発生しました`),
            ephemeral: true
        });
        logger.errorToFile(`コマンドを実行中にエラーが発生`, error);
    }
});

// Bot でログイン
DISCORD.login(process.env.BOT_TOKEN);