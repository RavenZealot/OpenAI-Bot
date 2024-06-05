const logger = require('../utils/logger');
const messenger = require('../utils/messenger');

module.exports = {
    data: {
        name: 'image',
        description: 'OpenAI APIへ依頼するとイラストが生成されます．',
        type: 1,
        options: [
            {
                name: '依頼',
                description: '生成したいイラストの依頼を入れてください．',
                type: 3,
                required: true
            },
            {
                name: '画像サイズ',
                description: '画像サイズを選択してください（生成速度に影響します）．',
                type: 3,
                required: true,
                choices: [
                    {
                        name: '1024x1024',
                        value: '1024x1024'
                    },
                    {
                        name: '1792x1024',
                        value: '1792x1024'
                    },
                    {
                        name: '1024x1792',
                        value: '1024x1792',
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

    async execute(interaction, OPENAI) {
        const channelId = process.env.IMAGE_CHANNEL_ID.split(',');
        const openAiEmoji = process.env.OPENAI_EMOJI;
        // チャンネルが `DALL·E` 用の場合に実行
        if (channelId.includes(interaction.channelId)) {
            // `image` コマンドが呼び出された場合 OpenAI にイラスト生成を依頼
            try {
                // 依頼を取得
                const request = interaction.options.getString('依頼');
                const size = interaction.options.getString('画像サイズ');
                logger.logToFile(`依頼 : ${request.trim()}(${size})`); // 依頼をコンソールに出力
                // 公開設定を取得
                const isPublic = interaction.options.getBoolean('公開');

                // interaction の返信を遅延させる
                await interaction.deferReply({ ephemeral: !isPublic });

                // OpenAI に依頼を送信しイラストを取得
                (async () => {
                    try {
                        const completion = await OPENAI.images.generate({
                            model: 'dall-e-3',
                            prompt: request,
                            n: 1,
                            size: size
                        });
                        const answer = completion.data[0];

                        logger.logToFile(`生成イラスト : ${answer.url}`); // 生成イラストのURLをコンソールに出力
                        await interaction.editReply(`${messenger.answerMessages(answer.url, openAiEmoji)}\r\n`);
                    } catch (error) {
                        // Discord の文字数制限の場合
                        if (error.message.includes('Invalid Form Body')) {
                            logger.errorToFile(`Discord 文字数制限が発生`, error);
                            await interaction.editReply(`${messenger.errorMessages(`Discord 文字数制限が発生しました`, error.message)}`);
                        }
                        // その他のエラーの場合
                        else {
                            logger.errorToFile(`OpenAI API のイラスト生成でエラーが発生`, error);
                            await interaction.editReply(`${messenger.errorMessages(`OpenAI API のイラスト生成でエラーが発生しました`, error.message)}`);
                        }
                    }
                })();
            } catch (error) {
                logger.errorToFile(`依頼の取得でエラーが発生`, error);
                await interaction.editReply(`${messenger.errorMessages(`依頼の取得でエラーが発生しました`, error.message)}`);
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
