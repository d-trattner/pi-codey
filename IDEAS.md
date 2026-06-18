# pi-codey improvement ideas

## High-value improvements

### 1. Add a proper `/codey test` command — DONE

Implemented:

```text
/codey test
```

Current sequence:

```text
hello → think → success → idle
```

Useful after install, flashing, or changing ports.

### 2. Add `/codey detect` — DONE

Implemented:

```text
/codey detect
/codey detect --use
```

It scans serial ports and scores likely Codey/Makeblock/CH340/WCH devices. `--use` sets the detected port as active.

### 3. Improve install/flash feedback — DONE

Implemented basic flash process stdout/stderr capture and clearer error hints for common issues:

- port busy / access denied
- missing Python or package files
- serial/device/port problems

This makes `/codey install` easier to debug.

### 4. Add configurable auto-reaction profiles — DONE

Implemented profiles:

```text
/codey profile silent
/codey profile min
/codey profile mid
/codey profile max
```

Current behavior:

- `silent`: manual reactions only
- `min`: startup, thinking, errors, success, shutdown
- `mid`: min + tool start/success reactions
- `max`: broader expression palette across tool events

### 5. Add cooldown/throttling controls

The queue gap is currently hardcoded. Expose it via command or environment:

```text
/codey cooldown 1000
```

```bash
PI_CODEY_COOLDOWN_MS=1000
```

Useful if Codey gets overwhelmed by rapid events.

### 6. Make the tool schema stricter

The `blueprint` parameter is currently a plain string. Use a literal union if supported cleanly:

```ts
blueprint: Type.Union([
  Type.Literal("ack"),
  Type.Literal("hello"),
  // ...
])
```

This gives the model better tool-call guidance.

### 7. Add README GIF/video/demo section

A short demo video or GIF would improve npm/GitHub discoverability:

```md
## Demo

Pi thinking → Codey reacts → tool succeeds → Codey celebrates
```

This is especially useful because pi-codey is a hardware/agent integration.

## Product ideas

### 8. More semantic reactions

Map more Pi events to reactions:

- user message received → `ack`
- assistant thinking → `think`
- tool started → `curious`
- tool failed → `error`
- task completed → `success`
- session idle → `idle`

Profiles could control how expressive the behavior is.

### 9. Add `/codey say` if possible

If Codey supports text display or speech-like output, add:

```text
/codey say hello
```

Even just showing text on the display would be useful and fun.

### 10. Add custom user blueprints/config

Allow users to configure event mappings with a file such as:

```json
{
  "onSessionStart": "hello",
  "onAgentStart": "think",
  "onAgentEnd": "success",
  "onToolError": "error"
}
```

Possible config names:

- `.codeyrc.json`
- `codey.config.json`
- Pi settings integration later

## Engineering improvements

### 11. Split extension into smaller modules

Current `extensions/pi-codey.ts` is fine, but eventually split it into smaller modules:

```text
extensions/pi-codey.ts
src/pi-extension/
  blueprints.ts
  serial.ts
  commands.ts
  state.ts
```

This would make testing and iteration easier.

### 12. Add basic tests

Useful test coverage:

- blueprint validation
- command parsing
- root path detection
- port override behavior
- queue/cooldown behavior

### 13. Add CI

GitHub Actions could run:

- npm install
- npm pack --dry-run
- package metadata checks
- future lint/tests

This would catch broken package publishes earlier.

## Suggested next three

Practical first improvements:

1. `/codey test`
2. better flash/trigger error messages
3. `/codey detect`
