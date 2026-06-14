const logger = require('../utils/logger');

module.exports = {
    name: 'messageCreate',
    async execute(message, commands, OPENAI) {
        // Bot メッセージは無視
        if (message.author.bot) return;

        // 返信かどうかをチェック
        if (message.reference && message.reference.messageId) {
            try {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);

                // Bot メッセージへの返信かチェック
                if (repliedMessage.author.id === message.client.user.id) {
                    const command = commands['chat'];
                    if (command && command.handleReply) {
                        await command.handleReply(message, OPENAI);
                    }
                }
            } catch (error) {
                await logger.errorToFile('返信メッセージの処理中にエラーが発生', error);
            }
        }
    },
};