#!/usr/bin/env python3
"""
YouTube Blocker Daemon
Blocks YouTube via /etc/hosts until daily quiz quota is met.
Polls the Quiz Blaster API to check completion status.
"""

import time
import sys
import os
import json
import signal
import logging
from pathlib import Path
from urllib.request import urlopen, Request
from urllib.error import URLError
from datetime import datetime

# ── Configuration ──────────────────────────────────────────────
CONFIG_PATH = "/opt/youtube-blocker/config.json"
HOSTS_FILE = "/etc/hosts"
BLOCK_MARKER = "# YOUTUBE-BLOCKER-MANAGED"
CHECK_INTERVAL = 300  # seconds (5 minutes)

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
    "r1---sn-ab5sznlk.googlevideo.com",
    "googlevideo.com",
    "*.googlevideo.com",
]

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("/var/log/youtube-blocker.log"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("youtube-blocker")


def load_config():
    """Load configuration from JSON file."""
    try:
        with open(CONFIG_PATH) as f:
            return json.load(f)
    except FileNotFoundError:
        log.error(f"Config file not found: {CONFIG_PATH}")
        log.error("Run the installer first: sudo bash install.sh")
        sys.exit(1)
    except json.JSONDecodeError:
        log.error(f"Invalid JSON in config file: {CONFIG_PATH}")
        sys.exit(1)


def check_quota(api_url, learner_id):
    """Check if the learner has met their daily quiz quota."""
    url = f"{api_url}/api/learners/daily-status/{learner_id}"
    try:
        req = Request(url, headers={"User-Agent": "YouTubeBlocker/1.0"})
        with urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            quota_met = data.get("quotaMet", False)
            minutes_done = data.get("minutesCompleted", 0)
            minutes_needed = data.get("minutesRequired", 30)
            log.info(
                f"Quota check: {minutes_done}/{minutes_needed} min — "
                f"{'DONE' if quota_met else 'NOT YET'}"
            )
            return quota_met
    except URLError as e:
        log.warning(f"Could not reach API ({url}): {e}")
        # If API is unreachable, keep current block state
        return None
    except Exception as e:
        log.warning(f"Error checking quota: {e}")
        return None


def read_hosts():
    """Read the current /etc/hosts file."""
    try:
        with open(HOSTS_FILE) as f:
            return f.read()
    except IOError as e:
        log.error(f"Cannot read {HOSTS_FILE}: {e}")
        return ""


def is_blocked():
    """Check if YouTube is currently blocked in /etc/hosts."""
    return BLOCK_MARKER in read_hosts()


def block_youtube():
    """Add YouTube domains to /etc/hosts."""
    if is_blocked():
        log.info("YouTube is already blocked.")
        return

    lines = [f"\n{BLOCK_MARKER}"]
    for domain in YOUTUBE_DOMAINS:
        if not domain.startswith("*"):  # skip wildcard entries for hosts file
            lines.append(f"127.0.0.1 {domain}")
    lines.append(f"{BLOCK_MARKER}\n")

    try:
        with open(HOSTS_FILE, "a") as f:
            f.write("\n".join(lines))
        log.info("YouTube BLOCKED — quiz quota not met yet.")
        # Flush DNS cache
        os.system("systemd-resolve --flush-caches 2>/dev/null || true")
    except IOError as e:
        log.error(f"Cannot write to {HOSTS_FILE}: {e}")


def unblock_youtube():
    """Remove YouTube block entries from /etc/hosts."""
    if not is_blocked():
        log.info("YouTube is already unblocked.")
        return

    content = read_hosts()
    # Remove everything between our markers (inclusive)
    new_lines = []
    inside_block = False
    for line in content.split("\n"):
        if BLOCK_MARKER in line:
            inside_block = not inside_block
            continue
        if not inside_block:
            new_lines.append(line)

    try:
        with open(HOSTS_FILE, "w") as f:
            f.write("\n".join(new_lines))
        log.info("YouTube UNBLOCKED — quiz quota met!")
        os.system("systemd-resolve --flush-caches 2>/dev/null || true")
    except IOError as e:
        log.error(f"Cannot write to {HOSTS_FILE}: {e}")


def run_daemon():
    """Main daemon loop."""
    config = load_config()
    api_url = config["api_url"].rstrip("/")
    learner_id = config["learner_id"]

    log.info(f"YouTube Blocker started — learner ID: {learner_id}, API: {api_url}")
    log.info(f"Checking every {CHECK_INTERVAL} seconds")

    # Block YouTube on startup (safe default)
    quota_met = check_quota(api_url, learner_id)
    if quota_met:
        unblock_youtube()
    else:
        block_youtube()

    while True:
        time.sleep(CHECK_INTERVAL)
        quota_met = check_quota(api_url, learner_id)
        if quota_met is None:
            # API unreachable, maintain current state
            continue
        if quota_met:
            unblock_youtube()
        else:
            block_youtube()


def handle_signal(signum, frame):
    """Clean shutdown — unblock YouTube on stop."""
    log.info("Shutting down — unblocking YouTube...")
    unblock_youtube()
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)

    if os.geteuid() != 0:
        print("This script must be run as root (sudo).")
        sys.exit(1)

    run_daemon()
