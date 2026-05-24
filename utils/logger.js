const FS = require('fs').promises;
const PATH = require('path');

module.exports = {
    // 会話状態をファイルに書き込む
    saveConversationState: async function (userid, responseId) {
        const stateFilePath = getStateFilePath(userid);
        const state = {
            response_id: responseId,
            updated_at: new Date().toISOString()
        };
        await FS.writeFile(stateFilePath, JSON.stringify(state, null, 2));
    },

    // 会話状態を読み込む
    loadConversationState: async function (userid) {
        const stateFilePath = getStateFilePath(userid);
        try {
            const data = await FS.readFile(stateFilePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            throw error;
        }
    },

    // ログをファイルに書き込む
    logToFile: async function (message) {
        const now = new Date();
        const timestamp = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        const logFilePath = getLogFilePath('openai-bot.log');

        const logMessage = `${timestamp} - ${message}`;

        await FS.appendFile(logFilePath, `${logMessage}\n`);
        console.log(logMessage);
    },

    // 添付ログをファイルに書き込む
    logToFileForAttachment: async function (attachment) {
        const logFilePath = getLogFilePath('openai-bot.log');

        const logMessage = [
            `========= 添付ファイル =========`,
            `${attachment}`,
            `================================`
        ].join('\n');

        await FS.appendFile(logFilePath, `${logMessage}\n`);
    },

    // エラーログをファイルに書き込む
    errorToFile: async function (message, error) {
        const now = new Date();
        const timestamp = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        const logFilePath = getLogFilePath('openai-bot.log');

        // ログにはフルスタックを，コンソールにはエラーメッセージのみを出力
        const logMessage = `${timestamp} - ${message} : ${error.stack}`;
        const errorMessage = `${timestamp} - ${message} : ${error.message}`;

        await FS.appendFile(logFilePath, `${logMessage}\n`);
        console.error(errorMessage);
    },

    // コマンドを起動したユーザ情報をファイルにのみ書き込む
    commandToFile: async function (interaction) {
        const logFilePath = getLogFilePath('openai-bot.log');

        const userInfo = [
            `---------- ユーザ情報 ----------`,
            `コマンド : ${interaction.commandName}`,
            `ユーザ名 : ${interaction.user.username}`,
            `ユーザID : ${interaction.user.id}`,
            `--------------------------------`
        ].join('\n');

        await FS.appendFile(logFilePath, `\n\n${userInfo}\n`);
    },

    // コマンド実行で使用したトークンをファイルに書き込む
    tokenToFile: async function (usedModel, usage) {
        const logFilePath = getLogFilePath('openai-bot.log');

        const tokenInfo = [
            `---------- モデル情報 ----------`,
            `使用モデル : ${usedModel}`,
            `--------- トークン情報 ---------`,
            `質問トークン : ${usage.input_tokens}`,
            `回答トークン : ${usage.output_tokens}`,
            `総計トークン : ${usage.total_tokens}`,
            `--------------------------------`
        ].join('\n');

        await FS.appendFile(logFilePath, `${tokenInfo}\n`);
    },

    // ログファイルのバックアップと新規作成
    logRotate: async function () {
        const logFilePath = getLogFilePath('openai-bot.log');
        const backupLogFilePath = getLogFilePath('openai-bot-backup.log');

        // バックアップファイルが存在する場合は削除
        try {
            await FS.unlink(backupLogFilePath);
        } catch (error) {
            // ファイルが存在しない場合は無視
            if (error.code !== 'ENOENT') throw error;
        }
        // ログファイルをバックアップ
        try {
            await FS.rename(logFilePath, backupLogFilePath);
        } catch (error) {
            // ファイルが存在しない場合は無視
            if (error.code !== 'ENOENT') throw error;
        }

        // 新しいログファイルを作成
        await FS.writeFile(logFilePath, '');
    }
};

function getLogFilePath(fileName) {
    return PATH.resolve(__dirname, `../${fileName}`);
};

function getStateFilePath(userid) {
    return PATH.resolve(__dirname, `../openai-bot-${userid}.json`);
};