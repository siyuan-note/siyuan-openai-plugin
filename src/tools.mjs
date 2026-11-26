import inventory from "../review/workspace-tools.json" with {type: "json"};

const native = new Map(inventory.tools.filter(tool => !tool.agentOnly).map(tool => [tool.name, tool]));
const additive = new Set(["block__append", "block__prepend", "document__create", "notebook__create"]);
const external = new Set(["http_request", "web_fetch", "web_search"]);

function annotations(tool, action, name) {
    const definition = native.get(tool.name);
    const effects = definition?.actions.find(item => item.name === (action ?? ""))?.declaredEffects;
    const readOnly = tool.annotations?.readOnlyHint ?? (
        effects?.includes("LocalRead") && !effects.includes("LocalWrite") && !effects.includes("DataEgress")
    );
    return {
        ...tool.annotations,
        readOnlyHint: Boolean(readOnly),
        destructiveHint: readOnly ? false : (tool.annotations?.destructiveHint ?? !additive.has(name)),
        openWorldHint: tool.annotations?.openWorldHint ?? (
            external.has(tool.name) || Boolean(effects?.includes("DataEgress")) || !definition
        )
    };
}

function fixedActionTool(tool, action) {
    const name = tool.name + "__" + action;
    const {action: _action, ...properties} = tool.inputSchema.properties;
    const inputSchema = {...tool.inputSchema, properties};
    if (inputSchema.required) {
        inputSchema.required = inputSchema.required.filter(field => field !== "action");
    }
    return {
        name,
        upstream: tool.name,
        action,
        tool: {
            ...tool,
            name,
            title: action.replaceAll("_", " ") + " (" + (tool.title || tool.name) + ")",
            description: "Run the SiYuan " + tool.name + " operation " + action + ". " +
                (tool.description ?? ""),
            inputSchema,
            annotations: annotations(tool, action, name)
        }
    };
}

export function projectTools(upstream) {
    const result = new Map();
    for (const tool of upstream) {
        const actions = tool.inputSchema.properties?.action?.enum;
        const entries = Array.isArray(actions) && actions.length && actions.every(action => typeof action === "string" && action) ?
            actions.map(action => fixedActionTool(tool, action)) :
            [{name: tool.name, upstream: tool.name, tool: {
                ...tool,
                annotations: annotations(tool, undefined, tool.name)
            }}];
        for (const entry of entries) {
            if (result.has(entry.name)) {
                throw new Error("SiYuan returned overlapping tool names: " + entry.name);
            }
            result.set(entry.name, entry);
        }
    }
    return result;
}
