# SiYuan 桌面技能送审准备

## 提交路径

当前候选版为 `0.2.0`，通过本地会话及思源内置 CLI 运行。插件 ZIP 包含便携版清单、SiYuan 技能和图标。清单设置了 `extensions.com.openai.requires_local_executor`。

用实际提交的 OpenAI Platform 组织核对发布者身份与纯技能桌面标记的使用资格。当前已看到 `Personal` 组织。官方标准流程要求核对发布人身份，若后台拒绝桌面标记，按桌面插件指南向 OpenAI 确认该组织的提交权限。 [桌面插件指南](https://developers.openai.com/plugins/deploy/desktop-only#plugins-without-an-mcp-server) · [标准提交流程](https://developers.openai.com/plugins/deploy/submission)

## 目录与演示

- 以提供 `siyuan` 命令的思源桌面版为使用前提。在本地会话显式选择一个工作空间，在该空间内读写普通笔记。
- 清单使用现行版本的公开文档。 [隐私政策](https://github.com/siyuan-note/siyuan-openai-plugin/blob/main/docs/privacy.md) · [使用条款](https://github.com/siyuan-note/siyuan-openai-plugin/blob/main/docs/terms.md)
- 使用 [合成笔记](fixtures.json)和[桌面录屏分镜](desktop-recording.md)录制实际操作。桌面界面实录待完成。

## Windows 验证

2026-11-26 使用安装版的 `siyuan 3.9.0-alpha.2`，在独立的合成工作空间实测创建笔记本和文档、全文搜索、追加、读回及拒绝追加到不存在的目标。也在同一合成空间启动真实的思源内核，验证内核刷新后可见 CLI 写入，CLI 可见随后通过内核写入的内容，且两次写入均被保留。

这一验证覆盖交替读写。桌面应用随附的运行时已在隔离配置中安装该 ZIP，并发现其中的 SiYuan 技能。

同日将 Windows ChatGPT 桌面端的测试安装更新到 `0.2.0`，并在 Codex 本地会话中选中 SiYuan 技能，用一个合成工作空间验证了以下操作。会话记录显示命令均显式指定了测试工作空间和独立配置目录。

- 全文搜索 `cobalt launch`，返回 Launch Checklist 和思源来源链接。
- 使用 Kramdown 读取原文，返回上线日期 2027 年 2 月 12 日。
- 在 Planning 新建 CLI Acceptance Notes，独立核对文档 ID 和首段正文。
- 追加一句话并读回两段正文，独立确认首段完整保留。
- 对不存在的文档 ID 发出追加请求。CLI 查找返回 `tree not found`，会话停止写入。独立比对拒写前后的文档列表、实际时间戳和两篇笔记正文。

当前插件 ZIP 的 SHA-256 为 `4b5187ff1aa168441178b080f673d0de8f39688a06528b4f40f8f7b7516f8d68`。桌面验收后，包内清单补齐了公开的隐私政策与使用条款链接。已核对技能、图标和许可证的文件内容。
