'use strict';

const { scriptFrame } = require('./frame');
const { MLinkSerial } = require('./mlink');
const { BLUEPRINTS } = require('./blueprints');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const PIXEL_FONT = {
  A:['111','101','111','101','101'], B:['110','101','110','101','110'], C:['111','100','100','100','111'],
  D:['110','101','101','101','110'], E:['111','100','110','100','111'], F:['111','100','110','100','100'],
  G:['111','100','101','101','111'], H:['101','101','111','101','101'], I:['111','010','010','010','111'],
  J:['001','001','001','101','111'], K:['101','101','110','101','101'], L:['100','100','100','100','111'],
  M:['101','111','111','101','101'], N:['101','111','111','111','101'], O:['111','101','101','101','111'],
  P:['111','101','111','100','100'], Q:['111','101','101','111','001'], R:['111','101','111','110','101'],
  S:['111','100','111','001','111'], T:['111','010','010','010','010'], U:['101','101','101','101','111'],
  V:['101','101','101','101','010'], W:['101','101','111','111','101'], X:['101','101','010','101','101'],
  Y:['101','101','010','010','010'], Z:['111','001','010','100','111'],
  '0':['111','101','101','101','111'], '1':['010','110','010','010','111'], '2':['111','001','111','100','111'],
  '3':['111','001','111','001','111'], '4':['101','101','111','001','001'], '5':['111','100','111','001','111'],
  '6':['111','100','111','101','111'], '7':['111','001','010','010','010'], '8':['111','101','111','101','111'],
  '9':['111','101','111','001','111'], '!':['010','010','010','000','010'], '?':['111','001','011','000','010'],
  '.':['000','000','000','000','010'], '-':['000','000','111','000','000'], ' ':['000','000','000','000','000']
};

function jsString(value) {
  return JSON.stringify(String(value));
}

function clamp(n, min = 0, max = 255) {
  return Math.max(min, Math.min(max, Number(n)));
}

function pixelTextScript(text, { hold = 0.9 } = {}) {
  const clean = String(text).toUpperCase().replace(/[^A-Z0-9!? .-]/g, ' ');
  const pages = [];
  for (let i = 0; i < clean.length; i += 4) pages.push(clean.slice(i, i + 4));
  return `import codey, time\nFONT=${JSON.stringify(PIXEL_FONT)}\nPAGES=${JSON.stringify(pages.length ? pages : [' '])}\ndef draw(txt):\n    codey.display.clear()\n    x=0\n    for ch in txt:\n        pat=FONT.get(ch,FONT.get(' '))\n        for y,row in enumerate(pat):\n            for dx,v in enumerate(row):\n                if v=='1':\n                    codey.display.set_pixel(x+dx,y+1,True)\n        x += 4\nfor p in PAGES:\n    draw(p)\n    time.sleep(${Number(hold)})`;
}

const COLORS = {
  red: [255, 0, 0],
  orange: [255, 80, 0],
  yellow: [255, 180, 0],
  green: [0, 255, 70],
  cyan: [0, 180, 255],
  blue: [0, 80, 255],
  purple: [160, 0, 255],
  pink: [255, 0, 120],
  white: [255, 255, 255],
  off: [0, 0, 0],
};

const FACES = {
  eyes: '00003c7e7e3c000000003c7e7e3c0000',
  happy: '000024247e7e3c00000024247e7e3c0000',
  thinking: '0000001818000000000018180000181800',
  success: '00000002060c18000000180c0602000000',
  warning: '0018181818180018000018181818180018',
  sad: '00003c7e7e24000000003c7e7e24000000',
  blank: '0000000000000000000000000000000000',
};

const MOODS = {
  hello: { color: 'cyan', notes: [72, 76, 79], face: 'eyes' },
  happy: { color: 'green', notes: [72, 76, 79, 84], face: 'happy' },
  thinking: { color: 'blue', notes: [60, 64], face: 'thinking' },
  success: { color: 'green', notes: [67, 72, 79], face: 'success' },
  warning: { color: 'orange', notes: [72, 69, 72], face: 'warning' },
  error: { color: 'red', notes: [60, 55, 48], face: 'warning' },
  sad: { color: 'purple', notes: [64, 60, 57], face: 'sad' },
  celebrate: { color: 'pink', notes: [72, 76, 79, 84, 79], face: 'happy' },
};

class CodeyRocky {
  constructor(options = {}) {
    this.transport = options.transport || new MLinkSerial(options);
    this.idx = 1;
    this.defaultPause = Number(options.pause || 60);
  }

  async connect() {
    // Do not switch modes here. mBlock must put Codey into Live mode first;
    // direct mode switching can interrupt Codey's main loop and blank the face.
    return this.transport.open();
  }

  async close() {
    return this.transport.close();
  }

  async run(script, options = {}) {
    const frame = scriptFrame(script, {
      idx: this.idx++ & 0xffff,
      response: Boolean(options.response),
    });
    if (!this.transport.connectedPort) await this.connect();
    await this.transport.write(frame);
    if (options.pause !== false) await sleep(Number(options.pause || this.defaultPause));
  }

