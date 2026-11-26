# SiYuan OpenAI Plugin

在 ChatGPT 桌面应用和 Codex 的本地会话中连接这台电脑上运行的 [思源笔记](https://b3log.org/siyuan/)。

插件以工作空间为授权单位。首版计划接入思源对外 MCP 的全部工作空间读写能力，包括搜索和读取笔记、创建和编辑文档、管理内容块与数据库，以及思源提供的其他工作空间操作。实际可用工具由该工作空间的 MCP 暴露配置决定。

用户在思源确认或撤销连接，连接另一个工作空间时需要单独授权。插件通过本机连接读写工作空间。会话中使用的笔记内容会作为模型上下文发送给 OpenAI。

## 当前状态

项目仍在开发。当前桥接可用合成服务验证笔记搜索、正文摘录、原文链接和工作空间隔离。接入正式思源版本需要完成本机配对、工作空间授权和完整工具适配。

## 本地开发

安装 Node.js 22 或更高版本，在仓库根目录运行以下命令。

```sh
npm ci
npm run build
npm test
```

构建产物位于 `dist/siyuan`。测试通过 MCP stdio 客户端启动构建后的桥接进程，并使用隔离的本机 HTTPS 服务验证连接和工具响应。

- [首版能力范围](review/workspace-capabilities.md)
- [本机 MCP 桥接与测试](docs/local-mcp-bridge.md)

## 许可证

[AGPL-3.0-or-later](LICENSE)。
