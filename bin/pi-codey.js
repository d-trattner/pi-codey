#!/usr/bin/env node
'use strict';

const { CodeyRocky, MLinkSerial, MOODS, BLUEPRINTS } = require('../src');

function usage() {
  console.log(`pi-codey - Codey Rocky natural reaction CLI

Usage:
  pi-codey detect
  pi-codey say <message> [mood]
  pi-codey react <mood> [message]
  pi-codey demo
  pi-codey blueprint <name> [message]
  pi-codey run <python-code>

Environment:
  PI_CODEY_MLINK_PORT=58085   mBlock/mLink socket port
  PI_CODEY_PORT=COM3          Codey serial port
`);
}

async function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || cmd === '-h' || cmd === '--help') return usage();

  if (cmd === 'detect') {
    const mlink = new MLinkSerial();
    const ports = await mlink.listPorts();
    console.log(JSON.stringify(ports, null, 2));
    await mlink.close();
    return;
  }

  const codey = new CodeyRocky();
  try {
    if (cmd === 'say') {
      const mood = MOODS[args[args.length - 1]] ? args.pop() : 'hello';
      const message = args.join(' ') || 'Hello from Codey.';
      await codey.say(message, { mood });
    } else if (cmd === 'react') {
      const mood = args.shift() || 'happy';
      await codey.react(mood, args.join(' '));
    } else if (cmd === 'demo') {
      await codey.blueprint('acknowledge');
      await codey.blueprint('thinking');
      await codey.blueprint('success', 'READY');
    } else if (cmd === 'blueprint') {
      const name = args.shift();
      if (!name || !BLUEPRINTS[name]) {
        console.log(`Available blueprints: ${Object.keys(BLUEPRINTS).join(', ')}`);
        process.exitCode = 1;
      } else {
        await codey.blueprint(name, args.join(' '));
      }
    } else if (cmd === 'run') {
      await codey.run(args.join(' '));
    } else {
      usage();
      process.exitCode = 1;
    }
  } finally {
    await codey.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
