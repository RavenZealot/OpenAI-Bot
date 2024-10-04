# OpenAI-Bot

AI chat bot for Discord using OpenAI API

## Reference

- [API Reference - OpenAI API](https://platform.openai.com/docs/api-reference/introduction)
- [Overview - OpenAI API](https://platform.openai.com/docs/overview)

## Required (Only once)

- `.env` (Root directory)
  - OPENAI_ORG_ID : OpenAI [Organization ID](https://platform.openai.com/settings/organization/general)
  - OPENAI_API_KEY : OpenAI [API keys](https://platform.openai.com/organization/api-keys)
  - OPENAI_PROJECT_ID : OpenAI [Project ID](https://platform.openai.com/organization/projects)
  - BOT_TOKEN : Discord Application [Token](https://discord.com/developers/applications)
  - CHAT_CHANNEL_ID : for [Text generation](https://platform.openai.com/docs/guides/text-generation)
    Multiple designations possible
  - IMAGE_CHANNEL_ID : for [Image generation](https://platform.openai.com/docs/guides/images)
    Multiple designations possible
  - OPENAI_EMOJI : Emoji for OpenAI API
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
