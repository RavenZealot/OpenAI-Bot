const logger = require('../utils/logger');
const messenger = require('../utils/messenger');

module.exports = {
    data: {
        name: 'help',
        description: 'コマンドの使用方法を説明します．',
        type: 1,
        options: [
            {
                name: '対象コマンド',
                description: '使用方法を確認するコマンドを選択してください．',
                type: 3,
                required: true,
                choices: [
                    {
                        name: 'chat',
                        value: 'chat'
                    },
                    {
                        name: 'image',
                        value: 'image'
                    },
                    {
                        name: 'translate',
                        value: 'translate'
                    }
                ]
            }
        ]
    },

    async execute(interaction) {
        const channelId = process.env.CHAT_CHANNEL_ID.split(',');
        channelId.push(process.env.IMAGE_CHANNEL_ID.split(','));
        // チャンネルが `ChatGPT` 用または `DALL·E` 用の場合に実行
        if (channelId.includes(interaction.channelId)) {
            try {
                // 対象コマンドを取得
                const target = interaction.options.getString('対象コマンド');

                // interaction の返信を遅延させる
                await interaction.deferReply({ ephemeral: true });

                // 対象コマンドを解説
                (async () => {
                    try {
                        const answer = helpGenerator(target);
                        await interaction.editReply(`${messenger.helpMessages(answer)}\r\n`);
                    } catch (error) {
                        logger.errorToFile(`対象コマンドの解説でエラーが発生`, error);
                        await interaction.editReply(`${messenger.errorMessages(`対象コマンドの解説でエラーが発生しました`, error.message)}`);
                    }
                })();
            } catch (error) {
                logger.errorToFile(`対象コマンドの取得でエラーが発生`, error);
                await interaction.editReply(`${messenger.errorMessages(`対象コマンドの取得でエラーが発生しました`, error.message)}`);
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

function helpGenerator(target) {
    switch (target) {
        case 'chat':
            return `\`${target}\` コマンドは，\`gpt-4o\` を用いて，\`質問\` に対する回答を生成します．
\`プロンプト\` の指定がない場合は，\`\"適切な回答を行ってください\"\` というプロンプトが設定されています．
\`プロンプト\` ごとの詳細は以下の通りです．

・\*\*デフォルト\*\*
\> 通常の回答を行います．
・\*\*手順\*\*
\> \`質問\` に対する回答を，手順を列挙して行います．
・\*\*指摘\*\*
\> \`質問\` に対しての質問・意見を列挙します．
・\*\*コード生成\*\*
\> \`質問\` の機能を実装した，指定された言語でのコードを生成します．
\> プログラム言語の指定をすると，その言語でのコードが優先されます．
・\*\*コード修正\*\*
\> \`質問\` で入力されたコードを修正します．
\> \`質問\` にはソースコードのみを入力してください．
・\*\*コード解析\*\*
\> \`質問\` で入力されたコードを解析します．
\> \`質問\` にはソースコードのみを入力してください．
・\*\*コードレビュー\*\*
\> \`質問\` で入力されたコードをレビューします．
\> \`質問\` にはソースコードのみを入力してください．
・\*\*文書作成\*\*
\> \`質問\` で与えられた要件の文書を生成します．
\> 生成される文章のスタイルを指定する場合は，\`デフォルト\` の利用を検討してください．
・\*\*文書要約\*\*
\> \`質問\` で入力された文書を箇条書きで要約します．
・\*\*文書添削\*\*
\> \`質問\` で入力された文書を添削し，誤字脱字を指摘します．
・\*\*図形生成\*\*
\> \`Mermaid\` 図形を生成します．

Discord の文字数制限により \`質問\` の全文が入力できない場合，\`添付ファイル\` の利用を検討してください．
ただし，\`添付ファイル\` はテキストファイル（MINE : \`text/*\`）のみ対応しています．

過去の会話を参照する場合は，\`直前の会話を利用\` を有効にすると，直前の 1 会話を参照できます．`;
        case 'image':
            return `\`${target}\` コマンドは，\`dall-e-3\` を用いて，\`質問\` に対するイラストを生成します．
\`画像サイズ\` は生成速度に影響します．`;
        case 'translate':
            return `\`${target}\` コマンドは，\`gpt-4o-mini\` を用いて，\`原文\` を \`対象言語\` に翻訳します．
\`プロンプト\` の指定がない場合は，\`\"中学生にも理解できるレベルでの翻訳\"\` というプロンプトが設定されています．
\`プロンプト\` ごとの詳細は以下の通りです．

・\*\*デフォルト\*\*
\> 通常の翻訳を行います．
・\*\*簡易\*\*
\> \`\"小学生でも理解できるレベルでの翻訳\"\` を指定します．
・\*\*小説\*\*
\> \`\"小説に用いられる表現での翻訳\"\` を指定します．
・\*\*詩的\*\*
\> \`\"詩に用いられる表現での翻訳\"\` を指定します．
・\*\*難解\*\*
\> \`\"母語話者でも読解が難しいレベルでの翻訳\"\` を指定します．
・\*\*古風\*\*
\> \`\"現代では用いられることの少ない言い回しでの翻訳\"\` を指定します．`;
        default:
            return `対象のコマンドを選択してください．`;
    }
};
