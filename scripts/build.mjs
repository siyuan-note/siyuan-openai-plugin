import {cp, mkdir} from "node:fs/promises";
import {join} from "node:path";

const output = "dist/siyuan-cli";
await mkdir(output, {recursive: true});
await cp("LICENSE", join(output, "LICENSE"));
for (const file of ["plugin.json", "assets", "skills"]) {
    await cp(join("plugin", file), join(output, file), {recursive: true});
}
