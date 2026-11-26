import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {randomBytes} from "node:crypto";
import {once} from "node:events";
import {mkdir, mkdtemp, readFile, rm, writeFile} from "node:fs/promises";
import {createServer} from "node:net";
import {tmpdir} from "node:os";
import {dirname, join, resolve} from "node:path";
import {test} from "node:test";
import {setTimeout as delay} from "node:timers/promises";
import {Client} from "@modelcontextprotocol/sdk/client/index.js";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
import {StreamableHTTPClientTransport} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import {createLocalFetch} from "../src/connection.mjs";

const kernel = process.env.SIYUAN_TEST_KERNEL;
const app = process.env.SIYUAN_TEST_APP;
const entry = resolve("dist/siyuan/server/index.cjs");
const idPattern = /\b[0-9]{14}-[a-z0-9]{7}\b/;

async function waitFor(probe, child, label, timeout = 45000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
        if (child.exitCode !== null || child.signalCode !== null) {
            assert.fail(label + " exited early with code " + child.exitCode);
        }
        try {
            const value = await probe();
            if (value) return value;
        } catch {
            // 启动期间证书与端口文件可能先于 API 就绪。
        }
        await delay(125);
    }
    assert.fail("Timed out waiting for " + label);
}

async function stop(child) {
    if (child.exitCode === null && child.signalCode === null) {
        const exited = once(child, "exit");
        child.kill();
        await exited;
    }
}

async function api(workspace, path, data, cookie) {
    return workspace.fetch(path, {
        method: "POST",
        headers: {"Content-Type": "application/json", Origin: workspace.origin, ...(cookie && {Cookie: cookie})},
        body: JSON.stringify(data),
        signal: AbortSignal.timeout(5000)
    });
}

function cookies(response) {
    return response.headers.getSetCookie().map(value => value.split(";", 1)[0]).join("; ");
}

async function startWorkspace(root, name, children) {
    const workspace = join(root, name);
    const home = join(root, name + "-home");
    await mkdir(workspace);
    await mkdir(home);
    const authCode = randomBytes(20).toString("hex");
    const child = spawn(resolve(kernel), ["serve", "--home-dir", home, "--workspace", workspace, "--wd", resolve(app),
        "--ssl", "--port", "0", "--fixed-port=false", "--lang", "en_US"], {
        cwd: root,
        windowsHide: true,
        env: {...process.env, SIYUAN_ACCESS_AUTH_CODE: authCode, SIYUAN_ACCESS_AUTH_CODE_BYPASS: "false"},
        stdio: ["ignore", "pipe", "pipe"]
    });
    children.push(child);
    child.stdout.resume();
    child.stderr.resume();
    const caPath = join(workspace, "conf", "ca.crt");
    const active = await waitFor(async () => {
        const port = JSON.parse(await readFile(join(home, ".config", "siyuan", "port.json"), "utf8"))[child.pid];
        if (!/^[0-9]+$/.test(port ?? "")) return null;
        const origin = "https://127.0.0.1:" + port;
        const ca = await readFile(caPath, "utf8");
        const fetch = createLocalFetch(origin, ca);
        const response = await fetch("/api/system/bootProgress", {signal: AbortSignal.timeout(1500)});
        if ((await response.json()).data?.progress !== 100) return null;
        return {origin, ca, caPath, fetch, child};
    }, child, "SiYuan " + name);
    const login = await api(active, "/api/system/loginAuth", {authCode});
    assert.equal((await login.json()).code, 0, "SiYuan workspace administrator login");
    active.cookie = cookies(login);
    assert.ok(active.cookie, "SiYuan returned a session cookie");
    active.admin = async (path, data) => {
        const response = await api(active, path, data, active.cookie);
        const result = await response.json();
        assert.equal(result.code, 0, "SiYuan administrator API " + path);
        return result.data;
    };
    await active.admin("/api/mcp/setOAuth", {enabled: true, publicURL: active.origin});
    return active;
}

async function callbackPort() {
    const socket = createServer();
    socket.listen(0, "127.0.0.1");
    await once(socket, "listening");
    const {port} = socket.address();
    await new Promise(resolve => socket.close(resolve));
    return port;
}

