from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parents[1]
output = root / "dist" / "siyuan-openai-plugin-local.zip"
marketplace = ".agents/plugins/marketplace.json"
plugin = root / "plugin"

output.parent.mkdir(exist_ok=True)
with ZipFile(output, "w", compression=ZIP_DEFLATED) as archive:
    archive.write(root / marketplace, marketplace)
    archive.write(root / "LICENSE", "plugin/LICENSE")
    for path in sorted(plugin.rglob("*")):
        if path.is_file():
            archive.write(path, path.relative_to(root).as_posix())

print(output.relative_to(root).as_posix())
