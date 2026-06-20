const FS = require('fs').promises;
const PATH = require('path');

module.exports = {
    // 会話状態をファイルに書き込む
    saveConversationState: async function (messageId, conversationState) {
        const stateFilePath = getStateFilePath(messageId);
        await FS.mkdir(PATH.dirname(stateFilePath), { recursive: true });
        const state = {
            state: conversationState,
            updated_at: new Date().toISOString()
        };
        await FS.writeFile(stateFilePath, JSON.stringify(state, null, 2));
    },

    // 会話状態を読み込む
    loadConversationState: async function (messageId) {
        const stateFilePath = getStateFilePath(messageId);
        try {
            const data = await FS.readFile(stateFilePath, 'utf-8');
            const parsedData = JSON.parse(data);
            return parsedData.state;
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

    // メッセージを送信したユーザ情報をファイルにのみ書き込む
    messageUserToFile: async function (message) {
        const logFilePath = getLogFilePath('openai-bot.log');

        const userInfo = [
            `---------- ユーザ情報 ----------`,
            `ユーザ名 : ${message.author.username}`,
            `ユーザID : ${message.author.id}`,
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

        // 古い会話状態ファイルを削除
        try {
            const stateDir = PATH.resolve(__dirname, '../states');
            const files = await FS.readdir(stateDir);
            const now = Date.now();
            const expireMs = 7 * 24 * 60 * 60 * 1000;

            for (const file of files) {
                if (file.endsWith('.json')) {
                    const filePath = PATH.join(stateDir, file);
                    const stats = await FS.stat(filePath);
                    // 最終更新日時から閾値以上経過しているファイルを削除
                    if (now - stats.mtimeMs > expireMs) {
                        await FS.unlink(filePath);
                    }
                }
            }
        } catch (error) {
            // ディレクトリが存在しない場合は無視
            if (error.code !== 'ENOENT') throw error;
        }

        // 新しいログファイルを作成
        await FS.writeFile(logFilePath, '');
    }
};

function getLogFilePath(fileName) {
    return PATH.resolve(__dirname, `../${fileName}`);
};

function getStateFilePath(messageId) {
    return PATH.resolve(__dirname, `../states/openai-bot-message-${messageId}.json`);
}