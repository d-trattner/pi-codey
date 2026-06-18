# pi-codey

Pi extension + onboard controller for **Makeblock Codey Rocky** reactions.

`pi-codey` lets Pi trigger expressive Codey Rocky reactions over USB serial. Codey runs a small onboard Python program; Pi only sends tiny trigger messages such as `think`, `success`, or `error`. Synthetic beep notes are avoided; built-in Codey wave/melody files are used where configured.

## Install

Install from npm as a Pi package:

```bash
pi install npm:pi-codey
```

Restart Pi, then detect and set the Codey serial port:

```text
/codey detect --use
```

Flash the onboard Codey program:

```text
/codey install
```

Run a quick check:

```text
/codey test
```

Update later with:

```bash
pi update npm:pi-codey
```

## Basic commands

```text
/codey status              # show current settings
/codey detect              # show likely Codey serial port
/codey detect --use        # detect and set active port
/codey port COM3           # set port manually
/codey install             # flash onboard program
/codey test                # hello → think → success → idle

/codey success             # trigger a blueprint
/codey bored
/codey idle

/codey play ready          # play a built-in Codey sound
/codey play prompt tone
```

## Auto reaction profiles

```text
/codey silent  # manual reactions only
/codey min     # startup, thinking, errors, success, shutdown
/codey mid     # min + tool start/success reactions
/codey max     # broader expression palette across tool events
```

Long form also works:

```text
/codey profile min
```

When automatic reactions are enabled, Codey also triggers `bored` once if an agent turn runs longer than 30 seconds.

## Blueprints

```text
ack, hello, ready, think, curious, notify, success,
celebrate, wow, laugh, warn, error, angry, sad,
sleepy, bored, dizzy, screaming, fear, thank_you, bye, idle
```

Manual trigger:

```text
/codey <blueprint>
```

## Sensor reactions

The onboard program can react locally, even when Pi is not sending a command:

```text
shake          → dizzy
loud sound     → screaming
lift/airborne  → fear
put down again → thank_you
```

These thresholds are configurable; see [Configuration](#configuration). If sensor behavior needs tuning, run diagnostics:

```text
/codey sensors      # record 15 seconds
/codey sensors 30   # record 30 seconds
```

This temporarily uploads a diagnostic program and writes readings to:

```text
.pi/codey-sensors-last.txt
```

Restore pi-codey afterwards:

```text
/codey install
```

## Configuration

Create a project-local config:

```bash
mkdir -p .pi
cp codey.config.example.json .pi/codey.config.json
```

Edit `.pi/codey.config.json`, then re-flash:

```text
/codey install
```

Common options:

```json
{
  "movement": false,
  "movementSpeed": 0.55,
  "sounds": true,
  "blueprints": {
    "success": { "sound": "yummy", "movement": false },
    "bored": { "sound": "sigh", "movement": false }
  },
  "sensors": {
    "enabled": true,
    "sound": { "enabled": true, "threshold": 15 },
    "lift": {
      "enabled": true,
      "useFloorIr": true,
      "floorIrThreshold": 20,
      "floorIrStableThreshold": 60
    }
  }
}
```

Config lookup order:

1. `.pi/codey.config.json` in the current Pi project
2. `codey.config.json` in the current project/repo
3. `codey.config.json` in the package root, mainly for local development

Useful config keys:

- `movement`: enable/disable Rocky wheel/body movement
- `movementSpeed`: movement speed multiplier from `0` to `1`
- `sounds`: enable/disable built-in wave playback
- `blueprints.<name>.sound`: replace a blueprint sound, e.g. `"score"`, `"level up"`, or `null`
- `blueprints.<name>.movement`: override movement per blueprint
- `sensors.*.threshold` / cooldown keys: tune sensor reactions

## Built-in sounds

Play directly with `/codey play <name>`.

```text
hello, hi, bye, yeah, wow, laugh,
hum, sad, sigh, annoyed, angry,
surprised, yummy, curious, embarrassed,
ready, sprint, sleepy, meow, start,
switch, beeps, buzzing, exhaust, explosion,
gotcha, hurt, jump, laser, level up,
low energy, metal clash, prompt tone, right,
wrong, ring, score, shot, step_1,
step_2, wake, warning
```

## Shell tools

After installing from npm, the package also provides:

```bash
pi-codey detect
pi-codey-flash --port COM3
```

From a checkout you can run helpers directly:

```bash
python tools/trigger_codey.py success --port COM3
python tools/trigger_codey.py sound --value "ready" --port COM3
python tools/flash_codey.py generated/codey_blueprints.py --port COM3
```

## Development

Use a local package install while developing:

```bash
pi install /path/to/pi-codey
```

Do not also copy the extension into `.pi/extensions/`; that loads a second copy and causes duplicate tool/command conflicts.

Useful commands:

```bash
npm run packcheck
npm publish
```

## Environment

```bash
PI_CODEY_PORT=COM3       # default serial port
PI_CODEY_AUTO=0          # start with automatic reactions disabled
PI_CODEY_ENABLED=0       # disable extension on startup
PI_CODEY_ROOT=/path      # package root override for development
```

## Notes

- Codey must be connected over USB and visible as a serial port.
- Normal operation does not require the mBlock app.
- `/codey sensors` temporarily overwrites the onboard program; run `/codey install` afterwards.
