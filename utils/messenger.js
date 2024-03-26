module.exports = {
    // 質問メッセージを生成
    requestMessages: function (request, promptParam) {
        return `> :speaking_head: \`${promptParam}\` : ${request.trim()}`;
    },

    // 回答メッセージを生成
    answerMessages: function (answer, openAiEmoji) {
        return `<:OpenAI:${openAiEmoji}> : ${answer.trim()}`;
    },

    // エラーメッセージを生成
    errorMessages: function (error) {
        return `:warning: **エラー** : ${error} :warning:`;
    },

    // 翻訳メッセージを生成
    deepLMessages(answer, deepLEmoji, target) {
        return `<:DeepL:${deepLEmoji}> \`${answer.detectedSourceLang} → ${target}\` : ${answer.text.trim()}`;
    }
};