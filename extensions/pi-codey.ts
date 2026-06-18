import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn } from "node:child_process";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const BLUEPRINTS = [
  "ack", "hello", "ready", "think", "curious", "notify", "success",
  "celebrate", "wow", "laugh", "warn", "error", "angry", "sad",
  "sleepy", "bored", "dizzy", "screaming", "fear", "thank_you", "bye", "idle",
] as const;

const SOUNDS = [
  "hello.wav", "hi.wav", "bye.wav", "yeah.wav", "wow.wav", "laugh.wav",
  "hum.wav", "sad.wav", "sigh.wav", "annoyed.wav", "angry.wav",
  "surprised.wav", "yummy.wav", "curious.wav", "embarrassed.wav",
  "ready.wav", "sprint.wav", "sleepy.wav", "meow.wav", "start.wav",
  "switch.wav", "beeps.wav", "buzzing.wav", "exhaust.wav", "explosion.wav",
  "gotcha.wav", "hurt.wav", "jump.wav", "laser.wav", "level up.wav",
  "low energy.wav", "metal clash.wav", "prompt tone.wav", "right.wav",
  "wrong.wav", "ring.wav", "score.wav", "shot.wav", "step_1.wav",
  "step_2.wav", "wake.wav", "warning.wav",
] as const;

type Blueprint = (typeof BLUEPRINTS)[number];
type Profile = "silent" | "min" | "mid" | "max";
type FlashResult = { ok: boolean; code: number | null; error?: string; output?: string };
type DetectResult = { selected?: string | null; candidates?: Array<{ port?: string; description?: string; manufacturer?: string; score?: number }>; ports?: Array<{ port?: string; description?: string; manufacturer?: string; score?: number }>; error?: string };

const PROFILES = ["silent", "min", "mid", "max"] as const;

const EXTENSION_DIR = typeof __dirname !== "undefined"
  ? __dirname
  : path.dirname(new URL(import.meta.url).pathname);
const PACKAGE_ROOT = path.basename(path.resolve(EXTENSION_DIR, "..")) === ".pi"
  ? process.cwd()
  : path.resolve(EXTENSION_DIR, "..");

type CodeyState = {
  enabled: boolean;
  auto: boolean;
  profile: Profile;
  port: string;
  root: string;
  busy: boolean;
  queue: Blueprint[];
  lastAt: number;
  boredTimer: ReturnType<typeof setTimeout> | null;
};

function isBlueprint(value: string): value is Blueprint {
  return (BLUEPRINTS as readonly string[]).includes(value);
}

function soundNames() {
  return SOUNDS.map((sound) => sound.replace(/\.wav$/, ""));
}

function isSound(value: string) {
  return soundNames().includes(value) || (SOUNDS as readonly string[]).includes(value);
}

function isProfile(value: string): value is Profile {
  return (PROFILES as readonly string[]).includes(value);
}

