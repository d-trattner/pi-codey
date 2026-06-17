#!/usr/bin/env python3
"""Upload a Python program to Codey Rocky without the mBlock UI.

Protocol based on ernestoferro/flash-codey-rocky, itself based on meoser.
Writes the given file to /flash/main.py over Codey's serial port.
"""
from __future__ import annotations

import argparse
import struct
import sys
import time
from pathlib import Path
from typing import Iterator, Optional, Tuple

import serial

MEOS_FRAME_HEAD = b"\xf3"
MEOS_FRAME_END = b"\xf4"
FRAME_NECK = b"\x00\x5e"
UPLOAD_MODE_COMMAND = b"\xf3\xf6\x03\x00\x0d\x00\x00\x0d\xf4"


def frame_checksum(data: bytes) -> bytes:
    return struct.pack("B", sum(data) & 0xFF)


def file_checksum(data: bytes) -> bytes:
    checksum = [0, 0, 0, 0]
    for i, byte in enumerate(data):
        checksum[i % 4] ^= byte
    return bytes(checksum)


def protocol_packet(payload: bytes) -> bytes:
    length = struct.pack("<H", len(payload))
    return b"".join([
        MEOS_FRAME_HEAD,
        frame_checksum(MEOS_FRAME_HEAD + length),
        length,
        payload,
        frame_checksum(payload),
        MEOS_FRAME_END,
    ])


def file_header_packet(path: str, content: bytes) -> bytes:
    command_data = b"".join([
        struct.pack("B", 0x00),              # file type
        struct.pack("<L", len(content)),     # file size
        file_checksum(content),
        path.encode("utf-8"),
    ])
    payload = b"".join([
        struct.pack("B", 0x01),              # file protocol id
        FRAME_NECK,
        struct.pack("B", 0x01),              # HEAD
        struct.pack("<H", len(command_data)),
        command_data,
    ])
    return protocol_packet(payload)


def file_body_packet(offset: int, chunk: bytes) -> bytes:
    command_data = struct.pack("<L", offset) + chunk
    payload = b"".join([
        struct.pack("B", 0x01),              # file protocol id
        FRAME_NECK,
        struct.pack("B", 0x02),              # BODY
        struct.pack("<H", len(command_data)),
        command_data,
    ])
    return protocol_packet(payload)


def serialize_upload(code: str, target: str = "/flash/main.py", chunk_size: int = 100) -> Iterator[bytes]:
    content = code.encode("utf-8")
    yield file_header_packet(target, content)
    for offset in range(0, len(content), chunk_size):
        yield file_body_packet(offset, content[offset:offset + chunk_size])


def read_protocol_message(ser: serial.Serial) -> Tuple[Optional[bytes], Optional[str]]:
    start = ser.read()
    if start == b"\xf3":
        data = start + b"".join(iter(ser.read, b"\xf4")) + b"\xf4"
        return data, None
    if start:
        return None, (start + ser.read(1000)).decode("utf-8", "replace")
    return None, None


def upload(port: str, code_path: Path, verbose: bool = False, run_tail: bool = False) -> None:
    code = code_path.read_text(encoding="utf-8")
    with serial.Serial(port, 115200, timeout=1, write_timeout=2) as ser:
        if verbose:
            print(">", UPLOAD_MODE_COMMAND.hex(" "))
        ser.write(UPLOAD_MODE_COMMAND)
        ser.flush()
        time.sleep(0.3)
        read_protocol_message(ser)

        print(f"Uploading {code_path} to {port}:/flash/main.py ({len(code.encode('utf-8'))} bytes)")
        for packet in serialize_upload(code):
            if verbose:
                print(">", packet.hex(" "))
            ser.write(packet)
            ser.flush()
            time.sleep(0.04)
            response, text = read_protocol_message(ser)
            if verbose and response:
                print("<", response.hex(" "))
            if text:
                print(text, end="")

        print("Upload complete.")
        if run_tail:
            print("Reading serial output; Ctrl+C to stop.")
            while True:
                _, text = read_protocol_message(ser)
                if text:
                    print(text, end="")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path, help="Python file to upload as /flash/main.py")
    parser.add_argument("--port", default="COM3")
    parser.add_argument("--verbose", action="store_true")
    parser.add_argument("--tail", action="store_true")
    args = parser.parse_args(argv)
    upload(args.port, args.file, args.verbose, args.tail)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
