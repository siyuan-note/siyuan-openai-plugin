# SiYuan OpenAI Plugin

[English](README.md)

在 ChatGPT 桌面应用和 Codex 的本地会话中，使用思源内置的 `siyuan` 命令搜索、读取和编辑笔记。

## 下载与本地安装

1. 安装带有 `siyuan` 命令的思源桌面版，并在本机终端运行 `siyuan --version` 确认命令可用。
2. 下载 [本地安装 ZIP](https://github.com/siyuan-note/siyuan-openai-plugin/releases/latest/download/siyuan-openai-plugin-local.zip)，解压到一个文件夹。安装包已包含插件和本地插件来源配置。
3. 在 ChatGPT 桌面应用的 Codex 中，把刚解压的文件夹作为本地项目打开。进入插件目录，从 **SiYuan Local** 来源安装 **SiYuan**。如果列表还没显示该来源，重启桌面应用后再打开项目。参见 [OpenAI 本地插件安装指南](https://developers.openai.com/plugins/build/plugins#install-a-local-plugin-manually)。
4. 新建本地会话，选择 **SiYuan** 技能，按提示选择本次会话使用的思源工作空间。可以先尝试「帮我在思源里搜索发布清单」。

技能用 `--workspace` 指定用户选中的路径。命令按本机用户权限运行，会话中使用的搜索词和笔记内容会作为上下文交给 OpenAI。思源 CLI 的加密笔记本限制仍然适用。

[插件隐私政策](docs/privacy.md) · [插件使用条款](docs/terms.md)

## 构建

需要 Node.js 22 或更高版本。在仓库根目录运行 `npm run build`，插件文件位于 `dist/siyuan-cli`。安装插件的设备使用思源随附的 CLI。

如需生成本地安装 ZIP，请安装 Python 3 后运行 `npm run package`。安装包位于 `dist/siyuan-openai-plugin-local.zip`。

## 发布

维护者更新 `plugin/plugin.json` 的版本，并用 `npm version <版本号> --no-git-tag-version` 更新 `package.json` 和锁文件。提交并推送到 `main` 后，在该提交上创建并推送对应的签名标签。[发布工作流](.github/workflows/release.yml) 会校验版本，将 `siyuan-openai-plugin-local.zip` 打包并发布到 GitHub Releases。

## 许可证

[AGPL-3.0-or-later](LICENSE)。
