# SiYuan OpenAI Plugin

在 ChatGPT 桌面应用和 Codex 的本地会话中，使用思源内置的 `siyuan` 命令搜索、读取和编辑笔记。

## 使用

1. 安装提供 `siyuan` 命令的思源桌面版本，确认本机终端运行 `siyuan --version` 有输出。
2. 安装插件后新建本地会话，选择 SiYuan 技能。首次使用时选择本次会话要访问的工作空间。
3. 用自然语言提出你的请求，例如搜索发布清单，或在某个笔记本创建会议笔记。

技能用 `--workspace` 指定用户选中的路径。命令按本机用户权限运行，会话中使用的搜索词和笔记内容会作为上下文交给 OpenAI。思源 CLI 的加密笔记本限制仍然适用。

[插件隐私政策](docs/privacy.md) · [插件使用条款](docs/terms.md)

## 构建

需要 Node.js 22 或更高版本。在仓库根目录运行 `npm run build`，插件文件位于 `dist/siyuan-cli`。安装插件的设备使用思源随附的 CLI。

## 许可证

[AGPL-3.0-or-later](LICENSE)。
