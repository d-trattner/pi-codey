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
/codey success
/codey celebrate
/codey idle
/codey sound ready.wav
/codey sound prompt tone.wav
/codey off
/codey on
/codey profile silent
/codey profile min
/codey profile mid
/codey profile max
/codey auto-off
/codey auto-on
/codey port COM3
```

## Auto reaction profiles

```text
/codey profile silent  # manual reactions only
/codey profile min     # startup, thinking, errors, success, shutdown
/codey profile mid     # min + tool start/success reactions
/codey profile max     # broader expression palette across tool events
```

`/codey status` shows the current profile.

## External trigger CLI

```bash
python tools/trigger_codey.py success --port COM3
python tools/trigger_codey.py think --port COM3
python tools/trigger_codey.py idle --port COM3
python tools/trigger_codey.py sound --value "ready.wav" --port COM3
```

## Blueprints

```text
ack, hello, ready, think, curious, notify, success,
celebrate, wow, laugh, warn, error, angry, sad,
sleepy, bye, idle
```

## Sounds

Play a built-in Codey wave/melody file directly:

```text
/codey sound ready.wav
/codey sound prompt tone.wav
```

Available built-in sounds:

```text
hello.wav, hi.wav, bye.wav, yeah.wav, wow.wav, laugh.wav,
hum.wav, sad.wav, sigh.wav, annoyed.wav, angry.wav,
surprised.wav, yummy.wav, curious.wav, embarrassed.wav,
ready.wav, sprint.wav, sleepy.wav, meow.wav, start.wav,
switch.wav, beeps.wav, buzzing.wav, exhaust.wav, explosion.wav,
gotcha.wav, hurt.wav, jump.wav, laser.wav, level up.wav,
low energy.wav, metal clash.wav, prompt tone.wav, right.wav,
wrong.wav, ring.wav, score.wav, shot.wav, step_1.wav,
step_2.wav, wake.wav, warning.wav
```

The `.wav` suffix is optional for Codey itself, but examples include it for clarity.

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
