module.exports = {
    // ヘルプメッセージを生成
    helpMessages: function (answer) {
        return `:information_source: : ${answer.trim()}`;
    },

    // 回答メッセージを生成
    answerMessages: function (emoji, answer) {
        return `${emoji} : ${answer.trim()}`;
    },

    // 分割回答メッセージを生成
    answerFollowMessages: function (emoji, answer, i, length) {
        return `${emoji} （**${i}** / **${length}**）\n${answer.trim()}`;
    },

    // エラーメッセージを生成
    errorMessages: function (answer, error) {
        return `:warning: **エラー** : ${answer} :warning:\n\`\`\`${error}\`\`\``;
    },

    // 安全ポリシー拒否メッセージを生成
    safetyMessages: function (answer, error) {
        return `:shield: **エラー** : ${answer} :shield:\n\`\`\`${error}\`\`\``;
    },

    // 使用不可メッセージを生成
    usageMessages: function (answer) {
        return `:prohibited: **エラー** : ${answer} :prohibited:`;
    }
};