#!/usr/bin/env python3
"""Capture real Firefox Android state through its forwarded debugging port.

Uses Python's standard library. Tested against Firefox for Android 156.
The optional native probe calls the real downloads API; it never mocks it.
"""

import argparse
import json
import socket
import time
from pathlib import Path


class RDP:
    def __init__(self, port):
        self.socket = socket.create_connection(("127.0.0.1", port), timeout=15)
        self.socket.settimeout(15)
        self.events = []
        self.receive()  # Root actor greeting.

    def receive(self):
        header = bytearray()
        while not header.endswith(b":"):
            chunk = self.socket.recv(1)
            if not chunk:
                raise EOFError("Firefox closed the debugging connection")
            header.extend(chunk)
        size = int(header[:-1])
        data = bytearray()
        while len(data) < size:
            chunk = self.socket.recv(size - len(data))
            if not chunk:
                raise EOFError("Firefox closed the debugging connection")
            data.extend(chunk)
        return json.loads(data)

    def request(self, actor, packet_type, **arguments):
        packet = json.dumps({"to": actor, "type": packet_type, **arguments}).encode()
        self.socket.sendall(str(len(packet)).encode() + b":" + packet)
        while True:
            response = self.receive()
            if response.get("from") == actor and not response.get("type"):
                if "error" in response:
                    raise RuntimeError(json.dumps(response))
                return response
            self.events.append(response)

    def evaluate(self, console, expression):
        response = self.request(console, "evaluateJSAsync", text=expression)
        result_id = response["resultID"]
        while True:
            for index, event in enumerate(self.events):
                if event.get("type") == "evaluationResult" and event.get("resultID") == result_id:
                    return self.events.pop(index)
            self.events.append(self.receive())

    def watch(self, descriptor):
        watcher = self.request(
            descriptor["actor"], "getWatcher", isServerTargetSwitchingEnabled=True
        )
        self.request(watcher["actor"], "watchTargets", targetType="frame")
        targets = [event["target"] for event in self.events if event.get("type") == "target-available-form"]
        self.events.clear()
        return watcher, targets


def native_probe(client, console, seconds):
    options = {
        "url": "https://arxiv.org/pdf/2501.00001.pdf",
        "filename": "native-api-probe.pdf",
        "saveAs": False,
    }
    expression = (
        "globalThis.__arxivNativeDownloadProbe = null;"
        f"browser.downloads.download({json.dumps(options)}).then("
        "id => globalThis.__arxivNativeDownloadProbe = {success: true, id},"
        "error => globalThis.__arxivNativeDownloadProbe = {success: false, error: String(error)});"
        "'started'"
    )
    start = client.evaluate(console, expression)
    if start.get("hasException"):
        return {"options": options, "start": start}
    deadline = time.monotonic() + seconds
    while True:
        result = client.evaluate(console, "JSON.stringify(globalThis.__arxivNativeDownloadProbe)")
        if result.get("result") != "null" or time.monotonic() >= deadline:
            break
        time.sleep(min(1, max(0, deadline - time.monotonic())))
    return {"options": options, "observation_seconds": seconds, "start": start, "last_poll": result}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, required=True, help="TCP port printed by web-ext")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--native-probe", action="store_true", help="Also request a real PDF download from the background API")
    parser.add_argument("--observation-seconds", type=float, default=15)
    args = parser.parse_args()
    if args.observation_seconds <= 0:
        parser.error("--observation-seconds must be positive")

    client = RDP(args.port)
    try:
        tabs = client.request("root", "listTabs")
        addons = client.request("root", "listAddons")["addons"]
        addon = next((addon for addon in addons if addon.get("id") == "{ab779d78-7270-4ee8-9ee8-369d73508298}"), None)
        if addon is None:
            raise RuntimeError("arxiv-utils is not installed in this Firefox instance")
        output = {"tabs": tabs, "targets": [], "resources": []}
        for descriptor in [addon, *tabs["tabs"]]:
            watcher, targets = client.watch(descriptor)
            for target in targets:
                url = target.get("url", "")
                console = target.get("consoleActor")
                if not console:
                    continue
                if url.endswith("/background.html"):
                    expression = "JSON.stringify({url: location.href, downloads: typeof browser.downloads?.download, contextMenus: typeof browser.contextMenus, bookmarks: typeof browser.bookmarks})"
                    if args.native_probe:
                        output["native_probe"] = native_probe(client, console, args.observation_seconds)
                elif url.startswith("https://arxiv.org/abs/"):
                    expression = "JSON.stringify({url: location.href, title: document.title, links: [...document.querySelectorAll('[id^=arxiv-utils]')].map(e => ({id: e.id, href: e.getAttribute('href'), text: e.textContent}))})"
                else:
                    continue
                output["targets"].append({"url": url, "evaluation": client.evaluate(console, expression)})
            client.request(watcher["actor"], "watchResources", resourceTypes=["console-message", "error-message"])
            output["resources"].extend(client.events)
            client.events.clear()
        args.output.write_text(json.dumps(output, indent=2) + "\n")
        print(f"Saved Firefox state and cached console messages to {args.output}")
    finally:
        client.socket.close()


if __name__ == "__main__":
    main()
