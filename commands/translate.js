const logger = require('../utils/logger');
const messenger = require('../utils/messenger');

module.exports = {
    data: {
        name: 'translate',
        description: 'OpenAI APIでの翻訳文が返ってきます．',
        type: 1,
        options: [
            {
                name: '原文',
                description: '翻訳したい文を入れてください．',
                type: 3,
                required: true
            },
            {
                name: '翻訳先',
                description: '翻訳先の言語を指定してください（言語名のみ）．',
                type: 3,
                required: true
            },
            {
                name: 'プロンプト',
                description: '回答アルゴリズムを指定できます．',
                type: 3,
                required: false,
                choices: [
                    {
                        name: 'デフォルト',
                        value: 'default'
                    },
                    {
                        name: '簡易',
                        value: 'easy'
                    },
                    {
                        name: '小説',
                        value: 'novel'
                    },
                    {
                        name: '詩的',
                        value: 'poem'
                    },
                    {
                        name: '難解',
                        value: 'arcane'
                    },
                    {
                        name: '古風',
                        value: 'old'
                    }
                ]
            },
            {
                name: '公開',
                description: '他のユーザに公開するかを選択してください．',
                type: 5,
                required: false
            }
        ]
    },

    async execute(interaction, OPENAI) {
        const channelId = process.env.CHAT_CHANNEL_ID.split(',');
        const openAiEmoji = process.env.OPENAI_EMOJI;
        // チャンネルが `ChatGPT` 用の場合に実行
        if (channelId.includes(interaction.channelId)) {
            // `translate` コマンドが呼び出された場合 OpenAI に依頼文を送信
            try {
                // 原文を取得
                const request = interaction.options.getString('原文');
                // 翻訳先言語を取得
                const target = interaction.options.getString('翻訳先');
                // 選択されたプロンプト方式から依頼文を生成
                const promptParam = interaction.options.getString('プロンプト');
                const prompt = promptGenerator(promptParam, target);
                logger.logToFile(`指示 : ${prompt.trim()}`); // 指示をコンソールに出力
                logger.logToFile(`原文 : ${request.trim()}`); // 原文をコンソールに出力
                // 公開設定を取得
                const isPublic = interaction.options.getBoolean('公開') ?? true;

                // interaction の返信を遅延させる
                await interaction.deferReply({ ephemeral: !isPublic });

                // OpenAI に依頼文を送信し翻訳文を取得
                (async () => {
                    try {
                        const messages = [
                            { role: 'system', content: `${prompt}` },
                            { role: 'user', content: `${request}` }
                        ];

                        const completion = await OPENAI.chat.completions.create({
                            model: 'gpt-4o-mini',
                            messages: messages
                        });
                        const answer = completion.choices[0];

                        logger.logToFile(`翻訳文 : ${answer.message.content.trim()}`); // 翻訳文をコンソールに出力

                        await interaction.editReply(`${messenger.answerMessages(answer.message.content, openAiEmoji, target)}\r\n`);
                    } catch (error) {
                        // Discord の文字数制限の場合
                        if (error.message.includes('Invalid Form Body')) {
                            logger.errorToFile(`Discord 文字数制限が発生`, error);
                            await interaction.editReply(`${messenger.errorMessages(`Discord 文字数制限が発生しました`, error.message)}`);
                        }
                        // その他のエラーの場合
                        else {
                            logger.errorToFile(`OpenAI API の返信でエラーが発生`, error);
                            await interaction.editReply(`${messenger.errorMessages(`OpenAI API の返信でエラーが発生しました`, error.message)}`);
                        }
                    }
                })();
            } catch (error) {
                logger.errorToFile(`原文の取得でエラーが発生`, error);
                await interaction.editReply(`${messenger.errorMessages(`原文の取得でエラーが発生しました`, error.message)}`);
            }
        }
        // インタラクションが特定のチャンネルでなければ何もしない
        else {
            await interaction.reply({
                content: `${messenger.usageMessages(`このチャンネルでは \`${this.data.name}\` コマンドは使えません`)}`,
                ephemeral: true
            });
            return;
        }
    }
};

function promptGenerator(prompt, target) {
    switch (prompt) {
        case 'easy':
            return `ユーザからの「原文」に対して，あなたは教科書制作会社の熟練翻訳家として，以下の「制約」を遵守して適切な翻訳を行ってください．
### 制約\r\n・小学生にも理解しやすいこと\r\n・小学生に読み聞かせるようにすること\r\n・\"${target}\"に翻訳すること`;
        case 'novel':
            return `ユーザからの「原文」に対して，あなたは出版社の熟練翻訳家として，以下の「制約」を遵守して適切な翻訳を行ってください．
### 制約\r\n・小説に用いられる表現とすること\r\n・小説中の会話文とすること\r\n・\"${target}\"に翻訳すること`;
        case 'poem':
            return `ユーザからの「原文」に対して，あなたは出版社の熟練翻訳家として，以下の「制約」を遵守して適切な翻訳を行ってください．
### 制約\r\n・詩に用いられる表現とすること\r\n・語り手による口語とすること\r\n・\"${target}\"に翻訳すること`;
        case 'arcane':
            return `ユーザからの「原文」に対して，あなたは言語学に精通した熟練翻訳家として，以下の「制約」を遵守して適切な翻訳を行ってください．
### 制約\r\n・大人の母語話者でも難解な表現を多用すること\r\n・日常で用いられない単語を採用すること\r\n・\"${target}\"に翻訳すること`;
        case 'old':
            return `ユーザからの「原文」に対して，あなたは言語学に精通した熟練翻訳家として，以下の「制約」を遵守して適切な翻訳を行ってください．
### 制約\r\n・古文書や歴史書で用いられる表現とすること\r\n・現代では用いられない古語を多用すること\r\n・\"${target}\"に翻訳すること`;
        default:
            return `ユーザからの「原文」に対して，あなたは教科書制作会社の熟練翻訳家として，以下の「制約」を遵守して適切な翻訳を行ってください．
### 制約\r\n・中学生にも理解しやすいこと\r\n・中学生にも読みやすいこと\r\n・\"${target}\"に翻訳すること`;
    }
};