async function connectWorkspace(workspace, environment, children) {
    const port = await callbackPort();
    const redirectURI = "http://127.0.0.1:" + port + "/callback";
    const registration = await workspace.admin("/api/mcp/addOAuthClient", {name: "OpenAI integration test", redirectURI});
    const child = spawn(process.execPath, [entry, "connect", "--origin", workspace.origin, "--ca", workspace.caPath,
        "--client-id", registration.id, "--callback-port", String(port)],
        {env: environment, windowsHide: true, stdio: ["pipe", "pipe", "pipe"]});
    children.push(child);
    const exited = once(child, "exit");
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", text => { stdout += text; });
    child.stderr.setEncoding("utf8").on("data", text => { stderr += text; });
    await waitFor(() => stderr.includes("client secret:"), child, "OAuth client prompt", 10000);
    child.stdin.end(registration.secret + "\n");
    const address = await waitFor(() => stdout.match(/^https:\/\/[^\r\n]+$/m)?.[0], child, "OAuth authorization URL", 10000);
    const authorization = await workspace.fetch(address, {headers: {Cookie: workspace.cookie}});
    assert.equal(authorization.status, 200);
    const html = await authorization.text();
    const ticket = html.match(/name="ticket" value="([^"]+)"/)?.[1];
    assert.ok(ticket, "SiYuan displayed the OAuth consent form");
    const badCallback = await fetch(redirectURI + "?state=wrong&code=wrong");
    assert.equal(badCallback.status, 400);
    const consent = await workspace.fetch("/oauth/mcp/consent", {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded", Origin: workspace.origin,
            Cookie: workspace.cookie + "; " + cookies(authorization)},
        body: new URLSearchParams({ticket, decision: "approve"}).toString()
    });
    assert.equal(consent.status, 302);
    const returned = new URL(consent.headers.get("location"));
    assert.equal(returned.origin + returned.pathname, redirectURI);
    const wrongIssuer = new URL(returned);
    wrongIssuer.searchParams.set("iss", "https://127.0.0.1:1");
    assert.equal((await fetch(wrongIssuer)).status, 400);
    const callback = await fetch(returned);
    assert.equal(callback.status, 200);
    await callback.text();
    const [status] = await exited;
    assert.equal(status, 0, stderr);
    assert.match(stdout, /workspace connected/);
    return registration.id;
}

async function bridge(environment) {
    const client = new Client({name: "real-siyuan-validation", version: "1"});
    await client.connect(new StdioClientTransport({
        command: process.execPath, args: [entry], env: environment, stderr: "pipe"
    }));
    return client;
}

async function upstreamTools(workspace, token) {
    const client = new Client({name: "direct-siyuan-validation", version: "1"});
    const transport = new StreamableHTTPClientTransport(new URL("/mcp", workspace.origin), {
        requestInit: {headers: {Authorization: "Bearer " + token}}, fetch: workspace.fetch
    });
    try {
        await client.connect(transport);
        const tools = [];
        let cursor;
        do {
            const page = await client.listTools({cursor});
            tools.push(...page.tools);
            cursor = page.nextCursor;
        } while (cursor);
        return tools;
    } finally {
        if (transport.sessionId) await transport.terminateSession().catch(() => {});
        await client.close();
    }
}

function call(client, name, args = {}) {
    return client.callTool({name, arguments: args});
}

async function text(client, name, args) {
    const result = await call(client, name, args);
    const content = result.content.map(item => item.text ?? "").join("\n");
    assert.ok(!result.isError, name + ": " + content);
    return content;
}

