#!/usr/bin/env python3
"""Detect likely Codey Rocky serial ports."""
from __future__ import annotations

import argparse
import json
from serial.tools import list_ports

KEYWORDS = ("codey", "makeblock", "ch340", "wch", "1a86", "7523", "usb serial", "usb-serial")


def score_port(port) -> int:
    text = " ".join(str(value or "") for value in [
        port.device,
        port.name,
        port.description,
        port.hwid,
        port.manufacturer,
        port.product,
        port.vid,
        port.pid,
    ]).lower()
    score = 0
    for keyword in KEYWORDS:
        if keyword in text:
            score += 10
    if str(port.vid or "").lower() in {"6790", "0x1a86", "1a86"}:
        score += 20
    if str(port.pid or "").lower() in {"29987", "0x7523", "7523"}:
        score += 20
    if port.device:
        score += 1
    return score


def port_info(port):
    return {
        "port": port.device,
        "name": port.name,
        "description": port.description,
        "manufacturer": port.manufacturer,
        "product": port.product,
        "hwid": port.hwid,
        "vid": f"0x{port.vid:04x}" if port.vid is not None else None,
        "pid": f"0x{port.pid:04x}" if port.pid is not None else None,
        "score": score_port(port),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="emit JSON only")
    args = parser.parse_args()

    ports = sorted((port_info(port) for port in list_ports.comports()), key=lambda item: item["score"], reverse=True)
    candidates = [port for port in ports if port["score"] >= 10]
    result = {
        "selected": candidates[0]["port"] if candidates else (ports[0]["port"] if len(ports) == 1 else None),
        "candidates": candidates,
        "ports": ports,
    }

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        if result["selected"]:
            print(f"Selected: {result['selected']}")
        elif not ports:
            print("No serial ports found.")
        else:
            print("No obvious Codey port found. Available ports:")
        for port in ports:
            marker = "*" if port["port"] == result["selected"] else " "
            print(f"{marker} {port['port']} score={port['score']} {port.get('description') or ''} {port.get('manufacturer') or ''}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
