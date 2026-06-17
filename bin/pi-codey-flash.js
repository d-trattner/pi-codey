#!/usr/bin/env node
'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const portIndex = process.argv.indexOf('--port');
const port = portIndex >= 0 ? process.argv[portIndex + 1] : (process.env.PI_CODEY_PORT || process.env.CODEYX_PORT || 'COM3');
const args = [path.join(root, 'tools', 'flash_codey.py'), path.join(root, 'generated', 'codey_blueprints.py'), '--port', port];

const child = spawn('python', args, { cwd: root, stdio: 'inherit', windowsHide: true });
child.on('exit', (code) => process.exit(code ?? 1));
child.on('error', (err) => {
  console.error(err.message);
  process.exit(1);
});
