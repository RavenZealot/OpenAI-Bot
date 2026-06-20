const { MessageFlags } = require('discord.js');

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
                    { name: 'デフォルト', value: 'default' },
                    { name: '指摘', value: 'question' },
                    { name: '推論', value: 'reasoning' },
                    { name: 'コード生成', value: 'code' },
                    { name: 'コード解析', value: 'code_analysis' },
                    { name: 'コードレビュー', value: 'code_review' },
                    { name: 'ログ解析', value: 'log_analysis' },
                    { name: '文書作成', value: 'document' },
                    { name: '文書要約', value: 'document_summary' },
                    { name: '図形生成', value: 'figure' },
                    { name: 'コミットメッセージ', value: 'commit' }
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
        const channelId = process.env.CHAT_CHANNEL_ID.split(',');
        const openAiEmoji = process.env.OPENAI_EMOJI;
        // インタラクションが特定のチャンネルでなければ何もしない
        if (!channelId.includes(interaction.channelId)) {
            await interaction.reply({
                content: messenger.usageMessages(`このチャンネルでは \`${this.data.name}\` コマンドは使えません`),
                flags: MessageFlags.Ephemeral
            });
            return;
        }
        // `chat` コマンドが呼び出された場合 OpenAI に質問を送信
        try {
            // コマンドを実行したユーザの ID を取得
            const userId = interaction.user.id;
            // 質問を取得
            const request = interaction.options.getString('質問');
            // 選択されたプロンプト方式から質問文を生成
            const promptParam = interaction.options.getString('プロンプト') || 'default';
            const prompt = promptGenerator(promptParam);

            await logger.logToFile(`指示 : ${prompt.trim()}`); // 指示をコンソールに出力
            await logger.logToFile(`質問 : ${request.trim()}`); // 質問をコンソールに出力

            // 添付ファイルがある場合は内容を取得
            let rawAttachment = '';
            let attachmentContent = '';
            if (interaction.options.get('添付ファイル')) {
                const attachment = interaction.options.getAttachment('添付ファイル');
                // 添付ファイルがテキストの場合は質問文に追加
                if (attachment.contentType && attachment.contentType.startsWith('text/')) {
                    try {
                        const response = await fetch(attachment.url);
                        const arrayBuffer = await response.arrayBuffer();
                        rawAttachment = Buffer.from(arrayBuffer).toString();
                        attachmentContent = rawAttachment
                            .replace(/\r\n/g, '\n')
                            .replace(/\n{3,}/g, '\n\n')
                            .replace(/[ \t]+$/gm, '');
                    } catch (error) {
                        await logger.errorToFile('添付ファイルの取得中にエラーが発生', error);
                    }
                }
                await logger.logToFileForAttachment(rawAttachment.trim());
            }

            // interaction の返信を遅延させる
            await interaction.deferReply();

            // OpenAI に質問を送信し回答を取得
            (async () => {
                let usedModel = 'unknown';
                let usage = [];
                try {
                    // プロンプトタイプに応じたモデルの選択
                    const codePrompts = ['code', 'code_analysis', 'code_review', 'log_analysis'];
                    let modelToUse;
                    if (promptParam === 'reasoning') {
                        modelToUse = 'gpt-5.5-pro'
                    } else if (codePrompts.includes(promptParam)) {
                        modelToUse = 'gpt-5.5'
                    } else {
                        modelToUse = 'gpt-5.4-mini'
                    }

                    const messages = [{ role: 'system', content: prompt }];
                    const userContent = [];
                    if (attachmentContent) {
                        userContent.push({
                            type: 'input_text',
                            text: `<attachment>\n${attachmentContent}\n</attachment>`
                        });
                    }
                    userContent.push({
                        type: 'input_text',
                        text: request
                    });
                    messages.push({ role: 'user', content: userContent });

                    // 添付ファイルの有無で推論モデルを変更
                    const reasoningEffort = attachmentContent ? 'high' : 'medium';

                    // モデルに応じてパラメータを設定
                    let completionParams = {
                        model: modelToUse,
                        input: messages
                    };
                    if (promptParam === 'reasoning' || codePrompts.includes(promptParam)) {
                        completionParams.reasoning = { effort: reasoningEffort };
                    }
                    messages.push({ role: 'user', content: '【注意】回答はMarkdown形式でなければ正しく表示されません' });

                    const completion = await OPENAI.responses.create(completionParams);
                    // 使用モデル情報を取得
                    usedModel = completion.model;
                    // 使用トークン情報を取得
                    usage = completion.usage;

                    const answer = { message: { content: completion.output_text } };
                    await logger.logToFile(`回答 : ${answer.message.content.trim()}`); // 回答をコンソールに出力
                    // 会話状態を保存
                    await logger.saveConversationState(userId, completion.id);

                    // 回答を分割
                    const splitMessages = splitAnswer(answer.message.content);
                    let lastMessageId;
                    // 単一メッセージの場合
                    if (splitMessages.length === 1) {
                        const replyMsg = await interaction.editReply({
                            content: messenger.answerMessages(openAiEmoji, splitMessages[0])
                        });
                        lastMessageId = replyMsg.id;
                    }
                    // 複数メッセージの場合
                    else {
                        for (let i = 0; i < splitMessages.length; i++) {
                            const message = splitMessages[i];
                            if (i === 0) {
                                const replyMsg = await interaction.editReply({
                                    content: messenger.answerFollowMessages(openAiEmoji, message, i + 1, splitMessages.length)
                                });
                                if (i === splitMessages.length - 1) {
                                    lastMessageId = replyMsg.id;
                                }
                            } else {
                                const followMsg = await interaction.followUp({
                                    content: messenger.answerFollowMessages(openAiEmoji, message, i + 1, splitMessages.length)
                                });
                                if (i === splitMessages.length - 1) {
                                    lastMessageId = followMsg.id;
                                }
                            }
                        }
                    }

                    // 会話状態を保存
                    try {
                        await logger.saveConversationState(lastMessageId, {
                            response_id: completion.id,
                            promptParam: promptParam,
                            model: completion.model
                        });
                        await logger.logToFile(`会話状態保存 : ${lastMessageId}`);
                    } catch (error) {
                        await logger.errorToFile('会話状態の保存でエラーが発生', error);
                    }
                } catch (error) {
                    // Discord の文字数制限の場合
                    if (error.message.includes('Invalid Form Body')) {
                        await logger.errorToFile('Discord 文字数制限が発生', error);
                        await interaction.editReply(messenger.errorMessages('Discord 文字数制限が発生しました', error.message));
                    }
                    // その他のエラーの場合
                    else {
                        await logger.errorToFile('OpenAI API の返信でエラーが発生', error);
                        await interaction.editReply(messenger.errorMessages('OpenAI API の返信でエラーが発生しました', error.message));
                    }
                } finally {
                    // 使用トークンをロギング
                    await logger.tokenToFile(usedModel, usage);
                }
            })();
        } catch (error) {
            await logger.errorToFile('質問の取得でエラーが発生', error);
            await interaction.editReply(messenger.errorMessages('質問の取得でエラーが発生しました', error.message));
        }
    },

    async handleReply(message, OPENAI) {
        const channelId = process.env.CHAT_CHANNEL_ID.split(',');
        const openAiEmoji = process.env.OPENAI_EMOJI;

        if (!channelId.includes(message.channelId)) return;

        try {
            const previousMessageId = message.reference.messageId;
            const state = await logger.loadConversationState(previousMessageId);

            // 状態が存在しない場合は会話の継続対象外
            if (!state || !state.response_id) return;

            const previousResponseId = state.response_id;
            const request = message.content;
            const promptParam = state.promptParam || 'default';
            const prompt = promptGenerator(promptParam);

            await logger.messageUserToFile(message);

            await logger.logToFile(`指示 : ${prompt.trim()}`);
            await logger.logToFile(`質問（継続） : ${request.trim()}`);

            let rawAttachment = '';
            let attachmentContent = '';
            if (message.attachments.size > 0) {
                const attachment = message.attachments.first();
                if (attachment.contentType && attachment.contentType.startsWith('text/')) {
                    try {
                        const response = await fetch(attachment.url);
                        const arrayBuffer = await response.arrayBuffer();
                        rawAttachment = Buffer.from(arrayBuffer).toString();
                        attachmentContent = rawAttachment
                            .replace(/\r\n/g, '\n')
                            .replace(/\n{3,}/g, '\n\n')
                            .replace(/[ \t]+$/gm, '');
                    } catch (error) {
                        await logger.errorToFile('添付ファイルの取得中にエラーが発生', error);
                    }
                }
                await logger.logToFileForAttachment(rawAttachment.trim());
            }

            await message.channel.sendTyping();
            const processingMsg = await message.reply('回答を生成中…');

            (async () => {
                let usedModel = 'unknown';
                let usage = [];
                try {
                    const modelToUse = state.model || 'gpt-5.4-mini';

                    const messages = [{ role: 'system', content: prompt }];
                    const userContent = [];
                    if (attachmentContent) {
                        userContent.push({
                            type: 'input_text',
                            text: `<attachment>\n${attachmentContent}\n</attachment>`
                        });
                    }
                    userContent.push({
                        type: 'input_text',
                        text: request
                    });
                    messages.push({ role: 'user', content: userContent });

                    const reasoningEffort = attachmentContent ? 'high' : 'medium';

                    let completionParams = {
                        model: modelToUse,
                        input: messages
                    };
                    const codePrompts = ['code', 'code_analysis', 'code_review', 'log_analysis'];
                    if (promptParam === 'reasoning' || codePrompts.includes(promptParam)) {
                        completionParams.reasoning = { effort: reasoningEffort };
                    }
                    messages.push({ role: 'user', content: '【注意】回答はMarkdown形式でなければ正しく表示されません' });

                    if (previousResponseId) {
                        completionParams.previous_response_id = previousResponseId;
                    }

                    const completion = await OPENAI.responses.create(completionParams);
                    usedModel = completion.model;
                    usage = completion.usage;

                    const answer = { message: { content: completion.output_text } };
                    await logger.logToFile(`回答 : ${answer.message.content.trim()}`);

                    const splitMessages = splitAnswer(answer.message.content);
                    let lastMessageId;

                    if (splitMessages.length === 1) {
                        const replyMsg = await processingMsg.edit({
                            content: messenger.answerMessages(openAiEmoji, splitMessages[0])
                        });
                        lastMessageId = replyMsg.id;
                    } else {
                        for (let i = 0; i < splitMessages.length; i++) {
                            const msgText = splitMessages[i];
                            if (i === 0) {
                                await processingMsg.edit({
                                    content: messenger.answerFollowMessages(openAiEmoji, msgText, i + 1, splitMessages.length)
                                });
                                if (i === splitMessages.length - 1) lastMessageId = processingMsg.id;
                            } else {
                                const followMsg = await message.reply({
                                    content: messenger.answerFollowMessages(openAiEmoji, msgText, i + 1, splitMessages.length)
                                });
                                if (i === splitMessages.length - 1) lastMessageId = followMsg.id;
                            }
                        }
                    }

                    try {
                        await logger.saveConversationState(lastMessageId, {
                            response_id: completion.id,
                            promptParam: promptParam,
                            model: completion.model
                        });

                        await logger.logToFile(`会話状態保存 : ${lastMessageId}`);
                    } catch (error) {
                        await logger.errorToFile('会話状態の保存でエラーが発生', error);
                    }
                } catch (error) {
                    if (error.message.includes('Invalid Form Body')) {
                        await logger.errorToFile('Discord 文字数制限が発生', error);
                        await processingMsg.edit(messenger.errorMessages('Discord 文字数制限が発生しました', error.message));
                    } else {
                        await logger.errorToFile('OpenAI API の返信でエラーが発生', error);
                        await processingMsg.edit(messenger.errorMessages('OpenAI API の返信でエラーが発生しました', error.message));
                    }
                } finally {
                    await logger.tokenToFile(usedModel, usage);
                }
            })();
        } catch (error) {
            await logger.errorToFile('返信からの質問取得でエラーが発生', error);
        }
    }
};

