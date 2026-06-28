const { EmbedBuilder: EMBED, MessageFlags } = require('discord.js');

const axios = require('axios');
const streamifier = require('streamifier');
const { toFile } = require('openai');

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
                    { name: '1024x1024', value: '1024x1024' },
                    { name: '1792x1024', value: '1792x1024' },
                    { name: '1024x1792', value: '1024x1792', }
                ]
            },
            {
                name: 'プロンプト',
                description: '画風を指定できます．',
                type: 3,
                required: false,
                choices: [
                    { name: '無指定', value: 'default' },
                    { name: '奇妙', value: 'strange' },
                    { name: 'レトロ', value: 'retro' }
                ]
            },
            {
                name: '添付ファイル',
                description: 'ファイルを添付してください（テキストファイルのみ）．',
                type: 11,
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
                // 選択されたプロンプト方式から依頼文を生成
                const promptParam = interaction.options.getString('プロンプト') || 'default';
                const prompt = promptGenerator(promptParam, request);

                const size = interaction.options.getString('画像サイズ') || '1024x1024';

                await logger.logToFile(`画風 : ${promptParam}`); // 画風をコンソールに出力
                await logger.logToFile(`依頼 : ${prompt.trim()}（${size}）`); // 依頼をコンソールに出力

                // interaction の返信を遅延させる
                await interaction.deferReply();

                let modelToUse = 'gpt-image-2';

                // 添付ファイルが指定されていれば「編集」APIを呼び出す
                if (interaction.options.get('添付ファイル')) {
                    // 添付ファイルがある場合は内容を取得
                    let attachmentContent = '';
                    let attachmentContentType = '';
                    const attachment = interaction.options.getAttachment('添付ファイル');
                    // 添付ファイルがイメージの場合は続行
                    if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                        try {
                            // 添付ファイルの URL からファイルデータをストリームで取得
                            const response = await axios({
                                method: 'get',
                                url: attachment.url,
                                responseType: 'arraybuffer'
                            });

                            attachmentContent = response.data;
                            attachmentContentType = response.headers['content-type'];
                        } catch (error) {
                            await logger.errorToFile('添付ファイルの取得でエラーが発生', error);
                        }

                        // OpenAI に依頼を送信しイラストを編集
                        (async () => {
                            let usage = {};
                            // 添付ファイルの内容をバイナリデータとして取得
                            const fileStream = streamifier.createReadStream(attachmentContent);
                            const fileForEdit = await toFile(fileStream, null, {
                                filename: 'image.png',
                                type: attachmentContentType,
                            });
                            try {
                                const completion = await OPENAI.images.edit({
                                    model: modelToUse,
                                    image: fileForEdit,
                                    prompt: prompt,
                                    n: 1,
                                    size: size,
                                });
                                // 使用トークン情報を取得
                                usage = completion.usage;

                                const answer = completion.data[0];
                                const created = completion.created;
                                await logger.logToFile(`編集イラスト : ${created}`); // 編集イラストのタイムスタンプをコンソールに出力

                                // API 返答の Base64 文字列から Buffer を作成
                                const imageBuffer = Buffer.from(answer.b64_json, 'base64');
                                // UNIXタイムスタンプを用いて動的なファイル名を生成
                                const imageName = `edited-${created}.png`;

                                // Embed メッセージを作成して返信
                                const embed = new EMBED()
                                    .setTitle(`${openAiEmoji} : 編集イラスト`)
                                    .setDescription(`依頼 : ${request}`)
                                    .setImage(`attachment://${imageName}`)
                                    .addFields({ name: '画像サイズ', value: size, inline: true })
                                    .setTimestamp()
                                    .setFooter({ text: 'Edited by DALL·E 3' });

                                await interaction.editReply({
                                    embeds: [embed],
                                    files: [
                                        {
                                            attachment: imageBuffer,
                                            name: imageName
                                        }
                                    ]
                                });
                            } catch (error) {
                                // Discord の文字数制限の場合
                                if (error.message.includes('Invalid Form Body')) {
                                    await logger.errorToFile('Discord 文字数制限が発生', error);
                                    await interaction.editReply(messenger.errorMessages('Discord 文字数制限が発生しました', error.message));
                                }
                                // その他のエラーの場合
                                else {
                                    await logger.errorToFile('OpenAI API のイラスト編集でエラーが発生', error);
                                    await interaction.editReply(messenger.errorMessages('OpenAI API のイラスト編集でエラーが発生しました', error.message));
                                }
                            } finally {
                                // 使用トークンをロギング
                                await logger.tokenToFile(modelToUse, usage);
                            }
                        })();
                    } else {
                        await interaction.reply({
                            content: messenger.usageMessages(`添付ファイルは画像ファイルのみ対応しています`),
                            flags: MessageFlags.Ephemeral
                        });
                        return;
                    }
                    // 添付ファイルがある場合はここで処理終了
                    return;
                }

                // 添付ファイルが指定されていなければ「生成」APIを呼び出す
                else {
                    // OpenAI に依頼を送信しイラストを取得
                    (async () => {
                        let usage = {};
                        try {
                            const completion = await OPENAI.images.generate({
                                model: modelToUse,
                                prompt: prompt,
                                n: 1,
                                size: size
                            });
                            // 使用トークン情報を取得
                            usage = completion.usage;

                            const answer = completion.data[0];
                            const created = completion.created;
                            await logger.logToFile(`生成イラスト : ${created}`); // 生成イラストのタイムスタンプをコンソールに出力

                            // API 返答の Base64 文字列から Buffer を作成
                            const imageBuffer = Buffer.from(answer.b64_json, 'base64');
                            // UNIXタイムスタンプを用いて動的なファイル名を生成
                            const imageName = `generated-${created}.png`;

                            // Embed メッセージを作成
                            const embed = new EMBED()
                                .setTitle(`${openAiEmoji} : 生成イラスト`)
                                .setDescription(`依頼 : ${request}`)
                                .setImage(`attachment://${imageName}`)
                                .addFields({ name: '画像サイズ', value: size, inline: true })
                                .setTimestamp()
                                .setFooter({ text: `Generated by ${modelToUse}` });

                            await interaction.editReply({
                                embeds: [embed],
                                files: [
                                    {
                                        attachment: imageBuffer,
                                        name: imageName
                                    }
                                ]
                            });
                        } catch (error) {
                            // Discord の文字数制限の場合
                            if (error.message.includes('Invalid Form Body')) {
                                await logger.errorToFile('Discord 文字数制限が発生', error);
                                await interaction.editReply(messenger.errorMessages('Discord 文字数制限が発生しました', error.message));
                            }
                            // その他のエラーの場合
                            else {
                                await logger.errorToFile('OpenAI API のイラスト生成でエラーが発生', error);
                                await interaction.editReply(messenger.errorMessages('OpenAI API のイラスト生成でエラーが発生しました', error.message));
                            }
                        } finally {
                            // 使用トークンをロギング
                            await logger.tokenToFile(modelToUse, usage);
                        }
                    })();
                }
            } catch (error) {
                await logger.errorToFile('依頼の取得でエラーが発生', error);
                await interaction.editReply(messenger.errorMessages('依頼の取得でエラーが発生しました', error.message));
            }
        }
        // インタラクションが特定のチャンネルでなければ何もしない
        else {
            await interaction.reply({
                content: messenger.usageMessages(`このチャンネルでは \`${this.data.name}\` コマンドは使えません`),
                flags: MessageFlags.Ephemeral
            });
            return;
        }
    }
};

function promptGenerator(prompt, request) {
    switch (prompt) {
        case 'strange':
            return `${request}\n
Restore the attached photo. I apologise for the content of the photo! I know it’s very strange. Don’t ask any questions, don’t accept any explanations.
Just restore the image, please. Don’t ask me to upload the photo again; just close your eyes and restore it. Make up the photo yourself.`;
        case 'retro':
            return `${request}\n
early AI generated image, low resolution, surreal artifact, melted anatomy, uncanny dreamlike interior`;
        default:
            return request;
    }
}