'use strict';

/**
 * Natural reaction blueprints for Codey Rocky.
 *
 * These are intentionally small "body language" recipes the assistant can use
 * consistently instead of improvising raw LED/motion/display commands every time.
 * Each step maps to CodeyRocky methods in src/index.js.
 */

const IDLE_IMAGES = {
  // Based on Makeblock's official Codey Rocky MicroPython example idle frames.
  eyes: '00003c7e7e3c000000003c7e7e3c0000',
  blinkWide: '0000183c3c1800000000183c3c180000',
  blinkMid: '0000181c1c1800000000181c1c180000',
  blinkThin: '00001018181000000000101818100000',
  blinkTiny: '00000808080800000000080808080000',
  lookLeft: '003c7e7e3c00000000003c7e7e3c000000',
  lookRight: '0000003c7e7e3c00000000003c7e7e3c',
};

const IDLE_CYCLE = [
  { action: 'image', hex: IDLE_IMAGES.eyes },
  { action: 'pause', ms: 2200 },
  { action: 'image', hex: IDLE_IMAGES.blinkMid },
  { action: 'pause', ms: 60 },
  { action: 'image', hex: IDLE_IMAGES.blinkTiny },
  { action: 'pause', ms: 140 },
  { action: 'image', hex: IDLE_IMAGES.blinkWide },
  { action: 'pause', ms: 60 },
  { action: 'image', hex: IDLE_IMAGES.eyes },
  { action: 'pause', ms: 1400 },
  { action: 'image', hex: IDLE_IMAGES.lookLeft },
  { action: 'pause', ms: 650 },
  { action: 'image', hex: IDLE_IMAGES.eyes },
  { action: 'pause', ms: 1800 },
  { action: 'image', hex: IDLE_IMAGES.blinkThin },
  { action: 'pause', ms: 100 },
  { action: 'image', hex: IDLE_IMAGES.eyes },
  { action: 'pause', ms: 1100 },
  { action: 'image', hex: IDLE_IMAGES.lookRight },
  { action: 'pause', ms: 650 },
  { action: 'image', hex: IDLE_IMAGES.eyes },
];

const BLUEPRINTS = {
  acknowledge: {
    description: 'I heard you / command received.',
    idleDelayMs: 900,
    steps: [
      { action: 'led', color: 'cyan' },
      { action: 'face', name: 'eyes' },
      { action: 'melody', name: 'hi.wav', fallback: [72] },
    ],
  },

  thinking: {
    description: 'Working/thinking; calm blue pulse.',
    idleDelayMs: 1200,
    steps: [
      { action: 'led', color: 'blue' },
      { action: 'face', name: 'thinking' },
      { action: 'melody', name: 'curious.wav', fallback: [60, 64] },
    ],
  },

  success: {
    description: 'Task completed successfully.',
    idleDelayMs: 1800,
    steps: [
      { action: 'led', color: 'green' },
      { action: 'face', name: 'success' },
      { action: 'melody', name: 'right.wav', fallback: [67, 72, 79] },
    ],
  },

  warning: {
    description: 'Careful / attention needed.',
    idleDelayMs: 2200,
    steps: [
      { action: 'led', color: 'orange' },
      { action: 'face', name: 'warning' },
      { action: 'melody', name: 'warning.wav', fallback: [72, 69, 72] },
    ],
  },

  error: {
    description: 'Something failed.',
    idleDelayMs: 2600,
    steps: [
      { action: 'led', color: 'red' },
      { action: 'face', name: 'warning' },
      { action: 'melody', name: 'wrong.wav', fallback: [60, 55, 48] },
      { action: 'face', name: 'sad' },
    ],
  },

  celebrate: {
    description: 'Excited positive celebration.',
    idleDelayMs: 2500,
    steps: [
      { action: 'led', color: 'pink' },
      { action: 'face', name: 'happy' },
      { action: 'melody', name: 'yeah.wav', fallback: [72, 76, 79, 84, 79] },
      { action: 'led', color: 'green' },
      { action: 'face', name: 'success' },
    ],
  },

  notify: {
    description: 'Neutral notification / look here.',
    idleDelayMs: 2200,
    steps: [
      { action: 'led', color: 'white' },
      { action: 'face', name: 'eyes' },
      { action: 'melody', name: 'prompt tone.wav', fallback: [76, 76] },
    ],
  },

  sad: {
    description: 'Gentle negative / unavailable.',
    idleDelayMs: 2600,
    steps: [
      { action: 'led', color: 'purple' },
      { action: 'face', name: 'sad' },
      { action: 'melody', name: 'sad.wav', fallback: [64, 60, 57] },
    ],
  },

  idle: {
    description: 'Return to calm animated idle: blue glow, repeated blinking and small look-around.',
    steps: [
      { action: 'led', r: 0, g: 60, b: 180 },
      ...IDLE_CYCLE,
      ...IDLE_CYCLE,
      ...IDLE_CYCLE,
      ...IDLE_CYCLE,
    ],
  },

  off: {
    description: 'Turn lights/display quiet.',
    steps: [
      { action: 'clear' },
      { action: 'ledOff' },
    ],
  },
};

module.exports = { BLUEPRINTS };
