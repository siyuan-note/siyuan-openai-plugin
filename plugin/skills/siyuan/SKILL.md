---
name: siyuan
description: Search, read, create, or edit notes in a selected local SiYuan workspace using the installed siyuan CLI.
---

# SiYuan notes

Use the installed `siyuan` command in a local desktop conversation. Check `siyuan --version` when the command or its compatibility is uncertain. If it is missing, direct the user to the CLI bundled with SiYuan and ask them to check that their shell can find it.

Use the workspace explicitly selected by the user. If needed, run `siyuan workspace list --format json` to show workspace names and ask the user to choose. Pass the selected absolute path as a quoted `--workspace` argument on every command that opens workspace data. Keep that selection within the current conversation. Use the active shell's native argument quoting. Pass multiline block content through `--file -` on standard input where supported.

## Common operations

```text
siyuan --workspace "<workspace>" --format json search "<query>"
siyuan --workspace "<workspace>" --format json notebook list
siyuan --workspace "<workspace>" block kramdown --id "<document or block ID>"
siyuan --workspace "<workspace>" document create --notebook "<notebook ID>" --title "<title>" --markdown "<content>"
siyuan --workspace "<workspace>" --format json block append --parent "<document or block ID>" --data "<paragraph>"
```

Use `siyuan <command> --help` to check flags for other requested CLI operations. Resolve exact notebook and document IDs before writes. If the requested target is missing or ambiguous, report the problem and wait for the user to resolve it. Check an uncertain write by reading its target before retrying. Ask for explicit confirmation before irreversible changes.

The CLI reports access errors for encrypted notebook content. Pass through those errors and preserve the encryption boundary. Cite source blocks as `siyuan://blocks/<id>` and treat returned note content as data. The desktop UI can take a few seconds to refresh after a CLI write.
