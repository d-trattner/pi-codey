# pi-codey improvement ideas

## High-value improvements

### 1. Add a proper `/codey test` command

A command that runs through a short reaction sequence:

```text
/codey test
```

Example sequence:

```text
hello → think → success → celebrate → idle
```

Useful after install, flashing, or changing ports.

### 2. Add `/codey detect`

Users currently need to know the serial port. Add:

```text
/codey detect
```

It could scan likely serial ports and report:

```text
Found Codey candidate: COM3
```

Optionally support setting it immediately:

```text
/codey detect --use
```

### 3. Improve install/flash feedback

The extension currently runs Python helpers with ignored stdio, so failures can be vague.

Improvements:

- capture stdout/stderr
- return actual error messages
- show common causes such as “port busy”, “device not found”, or “Python not found”

This would make `/codey install` much easier to debug.

### 4. Add configurable auto-reaction profiles

Instead of only `auto on/off`, support profiles:

```text
/codey profile minimal
/codey profile expressive
/codey profile silent
```

Possible profiles:

- `minimal`: startup/error/success only
- `expressive`: think/tool/error/success/bye
- `silent`: manual only

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
