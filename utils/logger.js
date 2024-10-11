const FS = require('fs');
const PATH = require('path');

module.exports = {
    // ログをファイルに書き込む
    logToFile: function (message) {
        const now = new Date();
        const timestamp = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        const logFilePath = getLogFilePath(`openai-bot.log`);

        const logMessage = `${timestamp} - ${message}`;

        FS.appendFileSync(logFilePath, logMessage + '\n');
        console.log(logMessage);
    },

    // 添付ログをファイルに書き込む
    logToFileForAttachment: function (attachment) {
        const logFilePath = getLogFilePath(`openai-bot.log`);

        const logMessage = [
            `========= 添付ファイル =========`,
            `内容 : ${attachment}`,
            `================================`
        ].join('\n');

        FS.appendFileSync(logFilePath, logMessage + '\n');
    },

    // エラーログをファイルに書き込む
    errorToFile: function (message, error) {
        const now = new Date();
        const timestamp = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        const logFilePath = getLogFilePath(`openai-bot.log`);

        // ログにはフルスタックを，コンソールにはエラーメッセージのみを出力
        const logMessage = `${timestamp} - ${message} : ${error.stack}`;
        const errorMessage = `${timestamp} - ${message} : ${error.message}`;

        FS.appendFileSync(logFilePath, logMessage + '\n');
        console.error(errorMessage);
    },

    // 直前の会話をファイルに書き込む
    answerToFile: function (userid, request, attachment, answer) {
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

        FS.writeFileSync(logFilePath, previousQA.join('\n') + '\n');
    },

    // 直前の会話をファイルから読み込む
    answerFromFile: function (userid) {
        const logFilePath = getLogFilePath(`openai-bot-${userid}.log`);

        let previousQA = '';
        if (FS.existsSync(logFilePath)) {
            previousQA = FS.readFileSync(logFilePath, 'utf-8');
        }

        return previousQA;
    },

    // コマンドを起動したユーザ情報をファイルにのみ書き込む
    commandToFile: function (interaction) {
        const logFilePath = getLogFilePath(`openai-bot.log`);

        const userInfo = [
            `\n`,
            `---------- ユーザ情報 ----------`,
            `コマンド : ${interaction.commandName}`,
            `ユーザ名 : ${interaction.user.username}`,
            `ユーザID : ${interaction.user.id}`,
            `--------------------------------`
        ].join('\n');

        FS.appendFileSync(logFilePath, userInfo + '\n');
    },

    // コマンド実行で使用したトークンをファイルに書き込む
    tokenToFile: function (usage) {
        const logFilePath = getLogFilePath(`openai-bot.log`);

        const tokenInfo = [
            ``,
            `--------- トークン情報 ---------`,
            `質問トークン : ${usage.prompt_tokens}`,
            `回答トークン : ${usage.completion_tokens}`,
            `総計トークン : ${usage.total_tokens}`,
            `--------------------------------`
        ].join('\n');

        FS.appendFileSync(logFilePath, tokenInfo + '\n');
    },

    // ログファイルのバックアップと新規作成
    logRotate: function () {
        const logFilePath = getLogFilePath(`openai-bot.log`);
        const backupLogFilePath = getLogFilePath(`openai-bot-backup.log`);

        // バックアップファイルが存在する場合は削除
        if (FS.existsSync(backupLogFilePath)) {
            FS.unlinkSync(backupLogFilePath);
        }
        // ログファイルをバックアップ
        if (FS.existsSync(logFilePath)) {
            FS.renameSync(logFilePath, backupLogFilePath);
        }

        // 新しいログファイルを作成
        FS.writeFileSync(logFilePath, '');
    }
};

function getLogFilePath(fileName) {
    return PATH.resolve(__dirname, `../${fileName}`);
}
