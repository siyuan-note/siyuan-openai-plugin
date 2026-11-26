import {build} from "esbuild";
import {cp, mkdir, readFile, readdir, writeFile} from "node:fs/promises";
import {join, resolve} from "node:path";

const output = "dist/siyuan";
await mkdir(join(output, "server"), {recursive: true});
for (const file of ["plugin.json", "mcp.json", "assets"]) {
    await cp(join("plugin", file), join(output, file), {recursive: true});
}
await cp("LICENSE", join(output, "LICENSE"));
const result = await build({
    absWorkingDir: process.cwd(),
    entryPoints: ["src/index.mjs"],
    outfile: join(output, "server", "index.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node22",
    legalComments: "linked",
    metafile: true
});
const packageRoots = new Set();
for (const path of Object.keys(result.metafile.inputs)) {
    const components = resolve(path).split(/[\\/]/);
    const modulesIndex = components.lastIndexOf("node_modules");
    if (modulesIndex < 0) {
        continue;
    }
    const nameLength = components[modulesIndex + 1].startsWith("@") ? 2 : 1;
    packageRoots.add(components.slice(0, modulesIndex + 1 + nameLength).join("/"));
}

const notices = [];
for (const folder of [...packageRoots].sort()) {
    const {name, version, license} = JSON.parse(await readFile(join(folder, "package.json"), "utf8"));
    const files = (await readdir(folder, {withFileTypes: true}))
        .filter(entry => entry.isFile() && /^(?:licen[cs]e|copying|notice)(?:[.-].*)?$/i.test(entry.name));
    if (files.length === 0) {
        throw new Error(`Missing license text for ${name}@${version}`);
    }
    notices.push(`${name}@${version} (${license})`);
    for (const file of files) {
        notices.push(await readFile(join(folder, file.name), "utf8"));
    }
}
await writeFile(join(output, "THIRD-PARTY-NOTICES.txt"), notices.join("\n\n"));
