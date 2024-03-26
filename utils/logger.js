const FS = require('fs');
const PATH = require('path');

module.exports = {
    // ログをファイルに書き込む
    logToFile: function (message) {
        const now = new Date();
        const timestamp = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        const logFilePath = PATH.resolve(__dirname, `../gpt-bot.log`);

        const logMessage = `${timestamp} - ${message}`;
        FS.appendFileSync(logFilePath, logMessage + '\n');
        console.log(logMessage);
    },

    // エラーログをファイルに書き込む
    errorToFile: function (message, error) {
        const now = new Date();
        const timestamp = now.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        const logFilePath = PATH.resolve(__dirname, `../gpt-bot.log`);

        // ログにはフルスタックを，コンソールにはエラーメッセージのみを出力
        const logMessage = `${timestamp} - ${message} : ${error.stack}`;
        const errorMessage = `${timestamp} - ${message} : ${error.message}`;
        FS.appendFileSync(logFilePath, logMessage + '\n');
        console.error(errorMessage);
    },

    // コマンドを起動したユーザ情報をファイルにのみ書き込む
    commandToFile: function (interaction) {
        const logFilePath = PATH.resolve(__dirname, `../gpt-bot.log`);

        const userInfo = [
            `---------- ユーザ情報 ----------`,
            `コマンド : ${interaction.commandName}`,
            `ユーザ名 : ${interaction.user.username}`,
            `ユーザID : ${interaction.user.id}`,
            `--------------------------------`
        ].join('\n');

        FS.appendFileSync(logFilePath, userInfo + '\n');
    },

    // ログファイルのバックアップと新規作成
    logRotate: function () {
        const logFilePath = PATH.resolve(__dirname, `../gpt-bot.log`);
        const backupLogFilePath = PATH.resolve(__dirname, `../gpt-bot-backup.log`);

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
