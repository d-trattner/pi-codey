'use strict';

const ONLINE_PROTOCOL_ID = 0x28;
const ONLINE_SEND = 0x00;
const ONLINE_READ = 0x01;

function packet(payload) {
  const bytes = Array.from(Buffer.from(payload));
  const len = bytes.length;
  const headerSum = (0xf3 + (len & 0xff) + ((len >> 8) & 0xff)) & 0xff;
  const sum = bytes.reduce((acc, byte) => acc + byte, 0) & 0xff;
  return Buffer.from([0xf3, headerSum, len & 0xff, (len >> 8) & 0xff, ...bytes, sum, 0xf4]);
}

function onlineRawFrame(script, { idx = 0, service = ONLINE_SEND } = {}) {
  const scriptBytes = Buffer.from(String(script), 'utf8');
  const payload = Buffer.from([
    ONLINE_PROTOCOL_ID,
    service,
    idx & 0xff,
    (idx >> 8) & 0xff,
    scriptBytes.length & 0xff,
    (scriptBytes.length >> 8) & 0xff,
    ...scriptBytes,
  ]);
  return packet(payload);
}

function onlineCallFrame(fn, args = [], options = {}) {
  return onlineRawFrame(`${fn}(${args.join(',')})`, options);
}

const ONLINE_MODE_PACKET = packet([0x0d, 0x00, 0x03]);
const OFFLINE_MODE_PACKET = packet([0x0d, 0x00, 0x00]);
const GET_MODE_PACKET = packet([0x0d, 0x80]);

// Backwards-compatible name used by the rest of the library.
const scriptFrame = onlineRawFrame;

module.exports = {
  ONLINE_PROTOCOL_ID,
  ONLINE_SEND,
  ONLINE_READ,
  ONLINE_MODE_PACKET,
  OFFLINE_MODE_PACKET,
  GET_MODE_PACKET,
  packet,
  onlineRawFrame,
  onlineCallFrame,
  scriptFrame,
};