test("real SiYuan workspace OAuth and MCP tools", {skip: !(kernel && app), timeout: 180000}, async suite => {
    const parent = resolve(process.env.SIYUAN_TEST_ROOT ?? tmpdir());
    const root = await mkdtemp(join(parent, "siyuan-openai-validation-"));
    assert.equal(dirname(root), parent);
    const children = [];
    const clients = [];
    suite.after(async () => {
        await Promise.all(clients.map(client => client.close()));
        await Promise.all(children.map(stop));
        await rm(root, {recursive: true, force: true, maxRetries: 6, retryDelay: 250});
    });
    const config = join(root, "plugin-profile");
    const connectionPath = join(config, "connection.json");
    const environment = {...process.env, SIYUAN_OPENAI_CONFIG_DIR: config};
    const readConnection = async () => JSON.parse(await readFile(connectionPath, "utf8"));
    const first = await startWorkspace(root, "workspace-a", children);
    const current = await bridge(environment);
    clients.push(current);
    await assert.rejects(current.listTools(), /connect/i);
    const firstClient = await connectWorkspace(first, environment, children);
    const connected = await readConnection();
    const direct = await upstreamTools(first, connected.accessToken);
    const projected = (await current.listTools()).tools;
    const names = direct.flatMap(tool => tool.inputSchema.properties?.action?.enum?.map(action => tool.name + "__" + action) ?? [tool.name]);
    assert.ok(direct.length >= 25 && names.length >= 150, "Expected the real SiYuan capability catalogue");
    assert.deepEqual(projected.map(tool => tool.name).sort(), names.sort());
    const projectedByName = new Map(projected.map(tool => [tool.name, tool]));
    for (const original of direct) {
        const actions = original.inputSchema.properties?.action?.enum;
        for (const action of actions ?? [null]) {
            const name = action ? original.name + "__" + action : original.name;
            const adapted = projectedByName.get(name);
            const input = structuredClone(original.inputSchema);
            if (action) {
                delete input.properties.action;
                if (input.required) input.required = input.required.filter(field => field !== "action");
            }
            assert.deepEqual(adapted.inputSchema, input, name);
            assert.deepEqual(adapted.outputSchema, original.outputSchema, name);
            assert.equal(typeof adapted.annotations.readOnlyHint, "boolean", name);
            assert.equal(typeof adapted.annotations.destructiveHint, "boolean", name);
            assert.equal(typeof adapted.annotations.openWorldHint, "boolean", name);
        }
    }
    suite.diagnostic("SiYuan exposed " + direct.length + " tools and " + projected.length + " named operations.");

    const notebook = (await text(current, "notebook__create", {name: "OAuth validation notebook"})).match(idPattern)?.[0];
    assert.ok(notebook);
    await waitFor(async () => !(await call(current, "document__list", {notebook, parentID: ""})).isError,
        first.child, "new notebook document metadata", 20000);
    const document = (await text(current, "document__create", {
        notebook, parentID: "", title: "OAuth validation note", markdown: "Original integration paragraph."
    })).match(idPattern)?.[0];
    assert.ok(document);
    const added = await text(current, "block__append", {parentID: document, data: "Added integration paragraph.", dataType: "markdown"});
    const block = added.match(idPattern)?.[0];
    assert.ok(block, added);
    await text(current, "block__update", {id: block, data: "Updated integration paragraph.", dataType: "markdown"});
    assert.match(await text(current, "block__get_kramdown", {id: document}), /Updated integration paragraph/);
    const deniedAction = await call(current, "block__get", {id: block, action: "delete"});
    assert.equal(deniedAction.isError, true);
    await text(current, "block__delete", {id: block});
    assert.doesNotMatch(await text(current, "block__get_kramdown", {id: document}), /Updated integration paragraph/);

    const database = await call(current, "database__create", {parentID: document, name: "OAuth validation database"});
    assert.ok(!database.isError);
    assert.equal(database.structuredContent.action, "create");
    const avID = database.structuredContent.data.avID;
    assert.match(avID, idPattern);
    const metadata = await call(current, "database__get", {id: avID});
    assert.ok(!metadata.isError);
    assert.equal(metadata.structuredContent.action, "get");
    assert.match(JSON.stringify(metadata.structuredContent), /OAuth validation database/);

    await first.admin("/api/setting/setAI", {mcp: {exposurePolicy: {
        default: "allow", overrides: {"native/backend/block": "deny"}
    }}});
    assert.ok(!(await current.listTools()).tools.some(tool => tool.name.startsWith("block__")));
    assert.equal((await call(current, "block__get", {id: document})).isError, true);
    await first.admin("/api/setting/setAI", {mcp: {exposurePolicy: null}});
    assert.ok((await current.listTools()).tools.some(tool => tool.name === "block__get"));

    await writeFile(connectionPath, JSON.stringify({...connected, expiresAt: Date.now() - 1}));
    await Promise.all([current.listTools(), current.listTools()]);
    const refreshed = await readConnection();
    assert.ok(refreshed.accessToken !== connected.accessToken, "The real SiYuan OAuth grant rotated");
    await assert.rejects(upstreamTools(first, connected.accessToken), {code: 401});
    const standardAPI = await first.fetch("/api/notebook/lsNotebooks", {
        method: "POST", headers: {Authorization: "Bearer " + refreshed.accessToken}
    });
    assert.equal(standardAPI.status, 401);
    const second = await startWorkspace(root, "workspace-b", children);
    assert.equal((await upstreamTools(first, refreshed.accessToken)).length, direct.length);
    await assert.rejects(upstreamTools(second, refreshed.accessToken), {code: 401});
    await first.admin("/api/mcp/removeOAuthClient", {id: firstClient});
    await assert.rejects(current.listTools(), /refused access/i);

    await connectWorkspace(second, environment, children);
    await assert.rejects(current.listTools(), /connection changed/i);
    const next = await bridge(environment);
    clients.push(next);
    assert.doesNotMatch(await text(next, "notebook__list"), /OAuth validation notebook/);
    const foreign = await call(next, "block__get_kramdown", {id: document});
    assert.equal(foreign.isError, true);

    const token = (await readConnection()).accessToken;
    const disconnect = spawn(process.execPath, [entry, "disconnect"], {
        env: environment, windowsHide: true, stdio: "ignore"
    });
    children.push(disconnect);
    const [status] = await once(disconnect, "exit");
    assert.equal(status, 0, "The plugin revoked the SiYuan OAuth grant");
    await assert.rejects(upstreamTools(second, token), {code: 401});
    await assert.rejects(next.listTools(), /connect/i);
});
