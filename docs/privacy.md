# SiYuan for ChatGPT and Codex Privacy Policy

This policy covers the SiYuan desktop plugin provided by Yunnan Liandi Technology Co., Ltd. The plugin connects ChatGPT or Codex to a SiYuan workspace on your computer after you authorize it in SiYuan. For information about other SiYuan features, see the [SiYuan Privacy Policy](https://b3log.org/siyuan/en/privacy.html).

## Data used by the plugin

- **Connection information.** The local bridge stores the SiYuan loopback address, workspace CA certificate, OAuth client identifier and secret, tokens, and token expiry in a file in your user profile. It uses these details to identify your local workspace, verify its HTTPS connection, and keep your grant working. The client secret is entered in the local setup prompt. The bridge sends OAuth credentials only to the configured local SiYuan server. Keep the connection file private.
- **Conversation and workspace data.** Depending on your request and the tools you enable, tool inputs and results can include search terms, notebook and document identifiers, titles, note text, file names or contents, database records, and the data involved in a change. These may include personal data present in your prompts or notes. Data is used to answer your request and carry out the operation within the authorized workspace.
- **Support communications.** If you contact SiYuan support, we receive the information you choose to share and use it to respond to your request. Share only details necessary for support. Public issue reports are visible to others.

## Who receives the data

The bridge sends tool requests to SiYuan over HTTPS on your computer and returns results to the local ChatGPT or Codex client. OpenAI can process tool inputs and results, including note content, as part of your conversation. OpenAI handles this data under the policies and data controls that apply to your account or organization. The bridge has no SiYuan-operated telemetry or note storage service. When you use a SiYuan tool for sync or an external request, SiYuan can also send data to the service or destination you configure or select.

[OpenAI Privacy Policy](https://openai.com/policies/privacy-policy/) · [ChatGPT Data Controls](https://help.openai.com/en/articles/7730893-data-controls-faq)

## Retention and choices

- The bridge keeps connection settings locally until you replace the connection or disconnect successfully. The disconnect command revokes the grant and deletes the local connection file. You can also revoke the client directly in SiYuan and remove any remaining local connection file. The bridge keeps no separate history of tool calls or copy of note contents.
- Your workspace keeps its data according to your SiYuan storage, history, backup, and sync settings. To manage data already included in an OpenAI conversation, use the chat deletion and data controls that apply to your account or contact your organization administrator. OpenAI's retention period depends on the product, account, and settings. Revoking SiYuan access stops future requests and does not delete past conversation content.
- We retain private support correspondence for as long as needed to handle your request and meet applicable legal obligations. Public issue reports remain subject to the hosting service's retention and deletion controls.
- You can review or limit the external MCP tools in SiYuan, revoke a workspace's grant, and authorize a different workspace separately. Before asking the plugin to read or change content, consider what the conversation can receive and confirm that you have permission to share it.

For questions or privacy requests about the plugin, contact Yunnan Liandi Technology Co., Ltd. using the contact listed in the [SiYuan Privacy Policy](https://b3log.org/siyuan/en/privacy.html). For requests about data handled in your OpenAI account, use the [OpenAI Privacy Portal](https://privacy.openai.com/).