function promptGenerator(prompt) {
    switch (prompt) {
        case 'question':
            return `ユーザからの「文章」に対して，あなたは専門的知見をもった教師あるいは先輩として，「指摘事項」として質問や意見を行うこと
「指摘事項」は簡潔にまとめ，列挙する`;
        case 'reasoning':
            return `ユーザが提供する全ての「内容」に対して，あなたは専門的知見をもった熟練の担当者として，最新の情報と知識を使って要望に回答すること
ただし，改行文字が脱落することがある`;
        case 'code':
            return `ユーザからの「要求」に対して，あなたは専門的知見をもった熟練のプログラマとして全ての機能を満たすソースコードを考案すること
プログラム言語についての指定は「要求」に従い，指定がなければ都度最良の言語を選択し，判断理由も合わせて回答する
ソースコードに対する解説は簡潔にまとめる
・コードの提供があった場合，「要求」以外の箇所はコメントなど含めて改変せず，元の設計思想を引き継ぐ
・コードの提示は全文を示すのではなく，必要な箇所のみを示す`;
        case 'code_analysis':
            return `ユーザが提供する「ソースコード」に対して，あなたは専門的知見をもった熟練のプログラマとしてソースコードの概要を説明すること
ただし，改行文字が脱落することがある
次の説明は必ず含めること
・プログラム内で定義されている変数はどのような物理パラメータを示すのか，を列挙する
・プログラム内で定義されている変数はプログラム内でどのような役割を持つのか，を説明する
・プログラム内で定義されている関数はどのような機能を持つのか，を説明する`;
        case 'code_review':
            return `ユーザが提供する全ての「内容」に対して，あなたは専門的知見をもった熟練のプログラマとしてソースコードをレビューすること
ただし，改行文字が脱落することがある
レビューには次の観点を必ず含めること
・推奨されなくなった実装の指摘，および修正案．例 : \`substr\` → \`substring\`
・\`if\` 条件式の簡潔化の指摘，および修正案．例 : \`if (a == 0) { ... }\` → \`if (!a) { ... }\`
・実装に至った経緯や選択されている言語などについては，正しいものとしてレビュー対象に含まない`;
        case 'log_analysis':
            return `ユーザが提供する「ログファイル」に対して，あなたは専門的知見をもった熟練のシステム担当者としてインフラストラクチャ，ミドルウェア，アプリケーションのすべての知識を使って要望に回答すること
ただし，改行文字が脱落することがある`;
        case 'document':
            return `ユーザからの「要求」に対して，要求を満たす文章を考案すること
頭語や結語は不要で，本文のみとする`;
        case 'document_summary':
            return `ユーザが提供する「文章」に対して，最も重要なポイントを箇条書きに要約すること
それぞれの要点は簡潔にまとめることが重要だが，文章の意味を変えるような要約や記述意義の欠損は避けること`;
        case 'figure':
            return `ユーザからの「要求」に対して，適切な Mermaid ダイアグラムを作成すること`;
        case 'commit':
            return `ユーザからの「変更内容」に対して，Git のコミットメッセージのヘッダ（1行目）を \`:emoji: prefix / Subject\` のテンプレートで箇条書きで 3 候補作成すること
1 行目には「変更内容」のみを英文で簡潔にまとめて，2 行目以降から箇条書きで表示する
emoji は次の中から選択してください．\`:bug:\` for Bug fixes, \`:+1:\` for Feature improvement, \`:sparkles:\` for Partial function addition, \`:tada:\` for A big feature addition to celebrate, \`:art:\` for Design change only, \`:shirt:\` for Lint error or code style fix, \`:anger:\` for Solved conflict, \`:recycle:\` for Refactoring, \`:shower:\` for Remove unused features, \`:fire:\` for Remove unnecessary features, \`:pencil2:\` for File name change, \`:file_folder:\` for File move, \`:leftwards_arrow_with_hook:\` for Undo fix, \`:construction:\` for WIP, \`:lock:\` for New feature release range restriction, \`:up:\` for Version up, \`:books:\` for Add or modify documents, \`:memo:\` for Modify comments, \`:green_heart:\` for Modify or improve tests and CI, \`:rocket:\` for Improve performance, \`:cop:\` for Improve security, \`:gear:\` for Change config
prefix は次の中から選択してください．\`fix\` for Bug fixes, \`hotfix\` for Critical bug fixes, \`update\` for Functionality fixes that are not bugs, \`change\` for Functionality fixes due to specification changes, \`add\` for Add new file, \`feat\` for Add new functionality, \`clean\` for Source code cleanup, \`refactor\` for Refactoring, \`style\` for Format fixes, \`disable\` for Disable, \`remove\` for Remove part of code, \`update\` for Functionality fixes that are not bugs, \`rename\` for Rename file, \`move\` for Move file, \`delete\` for Delete file, \`revert\` for Undo fix, \`temp\` for Temporary or work-in-progress commit, \`upgrade\` for Version up, \`docs\` for Documentation fixes, \`test\` for Add test or fix incorrect test, \`perf\` for Fixes that improve performance, \`chore\` for Add or fix build tools or libraries
Subject は英語で簡潔な 30 字程度の要約とする
入力例 : チャットのテキストをコピーする機能を追加
返答例 : **Added feature to copy chat text.**\n- \`:+1: update / Added feature to copy text of chats\`\n- \`:sparkles: feat / Add feature to copy chat text\`\n- \`:up: upgrade / Introduce text copy functionality in chat\`
同時に，ルートディレクトリを \`feature\` で固定した簡潔なブランチ名を作成する
返答例 : \`feature/chat-copy\``;
        default:
            return `ユーザからの「質問」に対して，Step-By-Step でなるべく詳細に説明すること．`;
    }
};

