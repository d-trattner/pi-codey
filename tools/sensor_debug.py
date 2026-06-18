#!/usr/bin/env python3
"""Temporarily upload a Codey sensor diagnostic program and stream readings.

This overwrites /flash/main.py for diagnostics. Re-run `/codey install` afterwards
(or python tools/flash_codey.py generated/codey_blueprints.py) to restore pi-codey.
"""
from __future__ import annotations

import argparse
import time
from pathlib import Path

import serial

from flash_codey import UPLOAD_MODE_COMMAND, read_protocol_message, serialize_upload

SENSOR_PROGRAM = r'''
import codey
import rocky
import time

print('codey-sensors: started')
while True:
    try:
        ax = codey.motion_sensor.get_acceleration('x')
        ay = codey.motion_sensor.get_acceleration('y')
        az = codey.motion_sensor.get_acceleration('z')
        total = abs(ax) + abs(ay) + abs(az)
    except Exception:
        ax = ay = az = total = -1
    try:
        upright = codey.motion_sensor.is_upright()
    except Exception:
        upright = None
    try:
        shake = codey.motion_sensor.get_shake_strength()
    except Exception:
        shake = -1
    try:
        loud = codey.sound_sensor.get_loudness()
    except Exception:
        loud = -1
    try:
        ir = rocky.color_ir_sensor.get_reflected_infrared()
    except Exception:
        ir = -1
    try:
        grey = rocky.color_ir_sensor.get_greyness()
    except Exception:
        grey = -1
    print('accel=%.2f,%.2f,%.2f total=%.2f upright=%s shake=%s loud=%s floor_ir=%s grey=%s' % (ax, ay, az, total, upright, shake, loud, ir, grey))
    time.sleep(0.25)
'''


def upload_code(ser: serial.Serial, code: str, verbose: bool = False) -> None:
    if verbose:
        print('>', UPLOAD_MODE_COMMAND.hex(' '))
    ser.write(UPLOAD_MODE_COMMAND)
    ser.flush()
    time.sleep(0.3)
    read_protocol_message(ser)
    for packet in serialize_upload(code):
        if verbose:
            print('>', packet.hex(' '))
        ser.write(packet)
        ser.flush()
        time.sleep(0.04)
        read_protocol_message(ser)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', default='COM3')
    parser.add_argument('--seconds', type=float, default=15)
    parser.add_argument('--output', type=Path, default=None)
    parser.add_argument('--verbose', action='store_true')
    args = parser.parse_args()

    lines: list[str] = []
    with serial.Serial(args.port, 115200, timeout=0.5, write_timeout=2) as ser:
        print(f'Uploading sensor diagnostic to {args.port} for {args.seconds:g}s...')
        upload_code(ser, SENSOR_PROGRAM, args.verbose)
        print('Reading sensor output... Move/lift/shake Codey now.')
        end = time.time() + args.seconds
        while time.time() < end:
            _, text = read_protocol_message(ser)
            if text:
                print(text, end='')
                lines.extend(text.splitlines())

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text('\n'.join(lines) + ('\n' if lines else ''), encoding='utf-8')
        print(f'Wrote sensor log: {args.output}')
    print('Done. Re-run /codey install to restore pi-codey onboard program.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
