import {randomBytes, X509Certificate} from "node:crypto";
import {mkdir, open, rename, rmdir, unlink, writeFile} from "node:fs/promises";
import {request} from "node:https";
import {homedir} from "node:os";
import {isAbsolute, join} from "node:path";
import {Readable} from "node:stream";
import {setTimeout as delay} from "node:timers/promises";
import {z} from "zod";

const configDirectory = process.env.SIYUAN_OPENAI_CONFIG_DIR;
if (configDirectory && !isAbsolute(configDirectory)) {
    throw new Error("SIYUAN_OPENAI_CONFIG_DIR must be an absolute path.");
}
const directory = configDirectory || join(homedir(), ".siyuan-desktop-plugin");
const filePath = join(directory, "connection.json");
const lockPath = join(directory, "connection.lock");
const accessToken = z.string().regex(/^sy-mcp-a\.[\w-]{43}$/);
const refreshToken = z.string().regex(/^sy-mcp-r\.[\w-]{43}$/);
const opaque = z.string().regex(/^[\w-]{43}$/);
const settings = z.strictObject({
    origin: z.string().transform(loopbackOrigin),
    ca: z.string().max(16384),
    clientId: opaque,
    clientSecret: opaque,
    accessToken,
    refreshToken: refreshToken.nullable(),
    expiresAt: z.number().int().positive()
});
const tokenResponse = z.object({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: z.literal("Bearer"),
    expires_in: z.number().int().positive().max(3600)
});

export class ConnectionError extends Error {}

export function loopbackOrigin(input) {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== "127.0.0.1" || url.username || url.password ||
        url.pathname !== "/" || url.search || url.hash || input.includes("?") || input.includes("#")) {
        throw new ConnectionError("Enter the SiYuan HTTPS origin on 127.0.0.1, including its port.");
    }
    return url.origin;
}

export function createLocalFetch(origin, ca) {
    if (!new X509Certificate(ca).ca) {
        throw new ConnectionError("Use the CA certificate from the SiYuan workspace configuration.");
    }
    return (input, options = {}) => {
        const url = new URL(input, origin);
        if (url.origin !== origin || url.username || url.password) {
            throw new ConnectionError("The connection only accepts requests to the authorized SiYuan origin.");
        }
        const headers = Object.fromEntries(new Headers(options.headers).entries());
        const body = options.body;
        if (body != null) {
            headers["content-length"] = String(Buffer.byteLength(body));
        }
        return new Promise((resolve, reject) => {
            const req = request(url, {
                method: options.method,
                headers,
                ca,
                agent: false,
                rejectUnauthorized: true,
                signal: options.signal
            }, res => {
                const responseHeaders = new Headers();
                for (let index = 0; index < res.rawHeaders.length; index += 2) {
                    responseHeaders.append(res.rawHeaders[index], res.rawHeaders[index + 1]);
                }
                const empty = [204, 205, 304].includes(res.statusCode);
                if (empty) {
                    res.resume();
                }
                resolve(new Response(empty ? null : Readable.toWeb(res), {
                    status: res.statusCode,
                    headers: responseHeaders
                }));
            });
            req.on("error", reject);
            req.end(body);
        });
    };
}

export async function readConnection() {
    try {
        const file = await open(filePath, "r");
        try {
            const stat = await file.stat();
            if (!stat.isFile() || stat.size > 24576 ||
                (process.platform !== "win32" && (stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0))) {
                throw new Error("Invalid connection file");
            }
            const buffer = Buffer.alloc(24577);
            const {bytesRead} = await file.read(buffer);
            if (bytesRead > 24576) {
                throw new Error("Invalid connection file");
            }
            return settings.parse(JSON.parse(buffer.subarray(0, bytesRead).toString("utf8")));
        } finally {
            await file.close();
        }
    } catch {
        throw new ConnectionError("Connect the SiYuan workspace by running the plugin's connect command.");
    }
}

export async function withConnectionLock(call) {
    await mkdir(directory, {recursive: true, mode: 0o700});
    for (let attempt = 0; ; attempt += 1) {
        try {
            await mkdir(lockPath, {mode: 0o700});
            break;
        } catch (error) {
            if (error.code !== "EEXIST") {
                throw error;
            }
            if (attempt === 100) {
                throw new ConnectionError("Another SiYuan connection update is in progress.");
            }
            await delay(100);
        }
    }
    try {
        return await call();
    } finally {
        await rmdir(lockPath);
    }
}

export async function saveConnection(connection) {
    const temporary = filePath + "." + randomBytes(8).toString("hex");
    await writeFile(temporary, JSON.stringify(settings.parse(connection)), {flag: "wx", mode: 0o600});
    try {
        await rename(temporary, filePath);
    } catch (error) {
        await unlink(temporary);
        throw error;
    }
}

async function oauthPost(connection, path, fields) {
    const fetchLocal = createLocalFetch(connection.origin, connection.ca);
    const basic = Buffer.from(connection.clientId + ":" + connection.clientSecret).toString("base64");
    return fetchLocal(path, {
        method: "POST",
        headers: {"Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + basic},
        body: new URLSearchParams(fields).toString(),
        signal: AbortSignal.timeout(8000)
    });
}

export async function exchangeToken(connection, fields) {
    const response = await oauthPost(connection, "/oauth/mcp/token", {resource: connection.origin + "/mcp", ...fields});
    if (response.status !== 200) {
        await response.body?.cancel();
        throw new ConnectionError("SiYuan refused the grant. Check the workspace's MCP authorization and reconnect.");
    }
    const tokens = tokenResponse.parse(await response.json());
    return {
        ...connection,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000
    };
}

export function connectionIdentity(connection) {
    return connection.origin + "|" + new X509Certificate(connection.ca).fingerprint256 + "|" + connection.clientId;
}

export async function getAccess(identity) {
    function check(connection) {
        if (identity && identity !== connectionIdentity(connection)) {
            throw new ConnectionError("The SiYuan connection changed. Start a new local conversation for the other workspace.");
        }
        return connection;
    }
    const current = check(await readConnection());
    if (current.expiresAt - Date.now() > 30000) {
        return current;
    }
    return withConnectionLock(async () => {
        const updated = check(await readConnection());
        if (updated.expiresAt - Date.now() > 30000) {
            return updated;
        }
        if (!updated.refreshToken) {
            throw new ConnectionError("The SiYuan grant expired. Reconnect the workspace.");
        }
        const fields = {grant_type: "refresh_token", refresh_token: updated.refreshToken};
        // 刷新会轮换令牌，响应丢失时重复使用旧令牌会撤销整个授权。
        await saveConnection({...updated, refreshToken: null});
        const renewed = await exchangeToken(updated, fields);
        await saveConnection(renewed);
        return renewed;
    });
}

export async function disconnect() {
    await withConnectionLock(async () => {
        const connection = await readConnection();
        const response = await oauthPost(connection, "/oauth/mcp/revoke", {
            token: connection.refreshToken ?? connection.accessToken
        });
        await response.body?.cancel();
        if (response.status !== 200) {
            throw new ConnectionError("SiYuan could not revoke the grant. Revoke the client in the workspace's MCP OAuth settings.");
        }
        await unlink(filePath);
    });
}
