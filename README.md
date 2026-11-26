# SiYuan OpenAI Plugin

在 ChatGPT 桌面应用和 Codex 的本地会话中连接这台电脑上运行的 [思源笔记](https://b3log.org/siyuan/)。

插件复用思源的 MCP OAuth 和 `/mcp`。用户在思源授权一个工作空间后，可使用该空间对外开放的全部 MCP 读写操作。文档、内容块、数据库、附件和同步等操作由思源内核执行，继续遵循工作空间的工具暴露配置和权限。

切换工作空间需要独立授权并开启新的本地会话。连接使用本机 HTTPS。会话中使用的笔记内容会作为模型上下文发送给 OpenAI。

## 连接思源

1. 确认当前工作空间有锁屏密码，并找到思源内核监听的本机端口和该工作空间的 `conf/ca.crt`。
2. 在思源的 AI 设置中启用 MCP 服务端 OAuth，将公开地址设为 `https://127.0.0.1:<内核端口>`。注册一个客户端，回调地址填 `http://127.0.0.1:49183/callback`。
3. 在构建好的插件目录运行下列命令，按提示输入客户端密钥，再打开终端显示的链接在思源确认授权。随后开启新的本地会话。

```sh
node server/index.cjs connect --origin https://127.0.0.1:6806 --ca "/path/to/workspace/conf/ca.crt" --client-id YOUR_CLIENT_ID
```

将端口换成当前内核的实际端口。在思源撤销该客户端，或运行 `node server/index.cjs disconnect`，可以撤销连接。[连接、凭证与验证细节](docs/local-mcp-bridge.md)

## 本地开发

使用 Node.js 22 或更高版本。在仓库根目录运行以下命令，构建产物位于 `dist/siyuan`。

```sh
npm ci
npm run build
npm test
```

提供真实思源内核和应用资源路径后，测试会启动两个独立工作空间，验证授权、工具覆盖、读写、权限变化和撤销。[真实实例验证方式](docs/local-mcp-bridge.md#真实实例验证)

## 许可证

[AGPL-3.0-or-later](LICENSE)。
