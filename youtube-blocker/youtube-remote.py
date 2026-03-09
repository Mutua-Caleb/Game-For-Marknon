#!/usr/bin/env python3
"""
YouTube Remote Control via ntfy.sh
Run as root on the Linux computer. Listens for messages from ntfy.sh
so you can block/unblock YouTube from your phone, anywhere in the world.

Setup:
  1. Change NTFY_TOPIC below to something secret (only you should know it)
  2. Install ntfy app on your Android phone (free on Play Store)
  3. Subscribe to the same topic in the ntfy app
  4. Run: sudo python3 youtube-remote.py

From your phone (ntfy app):
  - Send "unlock" to unblock YouTube
  - Send "lock" to re-block YouTube
  - Send "status" to check current state (reply comes as notification)
"""

import os
import sys
import json
import time
import logging
from urllib.request import urlopen, Request
from urllib.error import URLError

# ── Configuration ──────────────────────────────────────────────
NTFY_TOPIC = "marknon-yt-control-change-me"  # CHANGE THIS to your own secret topic
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

NTFY_BASE = "https://ntfy.sh"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("/var/log/youtube-remote.log"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("youtube-remote")


# ── Hosts file management ─────────────────────────────────────

def is_blocked():
    try:
        with open(HOSTS_FILE) as f:
            return BLOCK_MARKER in f.read()
    except IOError:
        return False


def block_youtube():
    if is_blocked():
        return "YouTube is already blocked"
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
        return "YouTube is already unblocked"
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


# ── ntfy.sh communication ─────────────────────────────────────

REPLY_TAG = "yt-remote-reply"

def send_reply(message):
    """Send a notification back to your phone via ntfy."""
    try:
        data = message.encode()
        req = Request(f"{NTFY_BASE}/{NTFY_TOPIC}", data=data, method="POST")
        req.add_header("Title", "YouTube Remote")
        req.add_header("Tags", f"tv,{REPLY_TAG}")
        urlopen(req, timeout=10)
    except Exception as e:
        log.warning(f"Failed to send reply: {e}")


def listen():
    """
    Listen for messages on the ntfy topic using server-sent events (SSE).
    This is a long-lived HTTP connection — ntfy pushes messages to us in real time.
    """
    url = f"{NTFY_BASE}/{NTFY_TOPIC}/sse"
    log.info(f"Listening on ntfy topic: {NTFY_TOPIC}")
    log.info(f"Send 'unlock', 'lock', or 'status' from the ntfy app on your phone")

    while True:
        try:
            req = Request(url, headers={"User-Agent": "YouTubeRemote/1.0"})
            with urlopen(req, timeout=None) as resp:
                for raw_line in resp:
                    line = raw_line.decode().strip()
                    if not line.startswith("data: "):
                        continue

                    try:
                        data = json.loads(line[6:])
                    except json.JSONDecodeError:
                        continue

                    if data.get("event") != "message":
                        continue

                    # Ignore our own reply messages
                    tags = data.get("tags", [])
                    if REPLY_TAG in tags:
                        continue

                    msg = data.get("message", "").strip().lower()
                    log.info(f"Received command: '{msg}'")

                    if msg == "unlock":
                        result = unblock_youtube()
                        log.info(result)
                        send_reply(result)
                    elif msg == "lock":
                        result = block_youtube()
                        log.info(result)
                        send_reply(result)
                    elif msg == "status":
                        status = "BLOCKED" if is_blocked() else "UNBLOCKED"
                        log.info(f"Status: {status}")
                        send_reply(f"YouTube is currently {status}")
                    else:
                        send_reply(f"Unknown command: '{msg}'. Use: unlock, lock, status")

        except (URLError, ConnectionError, TimeoutError) as e:
            log.warning(f"Connection lost: {e}. Reconnecting in 10s...")
            time.sleep(10)
        except Exception as e:
            log.error(f"Unexpected error: {e}. Reconnecting in 10s...")
            time.sleep(10)


if __name__ == "__main__":
    if os.geteuid() != 0:
        print("Must run as root: sudo python3 youtube-remote.py")
        sys.exit(1)

    if NTFY_TOPIC == "marknon-yt-control-change-me":
        print("WARNING: Change NTFY_TOPIC to your own secret topic name!")
        print("Anyone who knows the topic can control YouTube on this computer.")

    listen()
