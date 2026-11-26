import assert from "node:assert/strict";
import {once} from "node:events";
import {createServer} from "node:https";
import {test} from "node:test";
import {generate} from "selfsigned";
import {createLocalFetch, loopbackOrigin} from "../src/connection.mjs";
import {projectTools} from "../src/tools.mjs";

const block = {
    name: "block",
    description: "SiYuan block operations.",
    inputSchema: {
        type: "object",
        properties: {action: {type: "string", enum: ["get", "append", "delete"]}, id: {type: "string"}},
        required: ["action", "id"]
    },
    outputSchema: {type: "object", properties: {id: {type: "string"}}}
};

test("projects reading, additive writes and destructive writes as named operations", () => {
    const result = projectTools([block]);
    assert.deepEqual([...result.keys()], ["block__get", "block__append", "block__delete"]);
    assert.deepEqual(result.get("block__get").tool.inputSchema, {type: "object", properties: {id: {type: "string"}}, required: ["id"]});
    assert.deepEqual(result.get("block__get").tool.annotations, {readOnlyHint: true, destructiveHint: false, openWorldHint: false});
    assert.deepEqual(result.get("block__append").tool.annotations, {readOnlyHint: false, destructiveHint: false, openWorldHint: false});
    assert.deepEqual(result.get("block__delete").tool.annotations, {readOnlyHint: false, destructiveHint: true, openWorldHint: false});
    assert.equal(result.get("block__delete").action, "delete");
    assert.deepEqual(result.get("block__delete").tool.outputSchema, block.outputSchema);
    assert.deepEqual(block.inputSchema.required, ["action", "id"]);
});

test("preserves independently named tools and detects an ambiguous name", () => {
    const custom = {name: "extension_get", description: "Get a workspace property.",
        inputSchema: {type: "object"}, annotations: {readOnlyHint: true, openWorldHint: false}};
    assert.deepEqual(projectTools([custom]).get(custom.name).tool, {...custom,
        annotations: {readOnlyHint: true, destructiveHint: false, openWorldHint: false}});
    assert.throws(() => projectTools([block, {...custom, name: "block__get"}]), /overlapping tool names/);
});

test("accepts only an HTTPS IPv4 loopback origin for the workspace", () => {
    assert.equal(loopbackOrigin("https://127.0.0.1:6806/"), "https://127.0.0.1:6806");
    for (const value of ["http://127.0.0.1:6806", "https://example.com", "https://127.0.0.1:6806/mcp",
        "https://user@127.0.0.1:6806", "https://127.0.0.1:6806/?q=1", "https://127.0.0.1:6806/#a"]) {
        assert.throws(() => loopbackOrigin(value));
    }
});

test("rejects the wrong workspace TLS certificate and keeps redirects on the authorized origin", async suite => {
    const options = {extensions: [
        {name: "basicConstraints", cA: true},
        {name: "subjectAltName", altNames: [{type: 7, ip: "127.0.0.1"}]}
    ]};
    const correct = await generate([{name: "commonName", value: "Test workspace"}], options);
    const wrong = await generate([{name: "commonName", value: "Another workspace"}], options);
    let requestCount = 0;
    const server = createServer({key: correct.private, cert: correct.cert}, (_req, res) => {
        requestCount += 1;
        res.writeHead(302, {Location: "https://example.com/"}).end();
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    suite.after(() => new Promise(resolve => server.close(resolve)));
    const origin = "https://127.0.0.1:" + server.address().port;
    await assert.rejects(createLocalFetch(origin, wrong.cert)("/mcp", {headers: {Authorization: "Bearer synthetic"}}));
    assert.equal(requestCount, 0);
    const request = createLocalFetch(origin, correct.cert);
    const response = await request("/mcp", {headers: {Authorization: "Bearer synthetic"}});
    assert.equal(response.status, 302);
    await response.text();
    assert.throws(() => request(response.headers.get("Location")), /authorized SiYuan origin/);
    assert.equal(requestCount, 1);
});
