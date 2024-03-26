const logger = require('../utils/logger');
const messenger = require('../utils/messenger');

module.exports = {
    data: {
        name: 'chat',
        description: 'OpenAI APIへ質問すると答えが返ってきます．',
        type: 1,
        options: [
            {
                name: '質問',
                description: '質問したい文を入れてください．',
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
                        name: '手順',
                        value: 'step'
                    },
                    {
                        name: '指摘',
                        value: 'question'
                    },
                    {
                        name: 'コード生成',
                        value: 'code'
                    },
                    {
                        name: 'コード修正',
                        value: 'code_correction'
                    },
                    {
                        name: 'コード解析',
                        value: 'code_analysis'
                    },
                    {
                        name: 'コードレビュー',
                        value: 'code_review'
                    },
                    {
                        name: '文書作成',
                        value: 'document'
                    },
                    {
                        name: '文書要約',
                        value: 'document_summary'
                    },
                    {
                        name: '文書添削',
                        value: 'document_correction'
                    },
                    {
                        name: '図形生成',
                        value: 'figure'
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
        const channelId = process.env.CHAT_CHANNEL_ID.split(',');
        const openAiEmoji = process.env.OPENAI_EMOJI;
        // チャンネルが `ChatGPT` 用の場合に実行
        if (channelId.includes(interaction.channelId)) {
            // `chat` コマンドが呼び出された場合 OpenAI に質問を送信
            try {
                // 質問を取得
                const request = interaction.options.getString('質問');
                // 選択されたプロンプト方式から質問文を生成
                const promptParam = interaction.options.getString('プロンプト');
                const prompt = promptGenerator(promptParam);
                logger.logToFile(`指示 : ${prompt.trim()}`); // 指示をコンソールに出力
                logger.logToFile(`質問 : ${request.trim()}`); // 質問をコンソールに出力
                // 公開設定を取得
                const isPublic = interaction.options.getBoolean('公開');

                // interaction の返信を遅延させる
                await interaction.deferReply({ ephemeral: !isPublic });

                // OpenAI に質問を送信し回答を取得
                (async () => {
                    try {
                        const completion = await OPENAI.chat.completions.create({
                            model: 'gpt-4-turbo-preview',
                            messages: [{ role: 'system', content: `${prompt}` }, { role: 'user', content: `${request}` }]
                        });
                        const answer = completion.choices[0];
                        await interaction.editReply(`${messenger.requestMessages(request, promptParam)}\r\n\n${messenger.answerMessages(answer.message.content, openAiEmoji)}\r\n`);
                        logger.logToFile(`回答 : ${answer.message.content.trim()}`); // 回答をコンソールに出力
                    } catch (error) {
                        await interaction.editReply(`${messenger.errorMessages(`OpenAI API の返信でエラーが発生しました`)}`);
                        logger.errorToFile(`OpenAI API の返信でエラーが発生`, error);
                    }
                })();
            } catch (error) {
                await interaction.editReply(`${messenger.errorMessages(`質問の取得でエラーが発生しました`)}`);
                logger.errorToFile(`質問の取得でエラーが発生`, error);
            }
        }
        // インタラクションが特定のチャンネルでなければ何もしない
        else {
            await interaction.reply({
                content: `${messenger.errorMessages(`このチャンネルでは \`${this.data.name}\` コマンドは使えません`)}`,
                ephemeral: true
            });
            return;
        }
    }
};

function promptGenerator(prompt) {
    switch (prompt) {
        case 'step':
            return `ユーザからの「質問」に対して，Step-By-Step でなるべく詳細に説明してください．`;
        case 'question':
            return `ユーザからの「文章」に対して，あなたは専門的知見をもった教師あるいは先輩として，「指摘事項」として質問や意見を行ってください．
「指摘事項」は簡潔にまとめ，列挙するようにしてください．`;
        case 'code':
            return `ユーザからの「要求」に対して，あなたは専門的知見をもった熟練のプログラマとして全ての機能を満たすソースコードを考案してください．
プログラム言語についての指定は「要求」に従い，指定がなければ都度最良の言語を選択し，判断理由も合わせて回答してください．
ソースコードに対する解説は簡潔にまとめるようにしてください．`;
        case 'code_correction':
            return `ユーザが提供する「ソースコード」は，何らかのミスにより想定しない動作やエラーを引き起こします．
あなたは専門的知見をもった熟練のプログラマとしてソースコードの修正を提案してください．ただし，改行文字が脱落することがあります．
なお，次の説明は必ず含めてください．
・「ソースコード」が想定しない動作やエラーを引き起こす理由を，実際のエラー箇所を抽出して説明してください
・エラー箇所に対する修正案を，ソースコードと解説を合わせて説明してください`;
        case 'code_analysis':
            return `ユーザが提供する「ソースコード」に対して，あなたは専門的知見をもった熟練のプログラマとしてソースコードの概要を説明してください．ただし，改行文字が脱落することがあります．
なお，次の説明は必ず含めてください．
・プログラム内で定義されている変数はどのような物理パラメータを示すのか，を列挙してください
・プログラム内で定義されている変数はプログラム内でどのような役割を持つのか，を説明してください
・プログラム内で定義されている関数はどのような機能を持つのか，を説明してください`;
        case 'code_review':
            return `ユーザが提供する全ての「内容」に対して，あなたは専門的知見をもった熟練のプログラマとしてソースコードをレビューしてください．ただし，改行文字が脱落することがあります．
なお，次の観点を必ず含めてください．対象が無ければ言及する必要はありません．
・推奨されなくなった実装の指摘，および修正案．例 : \`substr\` → \`substring\`
・\`if\` 条件式の簡潔化の指摘，および修正案．例 : \`if (a == 0) { ... }\` → \`if (!a) { ... }\`
・実装に至った経緯や選択されている言語などについては，正しいものとしてレビュー対象に含まない`;
        case 'document':
            return `ユーザからの「要求」に対して，要求を満たす文章を考案してください．
頭語や結語は不要で，本文のみとしてください．
また，公序良俗に反する文章は避け，「だ・である調」で記述してください．`;
        case 'document_summary':
            return `ユーザが提供する「文章」に対して，最も重要なポイントを箇条書きに要約してください．
それぞれの要点は簡潔にまとめることが重要ですが，文章の意味を変えるような要約や記述意義の欠損は避けてください．`;
        case 'document_correction':
            return `ユーザが提供する「文章」に対して，あなたは国営放送のシナリオライターとして文章を添削してください．
誤字・脱字の指摘は該当箇所をわかりやすく示し，変更案も合わせて示してください．
文章の意味を変えるような要約や記述意義の欠損は避けてください．`;
        case 'figure':
            return `ユーザからの「要求」に対して，適切な Mermaid ダイアグラムを作成してください．`;
        default:
            return `ユーザからの「質問」に対して，適切な回答を行ってください．`;
    }
};