  async sequence(scripts, pause = this.defaultPause) {
    for (const script of scripts) await this.run(script, { pause });
  }

  async clear() {
    await this.run("codey.display.clear()\ncodey.led.off()");
  }

  async display(text) {
    await this.run(pixelTextScript(text, { hold: 1.2 }), { pause: 1300 });
  }

  async face(name = 'eyes') {
    const image = FACES[name] || FACES.eyes;
    await this.run(`codey.display.show_image(${jsString(image)})`);
  }

  async image(hex) {
    await this.run(`codey.display.show_image(${jsString(hex)})`);
  }

  async scroll(text) {
    const pages = Math.max(1, Math.ceil(String(text).length / 4));
    await this.run(pixelTextScript(text, { hold: 0.75 }), { pause: pages * 800 });
  }

  async led(r, g, b) {
    if (typeof r === 'string') [r, g, b] = COLORS[r] || COLORS.white;
    await this.run(`codey.led.show(${clamp(r)}, ${clamp(g)}, ${clamp(b)})`);
  }

  async ledOff() {
    await this.run('codey.led.off()');
  }

  async note(note = 72, duration = 0.18) {
    // Silent by design: pi-codey avoids speaker beeps/sounds.
    await sleep(Math.max(0, Number(duration) * 1000));
  }

  async beep() {
    // Silent by design.
  }

  async playNotes(notes = [72, 76, 79], duration = 0.14) {
    // Silent by design: keep API compatibility without using Codey's speaker.
    await sleep(Math.max(0, notes.length * Number(duration) * 1000));
  }

  async melody(name, fallback = null) {
    // Use Codey's built-in wave files, but avoid synthetic beep/note fallbacks.
    await this.run(`\ntry:\n    codey.speaker.play_melody(${jsString(name)})\nexcept Exception:\n    pass\n`, { pause: 700 });
  }

  async motors(left = 0, right = 0) {
    // Drive left/right wheels independently; opposite signs rotate in place.
    await this.run(`\ntry:\n    rocky.drive(${Number(left)}, ${Number(right)})\nexcept Exception:\n    try:\n        rocky.run(${Number(left)}, ${Number(right)})\n    except Exception:\n        pass\n`);
  }

  async rotate(direction = 1, speed = 30, duration = 0.2) {
    const left = direction >= 0 ? speed : -speed;
    const right = -left;
    await this.run(`\ntry:\n    rocky.drive(${Number(left)}, ${Number(right)})\n    time.sleep(${Number(duration)})\n    rocky.stop()\nexcept Exception:\n    pass\n`, { pause: Number(duration) * 1000 + 100 });
  }

  async stopMotors() {
    await this.run(`\ntry:\n    rocky.stop()\nexcept Exception:\n    try:\n        rocky.run(0, 0)\n    except Exception:\n        pass\n`);
  }

  async react(mood = 'happy', message = '') {
    const spec = MOODS[mood] || MOODS.happy;
    await this.led(spec.color);
    await this.face(spec.face);
    await this.playNotes(spec.notes, 0.12);
    if (message) await this.scroll(message);
  }

  async say(message, options = {}) {
    const mood = options.mood || 'hello';
    await this.react(mood, message);
  }

  async blueprint(name, message = '', options = {}) {
    const blueprint = BLUEPRINTS[name];
    if (!blueprint) throw new Error(`Unknown Codey blueprint: ${name}`);
    for (const step of blueprint.steps) {
      if (step.action === 'led') await this.led(step.color || step.r, step.g, step.b);
      else if (step.action === 'ledOff') await this.ledOff();
      else if (step.action === 'face') await this.face(step.name);
      else if (step.action === 'image') await this.image(step.hex);
      else if (step.action === 'display') await this.display(message || step.text || '');
      else if (step.action === 'scroll') await this.scroll(message || step.text || '');
      else if (step.action === 'notes') await this.playNotes(step.notes, step.duration || 0.12);
      else if (step.action === 'melody') await this.melody(step.name, step.fallback);
      else if (step.action === 'note') await this.note(step.note, step.duration || 0.12);
      else if (step.action === 'clear') await this.clear();
      else if (step.action === 'pause') await sleep(step.ms || 250);
      else if (step.action === 'run') await this.run(step.code);
    }

    const autoIdle = options.autoIdle !== false && !['idle', 'off'].includes(name);
    if (autoIdle) {
      await sleep(options.idleDelayMs || blueprint.idleDelayMs || 1800);
      await this.blueprint('idle', '', { autoIdle: false });
    }
  }

  async natural(kind, message = '') {
    if (BLUEPRINTS[kind]) return this.blueprint(kind, message);
    return this.react(kind, message);
  }
}

module.exports = {
  CodeyRocky,
  MLinkSerial,
  COLORS,
  FACES,
  MOODS,
  BLUEPRINTS,
};
