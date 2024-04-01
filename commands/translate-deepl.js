const logger = require('../utils/logger');
const messenger = require('../utils/messenger');

module.exports = {
    data: {
        name: 'translate-deepl',
        description: 'DeepL APIでの翻訳文が返ってきます．',
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
                description: '翻訳先の言語を指定してください．',
                type: 3,
                required: true,
                choices: [
                    {
                        name: '日本語',
                        value: 'JA'
                    },
                    {
                        name: '英語（米国）',
                        value: 'EN-US'
                    },
                    {
                        name: '英語（英国）',
                        value: 'EN-GB'
                    },
                    {
                        name: '中国語（簡体字）',
                        value: 'ZH'
                    },
                    {
                        name: '韓国語',
                        value: 'KO'
                    },
                    {
                        name: 'インドネシア語',
                        value: 'ID'
                    },
                    {
                        name: 'ドイツ語',
                        value: 'DE'
                    },
                    {
                        name: 'フランス語',
                        value: 'FR'
                    },
                    {
                        name: 'イタリア語',
                        value: 'IT'
                    },
                    {
                        name: 'スペイン語',
                        value: 'ES'
                    },
                    {
                        name: 'ポルトガル語',
                        value: 'PT-PT'
                    },
                    {
                        name: 'ロシア語',
                        value: 'RU'
                    },
                    {
                        name: 'オランダ語',
                        value: 'NL'
                    },
                    {
                        name: 'ポーランド語',
                        value: 'PL'
                    },
                    {
                        name: 'トルコ語',
                        value: 'TR'
                    }
                ]
            },
            {
                name: '公開',
                description: '他のユーザに公開するかどうかを選択してください．',
                type: 5,
                required: false
            }
        ]
    },

    async execute(interaction) {
        const channelId = process.env.CHAT_CHANNEL_ID.split(',');
        const deepLEmoji = process.env.DEEPL_EMOJI;
        // チャンネルが `ChatGPT` 用の場合に実行
        if (channelId.includes(interaction.channelId)) {
            // `translate-deepl` コマンドが呼び出された場合 DeepL に依頼文を送信
            try {
                // 原文を取得
                const request = interaction.options.getString('原文');
                // 翻訳先言語を取得
                const target = interaction.options.getString('翻訳先');
                logger.logToFile(`依頼文 : ${request.trim()}`); // 依頼文をコンソールに出力
                // 公開設定を取得
                const isPublic = interaction.options.getBoolean('公開');

                // interaction の返信を遅延させる
                await interaction.deferReply({ ephemeral: !isPublic });

                // DeepL に依頼文を送信し翻訳文を取得
                (async () => {
                    try {
                        const DEEPL = require('deepl-node');
                        const translator = new DEEPL.Translator(process.env.DEEPL_API_KEY);
                        const answer = await translator.translateText(request, null, target);
                        await interaction.editReply(`${messenger.requestMessages(request)}\r\n\n${messenger.deepLMessages(answer, deepLEmoji, target)}\r\n`);
                        logger.logToFile(`翻訳文 : ${answer.text.trim()}`); // 翻訳文をコンソールに出力
                    } catch (error) {
                        await interaction.editReply(`${messenger.errorMessages(`DeepL API の返信でエラーが発生しました`, error.message)}`);
                        logger.errorToFile(`DeepL API の返信でエラーが発生`, error);
                    }
                })();
            } catch (error) {
                await interaction.editReply(`${messenger.errorMessages(`原文の取得でエラーが発生しました`, error.message)}`);
                logger.errorToFile(`原文の取得でエラーが発生`, error);
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