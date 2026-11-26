import {createHash, randomBytes, X509Certificate} from "node:crypto";
import {once} from "node:events";
import {readFile} from "node:fs/promises";
import {createServer} from "node:http";
import {createInterface} from "node:readline/promises";
import {Writable} from "node:stream";
import {parseArgs} from "node:util";
import {ConnectionError, createLocalFetch, disconnect, exchangeToken, loopbackOrigin, saveConnection, withConnectionLock} from "./connection.mjs";

const DEFAULT_CALLBACK_PORT = 49183;

async function readSecret() {
    const silent = new Writable({write(_chunk, _encoding, callback) { callback(); }});
    const input = createInterface({input: process.stdin, output: silent, terminal: process.stdin.isTTY});
    process.stderr.write("SiYuan MCP OAuth client secret: ");
    try {
        const value = await input.question("");
        if (!/^[\w-]{43}$/.test(value)) {
            throw new ConnectionError("Enter the client secret issued by this SiYuan workspace.");
        }
        return value;
    } finally {
        process.stderr.write("\n");
        input.close();
    }
}

async function authorize(connection, port) {
    const state = randomBytes(32).toString("base64url");
    const verifier = randomBytes(32).toString("base64url");
    const redirect = new URL("http://127.0.0.1:" + port + "/callback");
    const url = new URL("/oauth/mcp/authorize", connection.origin);
    url.search = new URLSearchParams({
        client_id: connection.clientId,
        redirect_uri: redirect.href,
        response_type: "code",
        code_challenge: createHash("sha256").update(verifier).digest("base64url"),
        code_challenge_method: "S256",
        resource: connection.origin + "/mcp",
        scope: "mcp offline_access",
        state
    }).toString();

    let finish;
    let fail;
    let used = false;
    const waitForCode = new Promise((resolve, reject) => { finish = resolve; fail = reject; });
    const listener = createServer((req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        if (used || req.method !== "GET" || req.headers.host !== redirect.host ||
            !req.url.startsWith(redirect.pathname + "?")) {
            res.writeHead(400).end("The callback does not match the SiYuan authorization request.");
            return;
        }
        const query = new URL(req.url, redirect);
        if (query.searchParams.getAll("state").length !== 1 ||
            query.searchParams.get("state") !== state ||
            query.searchParams.getAll("iss").length !== 1 ||
            query.searchParams.get("iss") !== connection.origin) {
            res.writeHead(400).end("The callback does not match the SiYuan authorization request.");
            return;
        }
        used = true;
        const code = query.searchParams.get("code");
        if (query.searchParams.has("error") || query.searchParams.getAll("code").length !== 1 || !/^[\w-]{43}$/.test(code ?? "")) {
            res.writeHead(400).end("The SiYuan connection was not authorized.");
            fail(new ConnectionError("The workspace authorization was denied or invalid."));
            return;
        }
        res.end("SiYuan authorization received. Return to the terminal to finish connecting.");
        finish(code);
    });
    listener.listen(port, "127.0.0.1");
    await once(listener, "listening");
    const timeout = setTimeout(() => fail(new ConnectionError("The SiYuan authorization expired.")), 5 * 60 * 1000);
    process.stdout.write("Open this URL in your browser to authorize the workspace:\n" + url.href + "\n");
    try {
        return await exchangeToken(connection, {
            grant_type: "authorization_code",
            code: await waitForCode,
            redirect_uri: redirect.href,
            code_verifier: verifier
        });
    } finally {
        clearTimeout(timeout);
        listener.close();
        listener.closeAllConnections();
    }
}

async function connect(args) {
    const {values} = parseArgs({args, options: {
        origin: {type: "string"},
        ca: {type: "string"},
        "client-id": {type: "string"},
        "callback-port": {type: "string", default: String(DEFAULT_CALLBACK_PORT)}
    }});
    if (!values.origin || !values.ca || !/^[\w-]{43}$/.test(values["client-id"] ?? "")) {
        throw new ConnectionError("Usage: connect --origin <SiYuan HTTPS origin> --ca <workspace conf/ca.crt> --client-id <id> [--callback-port <port>]");
    }
    const port = Number(values["callback-port"]);
    if (!/^\d{1,5}$/.test(values["callback-port"]) || port < 1024 || port > 65535) {
        throw new ConnectionError("The callback port must be between 1024 and 65535.");
    }
    const origin = loopbackOrigin(values.origin);
    const ca = await readFile(values.ca, "utf8");
    if (ca.length > 16384 || !new X509Certificate(ca).ca) {
        throw new ConnectionError("Choose the SiYuan workspace CA certificate.");
    }
    const metadata = await createLocalFetch(origin, ca)("/.well-known/oauth-authorization-server", {
        signal: AbortSignal.timeout(8000)
    });
    if (metadata.status !== 200 || (await metadata.json()).issuer !== origin) {
        throw new ConnectionError("Enable MCP OAuth in SiYuan and set its public URL to this HTTPS origin.");
    }
    const clientSecret = await readSecret();
    const connection = await authorize({origin, ca, clientId: values["client-id"], clientSecret}, port);
    await withConnectionLock(() => saveConnection(connection));
    process.stdout.write("SiYuan workspace connected. Start a new local conversation to use it.\n");
}

export async function runConnectionCommand(args) {
    if (args[0] === "connect") {
        await connect(args.slice(1));
    } else if (args[0] === "disconnect" && args.length === 1) {
        await disconnect();
        process.stdout.write("SiYuan workspace grant revoked.\n");
    } else {
        throw new ConnectionError("Specify connect or disconnect.");
    }
}
