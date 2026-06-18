# pi-codey

Installable Pi extension + onboard controller for **Makeblock Codey Rocky** reactions.

`pi-codey` lets Pi trigger Codey Rocky reaction blueprints over USB serial without mBlock during normal use. The onboard Codey program stores the expressive blueprints; Pi only sends tiny trigger packets such as `success`, `think`, or `error`. Reactions avoid annoying synthetic beeps while still allowing Codey's built-in wave/melody files.

## What it includes

- Pi extension source: `extensions/pi-codey.ts`
- Onboard Codey blueprint program: `generated/codey_blueprints.py`
- Direct uploader: `tools/flash_codey.py`
- Trigger CLI: `tools/trigger_codey.py`
- npm binaries: `pi-codey`, `pi-codey-flash`

## Install as a Pi package

From npm:

```bash
pi install pi-codey
```

From a local checkout while developing:

```bash
pi install .
```

For project-local install:

```bash
pi install -l .
```

Then reload/restart Pi.

Note: this repo is intended to be installed as a Pi package while developing (`pi install .` or a global local-path install). Do not also copy the same extension into `.pi/extensions/`, because that would load a second copy and duplicate the `codey_react` tool.

## Flash Codey

After installing/reloading the extension, run in Pi:

```text
/codey install
```

or from a shell:

```bash
npm run flash
# or
node bin/pi-codey-flash.js --port COM3
# or
python tools/flash_codey.py generated/codey_blueprints.py --port COM3
```

This uploads `generated/codey_blueprints.py` to Codey as `/flash/main.py`.

## Pi commands

```text
/codey status
/codey install
/codey detect
/codey detect --use
/codey sensors
/codey sensors 20
/codey test
/codey success
/codey celebrate
/codey idle
/codey play ready
/codey play prompt tone
/codey off
/codey on
/codey silent
/codey min
/codey mid
/codey max
/codey profile silent
/codey profile min
/codey profile mid
/codey profile max
/codey auto-off
/codey auto-on
/codey port COM3
```

## Detect Codey port

```text
/codey detect        # show likely Codey serial port
/codey detect --use  # detect and set active port
```

Detection scores serial ports using Codey/Makeblock/CH340/WCH USB metadata.

## Sensor diagnostics

To tune sensor thresholds, run:

```text
/codey sensors      # records 15 seconds
/codey sensors 30   # records 30 seconds
```

This temporarily uploads a diagnostic program, records readings to `.pi/codey-sensors-last.txt`, and prints the last readings in Pi. Move/lift/shake Codey while it is recording.

Important: diagnostics overwrite the onboard pi-codey program. Restore afterwards with:

```text
/codey install
```

## Sensor reactions

The onboard program can also react to local Codey sensors:

```text
shake          → dizzy
loud sound     → screaming
lift/airborne  → fear
put down again → thank_you
```

These are configured in `.pi/codey.config.json`:

```json
"sensors": {
  "enabled": true,
  "shake": { "enabled": true, "blueprint": "dizzy", "threshold": 25, "cooldownMs": 5000 },
  "sound": { "enabled": true, "blueprint": "screaming", "threshold": 85, "cooldownMs": 5000 },
  "lift": {
    "enabled": true,
    "fearBlueprint": "fear",
    "putDownBlueprint": "thank_you",
    "lowAccel": 4,
    "highAccel": 22,
    "deltaAccel": 10,
    "useFloorIr": true,
    "floorIrThreshold": 20,
    "floorIrStableThreshold": 60,
    "offFloorStableSeconds": 0.6,
    "onFloorStableSeconds": 1.0,
    "stableMin": 7,
    "stableMax": 13,
    "cooldownMs": 5000
  }
}
```

Sensor checks run during idle waits so short shake/lift events are not missed. Lift detection uses floor IR when enabled and requires stable off-floor/on-floor readings before triggering `fear` or `thank_you`; acceleration/orientation is the fallback.

## Long-running task reaction

When automatic reactions are enabled, Codey triggers a `bored` blueprint once if an agent turn runs longer than 30 seconds. The timer is cancelled when the turn ends.

Manual trigger:

```text
/codey bored
```

Configure it in `.pi/codey.config.json` like any other blueprint:

```json
"bored": { "sound": "sigh", "movement": false }
```

## Test sequence

Run a quick validation sequence:

```text
/codey test
```

This queues:

```text
hello → think → success → idle
```

## Auto reaction profiles

```text
/codey silent  # manual reactions only
/codey min     # startup, thinking, errors, success, shutdown
/codey mid     # min + tool start/success reactions
/codey max     # broader expression palette across tool events

# Long form also works:
/codey profile silent
/codey profile min
/codey profile mid
/codey profile max
```

`/codey status` shows the current profile.

## External trigger CLI

```bash
python tools/trigger_codey.py success --port COM3
python tools/trigger_codey.py think --port COM3
python tools/trigger_codey.py idle --port COM3
python tools/trigger_codey.py sound --value "ready" --port COM3
```

## Blueprints

```text
ack, hello, ready, think, curious, notify, success,
celebrate, wow, laugh, warn, error, angry, sad,
sleepy, bored, dizzy, screaming, fear, thank_you, bye, idle
```

## Blueprint configuration

Create a Pi project config to customize sounds and movement before flashing:

```bash
mkdir -p .pi
cp codey.config.example.json .pi/codey.config.json
```

For quick local development, a repo-root `codey.config.json` also works.

Example:

```json
{
  "movement": true,
  "movementSpeed": 0.55,
  "sounds": true,
  "blueprints": {
    "success": { "sound": "yummy", "movement": true },
    "think": { "sound": "curious", "movement": false },
    "celebrate": { "sound": "yeah", "movement": false }
  }
}
```

Then flash:

```text
/codey install
```

Options:

- `movement`: global default for Rocky wheel/body movement
- `movementSpeed`: global movement speed multiplier from `0` to `1`; default is `0.55` for softer movement
- `sounds`: global default for built-in wave/melody playback
- `blueprints.<name>.movement`: override movement for one blueprint
- `blueprints.<name>.movementSpeed`: override speed for one blueprint
- `blueprints.<name>.sounds`: override sounds for one blueprint
- `blueprints.<name>.sound`: replace one blueprint's sound, e.g. `"score"`, `"level up"`, or `null` for no sound

Config lookup order:

1. `.pi/codey.config.json` in the current Pi project
2. `codey.config.json` in the current Pi project/repo
3. `codey.config.json` in the installed package root, mainly for local development

This keeps npm installs clean: users configure the extension from their project, not by editing `node_modules`. The example file is committed and shipped.

## Sounds

Play a built-in Codey wave/melody file directly:

```text
/codey play ready
/codey play prompt tone
/codey play level up
```

Available built-in sounds:

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

## Environment

```bash
PI_CODEY_PORT=COM3       # default serial port
PI_CODEY_AUTO=0          # disable automatic Pi lifecycle reactions
PI_CODEY_ENABLED=0       # disable extension on startup
PI_CODEY_ROOT=/path      # package root override for development
```

## Development and publishing

```bash
npm run packcheck      # inspect the npm package contents
pi install .           # install the current checkout into Pi
npm publish            # publish when logged in to npm
```

The npm package intentionally includes only the runtime files plus `extensions/pi-codey.ts`.

## Notes

- Normal operation does not require mBlock.
- Codey must be connected over USB and visible as a serial port.
- The trigger path uses Codey/mBlock's upload-mode message protocol packet format, but not the mBlock app.
