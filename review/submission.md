# SiYuan Desktop only 送审材料

## 资格申请

用提交插件的 OpenAI Platform 组织 ID 联系现有 OpenAI 对接人，申请 Local MCP submission allowlist。发布者名称以组织内已核验身份为准。组织拥有者有提交权限，其他成员需要 Apps Management Write。资格确认后，从 [插件提交入口](https://platform.openai.com/plugins) 创建 Desktop only 本地 MCP 草稿，依照官方本地流程选择 Skills only，并在初次 ZIP 中包含 `mcp.json` 和本地服务器。通过检查、提交审核并获批后，可以在后台发布。 [Desktop only 指南](https://developers.openai.com/plugins/deploy/desktop-only) · [提交与发布](https://developers.openai.com/plugins/deploy/submission)

可发给对接人的英文说明如下。发送前填入实际组织 ID 和发布主体。

> Subject: Local MCP submission access for SiYuan
>
> We are preparing an official Desktop only plugin for SiYuan. It connects to SiYuan running on the same computer via a bundled stdio MCP server. The planned release covers SiYuan's workspace read and write operations through individually defined MCP tools. Users authorize a workspace in SiYuan, control its tool exposure, and can revoke access there. The workspace needs no public endpoint.
>
> Could you confirm whether our organization is eligible and enable local MCP submissions for organization [ORGANIZATION_ID]? Our publishing entity is [VERIFIED_ENTITY]. Please also confirm any desktop-specific first-submission requirements, including supported runtime and platform expectations and how to provide the test workspace and walkthrough.

## 目录材料

- 显示名 `SiYuan`，分类 `Productivity`，英语文案和参考图标已放入 `plugin.json`。用后台核验身份核对发布者名称。复用思源官网与 GitHub issue 地址。
- 现有英文隐私政策描述数据始终保存在设备上。发布前由思源确认并公开适用于插件的条款及隐私政策链接，再填入清单。可按下列披露起草专门页面或在现有政策中加入适用条款。 [思源英文隐私政策](https://b3log.org/siyuan/en/privacy.html) · [OpenAI 插件隐私要求](https://developers.openai.com/plugins/plugin-guidelines#4-privacy)
- 当前验证包的清单附带 5 个正向用例、3 个反向用例及发行说明。正式包覆盖全部对外工作空间读写能力时，替换当前清单文案并增加有代表性的写入、撤销和权限验收。通用 MCP 审核要求提供视频与可复现的测试环境。向对接人确认 Desktop only 在后台的录入方式。 [审核材料要求](https://developers.openai.com/plugins/deploy/submission#3-submit-for-review)
- 发布包基于已验证版本构建，核对工作空间访问范围、支持系统、最低思源版本，以及 Node 启动策略。在验证过的平台标注提交流程的可用性。确定正式对应源码交付地址。

## 插件隐私披露草稿

This plugin connects the ChatGPT desktop app to a SiYuan workspace running on the same computer. The plugin uses your search terms or selected note ID to request information from the workspace you authorize in SiYuan. Tool responses can include note IDs, titles, source links, and excerpts. When used in a ChatGPT or Codex conversation, the request and resulting notes context are handled by OpenAI under the policies and data controls that apply to that account and conversation.

The plugin does not use a SiYuan-operated relay for note lookups. The bridge does not keep a search history or store note excerpts. The local connection settings persist until you disconnect or remove the connection. You can authorize the current workspace and revoke the connection in SiYuan. Connecting another workspace requires separate authorization. Revocation stops subsequent reads. Manage previously shared excerpts and conversation retention using your ChatGPT account or workspace controls.

[OpenAI Privacy Policy](https://openai.com/policies/privacy-policy/) · [ChatGPT Data Controls](https://help.openai.com/en/articles/7730893-data-controls-faq) · [SiYuan support](https://github.com/siyuan-note/siyuan/issues)

## 桌面审核操作

用两个隔离的思源工作空间导入 `fixtures.json` 中的合成笔记，根据 workspace 和 notebook 字段放入对应位置。真实环境应记录实际文档 ID，若与清单的示例 ID 不同，提交前替换测试 prompt。只授权 review 工作空间。完成接入后，用干净的 ChatGPT 桌面环境依次验证清单中的场景。

录屏建议依次展示安装、授权当前工作空间、搜索 cobalt launch 并返回来自两个笔记本的结果、点击思源链接、读取长文并提示截断、根据 ID 读取另一个工作空间的笔记失败，以及撤销后查询失败。切换工作空间后，用切换前的凭证确认访问被拒绝；独立授权新工作空间后，确认仅返回该空间的结果。另需覆盖已支持的桌面系统，以及无思源进程、端口变更、重启和加密笔记本锁定。上传对审核员可访问的录像，按平台指引提供可重复安装的思源构建、示例数据和最少的环境说明。

## 当前状态

Windows 上用合成服务自动检查本地桥接，覆盖工具清单、同一工作空间内跨笔记本搜索、摘录、工作空间隔离、撤销、限制响应和 TLS。思源端正式配对、工作空间隔离和撤销由实际应用实现后，才能进行干净桌面的端到端验收。提交资格、核验后的发布主体、公开政策、正式桌面运行环境验证、视频 URL 和审核后台检查仍待完成。验证 ZIP 可用于检查包结构和运行方式。
