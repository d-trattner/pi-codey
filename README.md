# pi-codey

Installable Pi extension + onboard controller for **Makeblock Codey Rocky** reactions.

`pi-codey` lets Pi trigger Codey Rocky reaction blueprints over USB serial without mBlock during normal use. The onboard Codey program stores the expressive blueprints; Pi only sends tiny trigger packets such as `success`, `think`, or `error`.

## What it includes

- Pi extension source: `.extensions/pi-codey.ts`
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

Note: the extension source lives in `.extensions/` so Pi does not auto-load it directly while also loading the installed copy from `.pi/extensions/`. Keeping a project-root `extensions/` copy after `pi install .` will cause a duplicate `codey_react` tool conflict.

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
/codey off
/codey on
/codey auto-off
/codey auto-on
/codey port COM3
```

## External trigger CLI

```bash
python tools/trigger_codey.py success --port COM3
python tools/trigger_codey.py think --port COM3
python tools/trigger_codey.py idle --port COM3
```

## Blueprints

```text
ack, hello, ready, think, curious, notify, success,
celebrate, wow, laugh, warn, error, angry, sad,
sleepy, bye, idle
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

The npm package intentionally includes only the runtime files plus `.extensions/pi-codey.ts`.

## Notes

- Normal operation does not require mBlock.
- Codey must be connected over USB and visible as a serial port.
- The trigger path uses Codey/mBlock's upload-mode message protocol packet format, but not the mBlock app.