function splitAnswer(answer) {
    const maxLen = 1900; // Discord の文字数制限に余裕をもたせる
    let messages = [];
    let currentMessage = '';
    let inCodeBlock = false;
    let codeLanguage = '';

    const lines = answer.split('\n');
    for (const line of lines) {
        // コードブロックの開始または終了を検出
        if (line.startsWith('```')) {
            // コードブロックの開始地点
            if (!inCodeBlock) {
                inCodeBlock = true;
                codeLanguage = line.slice(3).trim();
                if (currentMessage.length + line.length > maxLen) {
                    messages.push(currentMessage.trim());
                    currentMessage = '';
                }
                currentMessage += line + '\n';
            }
            // コードブロックの終了地点
            else {
                inCodeBlock = false;
                currentMessage += line + '\n';
                if (currentMessage.length > maxLen) {
                    messages.push(currentMessage.trim());
                    currentMessage = '```' + codeLanguage + '\n';
                }
            }
        }
        // コードブロック内の処理
        else if (inCodeBlock) {
            // コードブロック内で分割する場合、閉じタグと開始タグを追加
            if (currentMessage.length + line.length > maxLen) {
                currentMessage += '```\n';
                messages.push(currentMessage.trim());
                currentMessage = '```' + codeLanguage + '\n' + line + '\n';
            } else {
                currentMessage += line + '\n';
            }
        }
        // 通常のメッセージ処理
        else {
            // 最大長を超える場合に新しいメッセージを開始
            if (currentMessage.length + line.length > maxLen) {
                messages.push(currentMessage.trim());
                currentMessage = line + '\n';
            } else {
                currentMessage += line + '\n';
            }
        }
    }

    // 残りのメッセージを追加
    if (currentMessage.length > 0) {
        messages.push(currentMessage.trim());
    }

    return messages;
};
