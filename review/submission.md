# SiYuan Desktop only 送审材料

## 资格申请

用提交插件的 OpenAI Platform 组织 ID 联系现有 OpenAI 对接人，申请 Local MCP submission allowlist。发布者名称以组织内已核验身份为准。组织拥有者有提交权限，其他成员需要 Apps Management Write。资格确认后，从 [插件提交入口](https://platform.openai.com/plugins) 创建 Desktop only 本地 MCP 草稿，依照官方本地流程选择 Skills only，并在初次 ZIP 中包含 `mcp.json` 和本地服务器。通过检查、提交审核并获批后，可以在后台发布。 [Desktop only 指南](https://developers.openai.com/plugins/deploy/desktop-only) · [提交与发布](https://developers.openai.com/plugins/deploy/submission)

可发给对接人的英文说明如下。发送前填入实际组织 ID 和发布主体。

> Subject: Local MCP submission access for SiYuan
>
> We are preparing an official Desktop only plugin for SiYuan. It connects to SiYuan running on the same computer via a bundled stdio MCP server. It covers SiYuan's exposed workspace read and write operations through individually named MCP tools. Users authorize a workspace in SiYuan, control its tool exposure, and can revoke access there. The workspace needs no public endpoint.
>
> Could you confirm whether our organization is eligible and enable local MCP submissions for organization [ORGANIZATION_ID]? Our publishing entity is [VERIFIED_ENTITY]. Please also confirm any desktop-specific first-submission requirements, including supported runtime and platform expectations and how to provide the test workspace and walkthrough.

## 目录材料

- 显示名 `SiYuan`，分类 `Productivity`，英语文案和参考图标已放入 `plugin.json`。用后台核验身份核对发布者名称。复用思源官网与 GitHub issue 地址。
- 现有英文隐私政策描述数据始终保存在设备上。发布前由思源确认并公开适用于插件的条款及隐私政策链接，再填入清单。可按下列披露起草专门页面或在现有政策中加入适用条款。 [思源英文隐私政策](https://b3log.org/siyuan/en/privacy.html) · [OpenAI 插件隐私要求](https://developers.openai.com/plugins/plugin-guidelines#4-privacy)
- 清单附带 5 个正向用例、3 个反向用例及发行说明，涵盖搜索、读取、新建、写入、撤销与工具设置。通用 MCP 审核要求提供视频与可复现的测试环境。向对接人确认 Desktop only 在后台的录入方式。 [审核材料要求](https://developers.openai.com/plugins/deploy/submission#3-submit-for-review)
- 发布包基于已验证版本构建，核对工作空间访问范围、支持系统、最低思源版本，以及 Node 启动策略。在验证过的平台标注提交流程的可用性。确定正式对应源码交付地址。

## 插件隐私披露草稿

This plugin connects the ChatGPT desktop app to a SiYuan workspace running on the same computer. Tool requests can include search terms, note identifiers, note content, and instructions for editing or managing workspace data. Tool responses can include document identifiers, titles, contents, and results of workspace operations. In a ChatGPT or Codex conversation, tool requests and results are handled by OpenAI under the policies and data controls that apply to that account and conversation. Features such as sync and external fetches can send data to the services configured or selected in SiYuan.

The bridge connects directly to SiYuan on this computer. It stores local connection settings and credentials and keeps no search history or separate copy of note contents. You can revoke the connection in SiYuan or run the plugin's disconnect command. Connecting another workspace requires separate authorization. Revocation stops subsequent tool requests. Use your ChatGPT account or workspace controls to manage retention of conversation content already shared with OpenAI.

[OpenAI Privacy Policy](https://openai.com/policies/privacy-policy/) · [ChatGPT Data Controls](https://help.openai.com/en/articles/7730893-data-controls-faq) · [SiYuan support](https://github.com/siyuan-note/siyuan/issues)

## 桌面审核操作

用两个隔离的思源工作空间导入 `fixtures.json` 中的合成笔记，根据 workspace 和 notebook 字段放入对应位置。真实环境应记录实际文档 ID，若与清单的示例 ID 不同，提交前替换测试 prompt。只授权 review 工作空间。完成接入后，用干净的 ChatGPT 桌面环境依次验证清单中的场景。

录屏建议依次展示安装、授权当前工作空间、搜索 cobalt launch、读取原文、创建文档、追加并读回内容。再展示工具禁用、另一工作空间读取失败，以及撤销后查询失败。切换后独立授权新工作空间，确认只返回该空间的结果。上传对审核员可访问的录像，按平台指引提供可重复安装的思源构建、示例数据和环境说明。

## 当前状态

已在 Windows 用两个真实思源工作空间验证授权、工具清单、文档与内容块读写、暴露配置、工作空间隔离和撤销。目录提交资格、适用的公开政策、发布用干净桌面安装、视频 URL 和后台审核仍待完成。
