module.exports = {
    // 質問メッセージを生成
    //! Discord の UI でリクエストは保存されるため，使用しない
    requestMessages: function (request, promptParam) {
        return `> :speaking_head: \`${promptParam}\` : ${request.trim()}`;
    },

    // 回答メッセージを生成
    answerMessages: function (answer, openAiEmoji) {
        return `<:OpenAI:${openAiEmoji}> : ${answer.trim()}`;
    },

    // 分割回答メッセージを生成
    answerFollowMessages: function (answer, openAiEmoji, i, length) {
        return `<:OpenAI:${openAiEmoji}> （**${i}** / **${length}**）\n${answer.trim()}`;
    },

    // エラーメッセージを生成
    errorMessages: function (answer, error) {
        return `:warning: **エラー** : ${answer} :warning:\n\`\`\`${error}\`\`\``;
    },

    // 使用不可メッセージを生成
    usageMessages: function (answer) {
        return `:prohibited: **エラー** : ${answer} :prohibited:`;
    }
};