# GPT-Bot

GPT Bot for Discord using OpenAI API

## Reference

- [API Reference - OpenAI API](https://platform.openai.com/docs/api-reference/introduction)
- [Introduction - OpenAI API](https://platform.openai.com/docs/introduction)

## Required (Only once)

- `.env` (Root directory)
  - OPENAI_ORG_ID : OpenAI [Organization ID](https://platform.openai.com/account/organization)
  - OPENAI_API_KEY : OpenAI [API keys](https://platform.openai.com/account/api-keys)
  - DEEPL_API_KEY : Deepl [API keys](https://www.deepl.com/ja/your-account/keys)
  - BOT_TOKEN : Discord Application [Token](https://discord.com/developers/applications)
  - CHAT_CHANNEL_ID : for [Chat completions](https://platform.openai.com/docs/guides/chat/introduction)
    Multiple designations possible
  - IMAGE_CHANNEL_ID : for [Image generation](https://platform.openai.com/docs/guides/images/language-specific-tips)
    Multiple designations possible
  - OPENAI_EMOJI : Emoji for OpenAI API
  - DEEPL_EMOJI : Emoji for Deepl API
- Discord Application Generated URL

## Run

```shell-session
$ node bot/index.js
```

## Requests for developer (Optional)

In VS Code

1. Use [`Commit Message Editor`](https://marketplace.visualstudio.com/items?itemName=adam-bender.commit-message-editor) extention
   - Import `comit_template.json`
   - Use `Commit Message Editor` for messages when creating commits.
