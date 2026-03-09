#!/usr/bin/env python3
"""
YouTube Remote Unlock Server
Run as root. Exposes a simple web page on port 7777 to block/unblock YouTube
from your phone browser. Protected by a PIN.

Usage:
  sudo python3 youtube-remote.py

Then on your phone, go to: http://<computer-ip>:7777
"""

import os
import sys
import json
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs

# ── Configuration ──────────────────────────────────────────────
PORT = 7777
PIN = "1234"  # Change this to your own PIN
HOSTS_FILE = "/etc/hosts"
BLOCK_MARKER = "# YOUTUBE-BLOCKER-MANAGED"

YOUTUBE_DOMAINS = [
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "www.youtu.be",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
    "youtubei.googleapis.com",
    "yt3.ggpht.com",
    "yt3.googleusercontent.com",
    "i.ytimg.com",
    "s.ytimg.com",
    "googlevideo.com",
]


def is_blocked():
    try:
        with open(HOSTS_FILE) as f:
            return BLOCK_MARKER in f.read()
    except IOError:
        return False


def block_youtube():
    if is_blocked():
        return "Already blocked"
    lines = [f"\n{BLOCK_MARKER}"]
    for domain in YOUTUBE_DOMAINS:
        lines.append(f"127.0.0.1 {domain}")
    lines.append(f"{BLOCK_MARKER}\n")
    with open(HOSTS_FILE, "a") as f:
        f.write("\n".join(lines))
    os.system("systemd-resolve --flush-caches 2>/dev/null || true")
    return "YouTube BLOCKED"


def unblock_youtube():
    if not is_blocked():
        return "Already unblocked"
    with open(HOSTS_FILE) as f:
        content = f.read()
    new_lines = []
    inside_block = False
    for line in content.split("\n"):
        if BLOCK_MARKER in line:
            inside_block = not inside_block
            continue
        if not inside_block:
            new_lines.append(line)
    with open(HOSTS_FILE, "w") as f:
        f.write("\n".join(new_lines))
    os.system("systemd-resolve --flush-caches 2>/dev/null || true")
    return "YouTube UNBLOCKED"


HTML_PAGE = """<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>YouTube Remote</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; background: #0f172a; color: white;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .card { background: #1e293b; border-radius: 16px; padding: 2rem; width: 320px;
          text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
  h1 { font-size: 1.3rem; margin-bottom: 0.5rem; }
  .status { font-size: 1.1rem; padding: 0.5rem 1rem; border-radius: 8px; margin: 1rem 0;
            font-weight: 700; }
  .status.blocked { background: #dc262620; color: #f87171; }
  .status.open { background: #16a34a20; color: #4ade80; }
  .pin-input { width: 100%%; padding: 0.8rem; border-radius: 8px; border: 2px solid #334155;
               background: #0f172a; color: white; font-size: 1.2rem; text-align: center;
               letter-spacing: 0.5em; margin-bottom: 1rem; }
  .pin-input:focus { outline: none; border-color: #f59e0b; }
  .btn { width: 100%%; padding: 0.8rem; border: none; border-radius: 8px; font-size: 1rem;
         font-weight: 700; cursor: pointer; margin-bottom: 0.5rem; }
  .btn-unlock { background: #16a34a; color: white; }
  .btn-lock { background: #dc2626; color: white; }
  .msg { font-size: 0.85rem; color: #f59e0b; margin-top: 0.5rem; min-height: 1.2rem; }
</style>
</head>
<body>
<div class="card">
  <h1>YouTube Remote</h1>
  <div class="status {status_class}">{status_text}</div>
  <form method="POST">
    <input class="pin-input" type="password" name="pin" placeholder="PIN" maxlength="8" inputmode="numeric" autocomplete="off">
    <button class="btn btn-unlock" type="submit" name="action" value="unlock">Unlock YouTube</button>
    <button class="btn btn-lock" type="submit" name="action" value="lock">Lock YouTube</button>
  </form>
  <div class="msg">{message}</div>
</div>
</body>
</html>"""


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._serve_page("")

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode()
        params = parse_qs(body)

        pin = params.get("pin", [""])[0]
        action = params.get("action", [""])[0]

        if pin != PIN:
            self._serve_page("Wrong PIN")
            return

        if action == "unlock":
            msg = unblock_youtube()
        elif action == "lock":
            msg = block_youtube()
        else:
            msg = "Unknown action"

        self._serve_page(msg)

    def _serve_page(self, message):
        blocked = is_blocked()
        html = HTML_PAGE.format(
            status_class="blocked" if blocked else "open",
            status_text="BLOCKED" if blocked else "UNBLOCKED",
            message=message,
        )
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(html.encode())

    def log_message(self, format, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")


if __name__ == "__main__":
    if os.geteuid() != 0:
        print("Must run as root: sudo python3 youtube-remote.py")
        sys.exit(1)

    print(f"YouTube Remote running on port {PORT}")
    print(f"Open http://<your-computer-ip>:{PORT} on your phone")
    HTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
