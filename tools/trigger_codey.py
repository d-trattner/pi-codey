#!/usr/bin/env python3
"""Trigger an onboard Codey blueprint without re-uploading main.py.

Uses mBlock's documented/installed Upload Mode Broadcast protocol:
payload = [0x03] + JSON({message,value}) UTF-8 + NUL, wrapped in f3/f4.
The onboard program must use @event.upload_mode_message('<blueprint>').
"""
from __future__ import annotations

import argparse
import json
import time
import serial

BLUEPRINTS = [
    'ack', 'hello', 'ready', 'think', 'curious', 'notify', 'success',
    'celebrate', 'wow', 'laugh', 'warn', 'error', 'angry', 'sad',
    'sleepy', 'bored', 'dizzy', 'screaming', 'fear', 'thank_you', 'bye', 'idle'
]
MESSAGES = BLUEPRINTS + ['sound']


def packet(payload: bytes) -> bytes:
    length = len(payload)
    return bytes([
        0xF3,
        (0xF3 + (length & 0xFF) + ((length >> 8) & 0xFF)) & 0xFF,
        length & 0xFF,
        (length >> 8) & 0xFF,
    ]) + payload + bytes([sum(payload) & 0xFF, 0xF4])


def trigger_frame(message: str, value: str = '') -> bytes:
    body = json.dumps({'message': message, 'value': value}, separators=(',', ':')).encode('utf-8')
    return packet(bytes([0x03]) + body + b'\x00')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('blueprint', choices=MESSAGES)
    parser.add_argument('--value', default=None)
    parser.add_argument('--port', default='COM3')
    parser.add_argument('--verbose', action='store_true')
    args = parser.parse_args()

    if args.blueprint == 'sound' and not args.value:
        parser.error('sound requires --value, e.g. sound --value ready')
    if args.blueprint == 'sound':
        value = f'{args.value}|{time.time()}'
    else:
        value = args.value if args.value is not None else str(time.time())
    frame = trigger_frame(args.blueprint, value)
    if args.verbose:
        print(frame.hex(' '))
    with serial.Serial(args.port, 115200, timeout=0.5, write_timeout=1) as ser:
        ser.write(frame)
        ser.flush()
        time.sleep(0.1)
    print(f"Triggered {args.blueprint} on {args.port}")
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
