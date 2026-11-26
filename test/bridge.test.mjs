import assert from "node:assert/strict";
import {randomBytes} from "node:crypto";
import {once} from "node:events";
import {mkdtemp, mkdir, readFile, rm, writeFile} from "node:fs/promises";
import {createServer} from "node:https";
import {tmpdir} from "node:os";
import {join, resolve} from "node:path";
import {test} from "node:test";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
import {generate} from "selfsigned";

const fixture = JSON.parse(await readFile(new URL("../review/fixtures.json", import.meta.url), "utf8"));
const certificateOptions = {
    extensions: [
        {name: "basicConstraints", cA: true},
        {name: "subjectAltName", altNames: [{type: 7, ip: "127.0.0.1"}]}
    ]
};

test("packaged stdio server and local connection", async (suite) => {
    const token = "sy_desktop_" + randomBytes(32).toString("base64url");
    const home = await mkdtemp(join(tmpdir(), "siyuan-openai-test-"));
    suite.after(() => rm(home, {recursive: true, force: true}));
    const connectionDir = join(home, ".siyuan-desktop-plugin");
    await mkdir(connectionDir, {mode: 0o700});
    const connection = join(connectionDir, "connection.json");
    const certificate = await generate([{name: "commonName", value: "SiYuan test instance"}], certificateOptions);
    const initialGrant = {workspace: fixture.authorized_workspace, token};
    let grant = initialGrant;
    let activeWorkspace = initialGrant.workspace;
    let mode = "normal";
    let requestCount = 0;
    const backend = createServer({key: certificate.private, cert: certificate.cert}, async (req, res) => {
        requestCount += 1;
        const chunks = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const params = JSON.parse(Buffer.concat(chunks));
        res.setHeader("Content-Type", "application/json");
        assert.equal(req.method, "POST");
        if (mode === "revoked" || grant.workspace !== activeWorkspace || req.headers.authorization !== `Bearer ${grant.token}`) {
            res.writeHead(401).end(JSON.stringify({error: token}));
            return;
        }
        if (mode === "redirect") {
            res.writeHead(302, {Location: "/unexpected"}).end();
            return;
        }
        if (mode === "oversize") {
            res.end(" ".repeat(140 * 1024));
            return;
        }
        const workspaceNotes = fixture.notes.filter(note => note.workspace === activeWorkspace);
        let data;
        if (req.url === "/api/desktopNotes/search") {
            assert.deepEqual(Object.keys(params).sort(), ["limit", "query"]);
            data = {matches: workspaceNotes
                .filter(note => note.text.toLowerCase().includes(params.query.toLowerCase()))
                .slice(0, params.limit)
                .map(note => ({note_id: note.note_id, title: note.title, excerpt: note.text.slice(0, 800)}))};
        } else if (req.url === "/api/desktopNotes/read") {
            assert.deepEqual(Object.keys(params), ["note_id"]);
            const note = workspaceNotes.find(note => note.note_id === params.note_id);
            if (!note) {
                res.writeHead(404).end(JSON.stringify({error: "private or unknown"}));
                return;
            }
            data = {
                note_id: mode === "wrong-id" ? workspaceNotes[0].note_id : note.note_id,
                title: note.title,
                excerpt: note.text.slice(0, 12000),
                truncated: note.text.length > 12000
            };
        } else {
            res.writeHead(404).end();
            return;
        }
        res.end(JSON.stringify({code: 0, msg: "", data}));
    });
    backend.listen(0, "127.0.0.1");
    await once(backend, "listening");
    suite.after(() => new Promise(resolve => backend.close(resolve)));
    const port = backend.address().port;
    const configure = (cert = certificate.cert, credential = token) =>
        writeFile(connection, JSON.stringify({port, token: credential, certificate: cert}), {mode: 0o600});
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [resolve("dist/siyuan/server/index.cjs")],
        env: {...process.env, HOME: home, USERPROFILE: home},
        stderr: "pipe"
    });
    const client = new Client({name: "siyuan-submission-test", version: "1.0.0"});
    await client.connect(transport);
    suite.after(() => client.close());
    const search = (query, limit) => client.callTool({name: "search_notes", arguments: {query, limit}});
    const read = (note_id) => client.callTool({name: "read_note", arguments: {note_id}});

    await suite.test("lists only two read-only tools and requires local consent", async () => {
        const {tools} = await client.listTools();
        assert.deepEqual(tools.map(tool => tool.name), ["search_notes", "read_note"]);
        for (const tool of tools) {
            assert.deepEqual(tool.annotations, {readOnlyHint: true, destructiveHint: false, openWorldHint: false});
            assert.ok(tool.outputSchema);
        }
        assert.match((await search("cobalt launch")).content[0].text, /connect/i);
        assert.equal(requestCount, 0);
    });

    await configure();

    await suite.test("searches across notebooks in the authorized workspace and returns source links", async () => {
        const result = await search("cobalt launch", 3);
        assert.deepEqual(result.structuredContent.matches.map(note => note.source_url), [
            "siyuan://blocks/20270115100000-lnch001",
            "siyuan://blocks/20270115100000-meet001"
        ]);
        assert.equal((await search("cobalt launch", 1)).structuredContent.matches.length, 1);
        assert.deepEqual((await search("amber satellite")).structuredContent, {matches: []});
        assert.deepEqual((await search("other workspace phrase")).structuredContent, {matches: []});
    });

    await suite.test("reads an exact ID and reports bounded excerpts", async () => {
        assert.match((await read("20270115100000-meet001")).structuredContent.excerpt, /Lin/);
        const longNote = (await read("20270115100000-long001")).structuredContent;
        assert.equal(longNote.excerpt.length, 12000);
        assert.equal(longNote.truncated, true);
    });

    await suite.test("rejects notes from another workspace or unknown IDs without disclosing details", async () => {
        const privateNote = await read("20270115100000-priv001");
        const unknown = await read("20270115100000-none001");
        assert.equal(privateNote.isError, true);
        assert.deepEqual(privateNote, unknown);
        assert.match(privateNote.content[0].text, /unavailable/);
    });

    await suite.test("rejects invalid arguments and unregistered deletion without a backend call", async () => {
        const before = requestCount;
        assert.equal((await search("cobalt launch", 200)).isError, true);
        assert.equal((await client.callTool({
            name: "search_notes",
            arguments: {query: "cobalt launch", workspace_id: "other"}
        })).isError, true);
        assert.equal((await read("../private.txt")).isError, true);
        assert.equal((await client.callTool({name: "delete_note", arguments: {}})).isError, true);
        assert.equal(requestCount, before);
    });

    await suite.test("requires a separate grant after switching the workspace", async () => {
        activeWorkspace = "other";
        try {
            const denied = await search("cobalt launch");
            assert.equal(denied.isError, true);
            assert.match(denied.content[0].text, /reconnect/i);

            grant = {workspace: activeWorkspace, token: "sy_desktop_" + randomBytes(32).toString("base64url")};
            await configure(certificate.cert, grant.token);
            const result = await search("cobalt launch");
            assert.deepEqual(result.structuredContent.matches.map(note => note.note_id), ["20270115100000-priv001"]);
        } finally {
            activeWorkspace = initialGrant.workspace;
            grant = initialGrant;
            await configure();
        }
    });

    await suite.test("rejects revoked access, redirects, unexpected note IDs and oversized responses", async () => {
        mode = "revoked";
        const denied = await search("cobalt launch");
        assert.equal(denied.isError, true);
        assert.ok(!JSON.stringify(denied).includes(token));
        mode = "redirect";
        assert.equal((await search("cobalt launch")).isError, true);
        mode = "wrong-id";
        assert.equal((await read("20270115100000-meet001")).isError, true);
        mode = "oversize";
        assert.equal((await search("cobalt launch")).isError, true);
        mode = "normal";
    });

    await suite.test("does not send a query or token to a server with an untrusted certificate", async () => {
        const other = await generate([{name: "commonName", value: "Other instance"}], certificateOptions);
        await configure(other.cert);
        const before = requestCount;
        assert.equal((await search("cobalt launch")).isError, true);
        assert.equal(requestCount, before);
        await configure();
    });
});