export default function (pi: ExtensionAPI) {
  const state: CodeyState = {
    enabled: process.env.PI_CODEY_ENABLED !== "0",
    auto: process.env.PI_CODEY_AUTO !== "0",
    profile: process.env.PI_CODEY_AUTO === "0" ? "silent" : "min",
    port: process.env.PI_CODEY_PORT || process.env.CODEYX_PORT || "COM3",
    root: process.env.PI_CODEY_ROOT || process.env.CODEYX_ROOT || PACKAGE_ROOT,
    busy: false,
    queue: [],
    lastAt: 0,
    boredTimer: null,
  };

  function trigger(blueprint: Blueprint, reason = "manual") {
    if (!state.enabled) return;
    state.queue.push(blueprint);
    void drain(reason);
  }

  function autoEnabled() {
    return state.auto && state.profile !== "silent";
  }

  function pick(items: readonly Blueprint[], reason: string) {
    const hash = Array.from(reason).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) + Date.now();
    return items[Math.abs(hash) % items.length];
  }

  function clearBoredTimer() {
    if (state.boredTimer) {
      clearTimeout(state.boredTimer);
      state.boredTimer = null;
    }
  }

  function startBoredTimer() {
    clearBoredTimer();
    if (!autoEnabled()) return;
    state.boredTimer = setTimeout(() => {
      state.boredTimer = null;
      trigger("bored", "bored_timer");
    }, 30000);
  }

  function triggerAuto(kind: "session_start" | "agent_start" | "tool_start" | "tool_success" | "tool_error" | "agent_end" | "session_shutdown") {
    if (!autoEnabled()) return;

    if (state.profile === "min") {
      const map: Partial<Record<typeof kind, Blueprint>> = {
        session_start: "hello",
        agent_start: "think",
        tool_error: "error",
        agent_end: "success",
        session_shutdown: "bye",
      };
      const blueprint = map[kind];
      if (blueprint) trigger(blueprint, kind);
      return;
    }

    if (state.profile === "mid") {
      const map: Partial<Record<typeof kind, Blueprint>> = {
        session_start: "hello",
        agent_start: "think",
        tool_start: "curious",
        tool_success: "notify",
        tool_error: "error",
        agent_end: "success",
        session_shutdown: "bye",
      };
      const blueprint = map[kind];
      if (blueprint) trigger(blueprint, kind);
      return;
    }

    // max: use the full expression palette across normal Pi lifecycle events.
    const map: Partial<Record<typeof kind, Blueprint | readonly Blueprint[]>> = {
      session_start: "hello",
      agent_start: "think",
      tool_start: ["ack", "curious", "notify", "wow"],
      tool_success: ["ready", "success", "celebrate", "laugh"],
      tool_error: ["warn", "error", "angry", "sad"],
      agent_end: "success",
      session_shutdown: ["sleepy", "bye"],
    };
    const entry = map[kind];
    if (!entry) return;
    if (Array.isArray(entry)) {
      if (kind === "session_shutdown") entry.forEach((blueprint) => trigger(blueprint, kind));
      else trigger(pick(entry, kind), kind);
    } else {
      trigger(entry, kind);
    }
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
    return runTriggerMessage(blueprint, []);
  }

  function runSound(sound: string): Promise<void> {
    return runTriggerMessage("sound", ["--value", sound]);
  }

  function runTriggerMessage(message: string, extraArgs: string[]): Promise<void> {
    return new Promise((resolve) => {
      const script = path.join(state.root, "tools", "trigger_codey.py");
      if (!existsSync(script)) return resolve();

      const child = spawn("python", [script, message, ...extraArgs, "--port", state.port], {
        cwd: state.root,
        stdio: "ignore",
        windowsHide: true,
      });

      const done = () => resolve();
      child.once("error", done);
      child.once("exit", done);
    });
  }

  function detectCodey(): Promise<DetectResult> {
    return new Promise((resolve) => {
      const script = path.join(state.root, "tools", "detect_codey.py");
      if (!existsSync(script)) return resolve({ error: `detect script not found: ${script}` });

      let stdout = "";
      let stderr = "";
      const child = spawn("python", [script, "--json"], {
        cwd: state.root,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
      child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
      child.once("error", (err) => resolve({ error: err.message }));
      child.once("exit", (code) => {
        if (code !== 0) return resolve({ error: stderr || stdout || `detect exited with code ${code}` });
        try {
          resolve(JSON.parse(stdout));
        } catch (err) {
          resolve({ error: `failed to parse detect output: ${err instanceof Error ? err.message : String(err)}` });
        }
      });
    });
  }

  pi.on("session_start", async (_event, ctx) => {
    state.root = process.env.PI_CODEY_ROOT || process.env.CODEYX_ROOT || PACKAGE_ROOT;
    if (state.enabled) {
      ctx.ui.notify(`pi-codey extension active on ${state.port} profile=${state.profile}`, "info");
      triggerAuto("session_start");
    }
  });

  pi.on("agent_start", async () => {
    triggerAuto("agent_start");
    startBoredTimer();
  });

  pi.on("tool_execution_start", async () => {
    triggerAuto("tool_start");
  });

  pi.on("tool_execution_end", async (event) => {
    triggerAuto(event.isError ? "tool_error" : "tool_success");
  });

  pi.on("agent_end", async () => {
    clearBoredTimer();
    triggerAuto("agent_end");
  });

  pi.on("session_shutdown", async () => {
    clearBoredTimer();
    triggerAuto("session_shutdown");
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


  function findConfigPath(): string | null {
    const candidates = [
      path.join(process.cwd(), ".pi", "codey.config.json"),
      path.join(process.cwd(), "codey.config.json"),
      path.join(state.root, "codey.config.json"),
    ];
    return candidates.find((candidate) => existsSync(candidate)) || null;
  }

  function configuredProgramPath(): string {
    const program = path.join(state.root, "generated", "codey_blueprints.py");
    const configPath = findConfigPath();
    if (!configPath) return program;

    const config = JSON.parse(readFileSync(configPath, "utf8"));
    const source = readFileSync(program, "utf8");
    const configJson = JSON.stringify(config).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const configured = source.replace(
      /^CONFIG = .*$/m,
      `CONFIG = json.loads('${configJson}')`,
    );
    const tempProgram = path.join(state.root, ".codey-blueprints.configured.py");
    writeFileSync(tempProgram, configured, "utf8");
    return tempProgram;
  }

  function summarizeFlashError(error: string, code: number | null) {
    const text = error || `flash process exited with code ${code}`;
    if (/Access is denied|PermissionError|could not open port|busy|denied/i.test(text)) {
      return `${text}\nHint: close mBlock/serial monitors and check that ${state.port} is not already in use.`;
    }
    if (/No such file|FileNotFoundError|cannot find|not recognized/i.test(text)) {
      return `${text}\nHint: check Python is installed and pi-codey package files are present.`;
    }
    if (/The system cannot find the file specified|cannot open|serial/i.test(text)) {
      return `${text}\nHint: check Codey is connected and the port is set correctly with /codey port COMx.`;
    }
    return text;
  }

  function flashCodey(port = state.port): Promise<FlashResult> {
    return new Promise((resolve) => {
      const script = path.join(state.root, "tools", "flash_codey.py");
      const program = path.join(state.root, "generated", "codey_blueprints.py");
      if (!existsSync(script)) return resolve({ ok: false, code: null, error: `flash script not found: ${script}` });
      if (!existsSync(program)) return resolve({ ok: false, code: null, error: `blueprint program not found: ${program}` });

      let uploadProgram: string;
      try {
        uploadProgram = configuredProgramPath();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return resolve({ ok: false, code: null, error: `failed to read codey.config.json: ${message}` });
      }

      let stdout = "";
      let stderr = "";
      const child = spawn("python", [script, uploadProgram, "--port", port], {
        cwd: state.root,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });
      child.stdout?.on("data", (chunk) => { stdout += String(chunk); });
      child.stderr?.on("data", (chunk) => { stderr += String(chunk); });
      child.once("error", (err) => resolve({ ok: false, code: null, error: summarizeFlashError(err.message, null), output: stdout }));
      child.once("exit", (code) => {
        if (path.basename(uploadProgram) === ".codey-blueprints.configured.py") {
          try { unlinkSync(uploadProgram); } catch {}
        }
        const combined = `${stderr}${stdout ? `\n${stdout}` : ""}`.trim();
        resolve({
          ok: code === 0,
          code,
          error: code === 0 ? undefined : summarizeFlashError(combined, code),
          output: stdout.trim(),
        });
      });
    });
  }

  pi.registerCommand("codey", {
    description: "Control pi-codey. Usage: /codey <install|flash|detect|test|blueprint|play soundname|profile silent|min|mid|max|on|off|auto-on|auto-off|port COM3|status>",
    handler: async (args, ctx) => {
      const parts = String(args || "").trim().split(/\s+/).filter(Boolean);
      const cmd = parts[0] || "status";

      if (cmd === "install" || cmd === "flash") {
        ctx.ui.notify(`Flashing Codey on ${state.port}...`, "info");
        const result = await flashCodey(state.port);
        if (result.ok) {
          ctx.ui.notify("pi-codey onboard blueprints flashed", "info");
          // Give the freshly uploaded onboard program time to restart and prime
          // stale upload-mode messages before sending the post-install reaction.
          // If this is too early, Codey may treat the fresh success message as
          // startup state and ignore it.
          await new Promise((resolve) => setTimeout(resolve, 6000));
          trigger("success", "install");
        } else {
          ctx.ui.notify(`pi-codey flash failed: ${result.error || "unknown error"}`, "error");
        }
      } else if (cmd === "detect") {
        const result = await detectCodey();
        if (result.error) {
          ctx.ui.notify(`pi-codey detect failed: ${result.error}`, "error");
        } else if (result.selected) {
          const use = parts.includes("--use") || parts.includes("use");
          if (use) state.port = result.selected;
          const candidates = (result.candidates || []).slice(0, 3)
            .map((port) => `${port.port}${port.description ? ` (${port.description})` : ""}`)
            .join(", ");
          ctx.ui.notify(
            `Detected Codey candidate: ${result.selected}${use ? " and set as active port" : ""}${candidates ? `. Candidates: ${candidates}` : ""}`,
            "info",
          );
        } else {
          const ports = (result.ports || []).map((port) => port.port).filter(Boolean).join(", ");
          ctx.ui.notify(`No obvious Codey port found.${ports ? ` Available ports: ${ports}` : " No serial ports found."}`, "error");
        }
      } else if (cmd === "test") {
        const sequence: Blueprint[] = ["hello", "think", "success", "idle"];
        sequence.forEach((blueprint) => trigger(blueprint, "test"));
        ctx.ui.notify(`pi-codey test sequence queued: ${sequence.join(" → ")}`, "info");
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
        if (state.profile === "silent") state.profile = "min";
        ctx.ui.notify(`pi-codey auto reactions enabled profile=${state.profile}`, "info");
      } else if (cmd === "auto-off") {
        state.auto = false;
        state.profile = "silent";
        ctx.ui.notify("pi-codey auto reactions disabled profile=silent", "info");
      } else if (cmd === "profile" || isProfile(cmd)) {
        const profile = cmd === "profile" ? parts[1] || "" : cmd;
        if (!isProfile(profile)) {
          ctx.ui.notify(`Usage: /codey profile <${PROFILES.join("|")}> or /codey <${PROFILES.join("|")}>. Current profile=${state.profile}`, "error");
        } else {
          state.profile = profile;
          state.auto = profile !== "silent";
          ctx.ui.notify(`pi-codey profile set to ${state.profile}`, "info");
        }
      } else if (cmd === "port") {
        state.port = parts[1] || state.port;
        ctx.ui.notify(`pi-codey port set to ${state.port}`, "info");
      } else if (cmd === "play") {
        const sound = parts.slice(1).join(" ");
        if (!sound) {
          ctx.ui.notify(`Usage: /codey play <soundname>. Sounds: ${soundNames().join(", ")}`, "info");
        } else if (!isSound(sound)) {
          ctx.ui.notify(`Unknown Codey sound: ${sound}. Use /codey play to list available sounds.`, "error");
        } else {
          await runSound(sound.replace(/\.wav$/, ""));
          ctx.ui.notify(`Played Codey sound: ${sound.replace(/\.wav$/, "")}`, "info");
        }
      } else if (isBlueprint(cmd)) {
        trigger(cmd, "command");
        ctx.ui.notify(`Triggered Codey: ${cmd}`, "info");
      } else {
        ctx.ui.notify(
          `pi-codey enabled=${state.enabled} auto=${autoEnabled()} profile=${state.profile} port=${state.port}. Profiles: ${PROFILES.join(", ")}. Blueprints: ${BLUEPRINTS.join(", ")}`,
          "info",
        );
      }
    },
  });
}
