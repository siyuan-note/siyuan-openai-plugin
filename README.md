# SiYuan OpenAI Plugin

[简体中文](README.zh-CN.md)

Search, read, and edit notes in a local SiYuan workspace from the ChatGPT desktop app or Codex using the built-in `siyuan` CLI.

## Download and install locally

1. Install a version of SiYuan desktop that includes the `siyuan` CLI. Run `siyuan --version` in your terminal to verify that the command is available.
2. Download the [local installation ZIP](https://github.com/siyuan-note/siyuan-openai-plugin/releases/latest/download/siyuan-openai-plugin-local.zip) and extract it to a folder. The ZIP includes both the plugin and its local marketplace configuration.
3. In Codex in the ChatGPT desktop app, open the extracted folder as a local project. In the plugin directory, choose the **SiYuan Local** source and install **SiYuan**. If the source does not appear, restart the desktop app and reopen the project. See the [OpenAI local plugin installation guide](https://developers.openai.com/plugins/build/plugins#install-a-local-plugin-manually).
4. Start a new local conversation, select the **SiYuan** skill, and choose the SiYuan workspace to use when prompted. Try asking, “Find my SiYuan notes about the launch checklist.”

The skill passes the selected path to the CLI with `--workspace`. Commands run with the local user's permissions. OpenAI receives the search terms and note content used in the conversation as context. The SiYuan CLI's restrictions on encrypted notebooks apply.

[Plugin privacy policy](docs/privacy.md) · [Plugin terms of service](docs/terms.md)

## Build

Use Node.js 22 or later. Run `npm run build` from the repository root to assemble the plugin in `dist/siyuan-cli`. The installed plugin uses the CLI bundled with SiYuan.

To create the local installation ZIP, install Python 3 and run `npm run package`. The ZIP is written to `dist/siyuan-openai-plugin-local.zip`.

## Release

Update the version in `plugin/plugin.json` and run `npm version <version> --no-git-tag-version` to update `package.json` and the lockfile. Commit and push to `main`, then create and push a matching signed tag on that commit. The [release workflow](.github/workflows/release.yml) checks the version, builds `siyuan-openai-plugin-local.zip`, and publishes it to GitHub Releases.

## License

[AGPL-3.0-or-later](LICENSE).
