import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const BLUEPRINTS = [
  "ack", "hello", "ready", "think", "curious", "notify", "success",
  "celebrate", "wow", "laugh", "warn", "error", "angry", "sad",
  "sleepy", "bye", "idle",
] as const;

type Blueprint = (typeof BLUEPRINTS)[number];

const EXTENSION_DIR = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(new URL(import.meta.url).pathname);
const PACKAGE_ROOT = path.basename(path.resolve(EXTENSION_DIR, "..")) === ".pi"
  ? process.cwd()
  : path.resolve(EXTENSION_DIR, "..");

type CodeyState = {
  enabled: boolean;
  auto: boolean;
  port: string;
  root: string;
  busy: boolean;
  queue: Blueprint[];
  lastAt: number;
};

function isBlueprint(value: string): value is Blueprint {
  return (BLUEPRINTS as readonly string[]).includes(value);
}

export default function (pi: ExtensionAPI) {
  const state: CodeyState = {
    enabled: process.env.PI_CODEY_ENABLED !== "0",
    auto: process.env.PI_CODEY_AUTO !== "0",
    port: process.env.PI_CODEY_PORT || process.env.CODEYX_PORT || "COM3",
    root: process.env.PI_CODEY_ROOT || process.env.CODEYX_ROOT || PACKAGE_ROOT,
    busy: false,
    queue: [],
    lastAt: 0,
  };

  function trigger(blueprint: Blueprint, reason = "manual") {
    if (!state.enabled) return;
    state.queue.push(blueprint);
    void drain(reason);
  }

  async function drain(reason: string) {
    if (state.busy) return;
    state.busy = true;
    try {
      while (state.queue.length) {
        const blueprint = state.queue.shift()!;
        const now = Date.now();
        const gap = Math.max(0, 450 - (now - state.lastAt));
        if (gap) await new Promise((resolve) => setTimeout(resolve, gap));
        await runTrigger(blueprint, reason);
        state.lastAt = Date.now();
      }
    } finally {
      state.busy = false;
    }
  }

  function runTrigger(blueprint: Blueprint, reason: string): Promise<void> {
    return new Promise((resolve) => {
      const script = path.join(state.root, "tools", "trigger_codey.py");
      if (!existsSync(script)) return resolve();

      const child = spawn("python", [script, blueprint, "--port", state.port], {
        cwd: state.root,
        stdio: "ignore",
        windowsHide: true,
      });

      const done = () => resolve();
      child.once("error", done);
      child.once("exit", done);
    });
  }

  pi.on("session_start", async (_event, ctx) => {
    state.root = process.env.PI_CODEY_ROOT || process.env.CODEYX_ROOT || PACKAGE_ROOT;
    if (state.enabled) {
      ctx.ui.notify(`pi-codey extension active on ${state.port}`, "info");
      trigger("hello", "session_start");
    }
  });

  pi.on("agent_start", async () => {
    if (state.auto) trigger("think", "agent_start");
  });

  pi.on("tool_execution_end", async (event) => {
    if (!state.auto) return;
    if (event.isError) trigger("error", "tool_error");
  });

  pi.on("agent_end", async () => {
    if (state.auto) trigger("success", "agent_end");
  });

  pi.on("session_shutdown", async () => {
    if (state.enabled) trigger("bye", "session_shutdown");
  });

  pi.registerTool({
    name: "codey_react",
    label: "Codey React",
    description: "Trigger a Codey Rocky onboard reaction blueprint via pi-codey.",
    parameters: Type.Object({
      blueprint: Type.String({
        description: `Blueprint to trigger. Available: ${BLUEPRINTS.join(", ")}`,
      }),
      port: Type.Optional(Type.String({ description: "Serial port, default COM3" })),
    }),
    async execute(_toolCallId, params) {
      const blueprint = String(params.blueprint || "");
      if (!isBlueprint(blueprint)) {
        return {
          content: [{ type: "text", text: `Unknown blueprint: ${blueprint}. Available: ${BLUEPRINTS.join(", ")}` }],
          details: { ok: false, blueprint },
        };
      }
      const oldPort = state.port;
      if (params.port) state.port = String(params.port);
      await runTrigger(blueprint, "tool");
      state.port = oldPort;
      return {
        content: [{ type: "text", text: `Triggered Codey blueprint: ${blueprint}` }],
        details: { ok: true, blueprint, port: params.port || state.port },
      };
    },
  });


  function flashCodey(port = state.port): Promise<{ ok: boolean; code: number | null }> {
    return new Promise((resolve) => {
      const script = path.join(state.root, "tools", "flash_codey.py");
      const program = path.join(state.root, "generated", "codey_blueprints.py");
      if (!existsSync(script) || !existsSync(program)) return resolve({ ok: false, code: null });
      const child = spawn("python", [script, program, "--port", port], {
        cwd: state.root,
        stdio: "ignore",
        windowsHide: true,
      });
      child.once("error", () => resolve({ ok: false, code: null }));
      child.once("exit", (code) => resolve({ ok: code === 0, code }));
    });
  }

  pi.registerCommand("codey", {
    description: "Control pi-codey. Usage: /codey <install|flash|blueprint|on|off|auto-on|auto-off|port COM3|status>",
    handler: async (args, ctx) => {
      const parts = String(args || "").trim().split(/\s+/).filter(Boolean);
      const cmd = parts[0] || "status";

      if (cmd === "install" || cmd === "flash") {
        ctx.ui.notify(`Flashing Codey on ${state.port}...`, "info");
        const result = await flashCodey(state.port);
        if (result.ok) {
          ctx.ui.notify("pi-codey onboard blueprints flashed", "info");
          trigger("ready", "install");
        } else {
          ctx.ui.notify("pi-codey flash failed. Check Codey is on COM port and not held by mBlock.", "error");
        }
      } else if (cmd === "on") {
        state.enabled = true;
        ctx.ui.notify("pi-codey enabled", "info");
        trigger("hello", "command");
      } else if (cmd === "off") {
        trigger("bye", "command");
        state.enabled = false;
        ctx.ui.notify("pi-codey disabled", "info");
      } else if (cmd === "auto-on") {
        state.auto = true;
        ctx.ui.notify("pi-codey auto reactions enabled", "info");
      } else if (cmd === "auto-off") {
        state.auto = false;
        ctx.ui.notify("pi-codey auto reactions disabled", "info");
      } else if (cmd === "port") {
        state.port = parts[1] || state.port;
        ctx.ui.notify(`pi-codey port set to ${state.port}`, "info");
      } else if (isBlueprint(cmd)) {
        trigger(cmd, "command");
        ctx.ui.notify(`Triggered Codey: ${cmd}`, "info");
      } else {
        ctx.ui.notify(
          `pi-codey enabled=${state.enabled} auto=${state.auto} port=${state.port}. Blueprints: ${BLUEPRINTS.join(", ")}`,
          "info",
        );
      }
    },
  });
}
