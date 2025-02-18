const FS = require('fs').promises;
const PATH = require('path');

module.exports = {
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
            `内容 : ${attachment}`,
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

    // 直前の会話をファイルに書き込む
    answerToFile: async function (userid, request, attachment, answer) {
        const logFilePath = getLogFilePath(`openai-bot-${userid}.log`);

        const previousQA = [
            `---------- 直前の会話 ----------`,
            `質問 : ${request}`
        ];
        if (attachment) {
            previousQA.push(
                `========= 添付ファイル =========`,
                `内容 : ${attachment}`,
                `================================`
            );
        }
        previousQA.push(
            `回答 : ${answer}`,
            `--------------------------------`
        );

        await FS.writeFile(logFilePath, `\n${previousQA.join('\n')}\n`);
    },

    // 直前の会話をファイルから読み込む
    answerFromFile: async function (userid) {
        const logFilePath = getLogFilePath(`openai-bot-${userid}.log`);

        let previousQA = '';
        try {
            previousQA = await FS.readFile(logFilePath, 'utf-8');
        } catch (error) {
            if (error.code !== 'ENOENT') throw error;
        }

        return previousQA;
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
            `質問トークン : ${usage.prompt_tokens}`,
            `回答トークン : ${usage.completion_tokens}`,
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
