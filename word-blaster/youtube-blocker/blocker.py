#!/usr/bin/env python3
"""
YouTube Blocker for Word Blaster
Blocks YouTube via hosts file until the daily quiz quota is met.
Works on both Linux/Ubuntu and Windows.

Usage:
  Linux:   sudo python3 blocker.py --server-url http://YOUR_SERVER:3001 --learner-id 1
  Windows: Run as Administrator: python blocker.py --server-url http://YOUR_SERVER:3001 --learner-id 1
"""

import argparse
import ctypes
import json
import os
import platform
import sys
import time
import urllib.request
import urllib.error

# YouTube domains to block
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
    "s.ytimg.com",
    "i.ytimg.com",
    "i9.ytimg.com",
    "img.youtube.com",
    "music.youtube.com",
    "tv.youtube.com",
    "kids.youtube.com",
]

IS_WINDOWS = platform.system() == "Windows"

# Hosts file location per OS
if IS_WINDOWS:
    HOSTS_FILE = r"C:\Windows\System32\drivers\etc\hosts"
else:
    HOSTS_FILE = "/etc/hosts"

BLOCK_START = "# >>> WORDBLASTER YOUTUBE BLOCK START >>>"
BLOCK_END = "# <<< WORDBLASTER YOUTUBE BLOCK END <<<"
CHECK_INTERVAL = 60  # seconds


def is_admin():
    """Check if running with admin/root privileges."""
    if IS_WINDOWS:
        try:
            return ctypes.windll.shell32.IsUserAnAdmin() != 0
        except Exception:
            return False
    else:
        return os.geteuid() == 0


def flush_dns():
    """Flush the DNS cache for the current OS."""
    if IS_WINDOWS:
        os.system("ipconfig /flushdns >nul 2>&1")
    else:
        os.system("systemd-resolve --flush-caches 2>/dev/null || true")


def get_block_lines():
    """Generate the block entries for the hosts file."""
    lines = [BLOCK_START]
    for domain in YOUTUBE_DOMAINS:
        lines.append(f"127.0.0.1  {domain}")
    lines.append(BLOCK_END)
    return "\n".join(lines) + "\n"


def is_blocked():
    """Check if YouTube is currently blocked in the hosts file."""
    try:
        with open(HOSTS_FILE, "r") as f:
            content = f.read()
        return BLOCK_START in content
    except Exception:
        return False


def block_youtube():
    """Add YouTube block entries to the hosts file."""
    if is_blocked():
        return  # Already blocked

    try:
        with open(HOSTS_FILE, "a") as f:
            f.write("\n" + get_block_lines())
        print("[BLOCKED] YouTube domains added to hosts file")
        flush_dns()
    except PermissionError:
        priv = "Administrator" if IS_WINDOWS else "root (sudo)"
        print(f"[ERROR] Need {priv} privileges to modify hosts file")
        sys.exit(1)


def unblock_youtube():
    """Remove YouTube block entries from the hosts file."""
    if not is_blocked():
        return  # Already unblocked

    try:
        with open(HOSTS_FILE, "r") as f:
            content = f.read()

        # Remove the block section
        start_idx = content.find(BLOCK_START)
        end_idx = content.find(BLOCK_END)
        if start_idx != -1 and end_idx != -1:
            end_idx = end_idx + len(BLOCK_END)
            if end_idx < len(content) and content[end_idx] == "\n":
                end_idx += 1
            if start_idx > 0 and content[start_idx - 1] == "\n":
                start_idx -= 1
            new_content = content[:start_idx] + content[end_idx:]
            with open(HOSTS_FILE, "w") as f:
                f.write(new_content)
            print("[UNBLOCKED] YouTube domains removed from hosts file")
            flush_dns()
    except PermissionError:
        priv = "Administrator" if IS_WINDOWS else "root (sudo)"
        print(f"[ERROR] Need {priv} privileges to modify hosts file")
        sys.exit(1)


def check_quota(server_url, learner_id):
    """Check with the server if the daily quiz quota has been met."""
    url = f"{server_url}/api/learners/daily-status/{learner_id}"
    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())
            return data.get("quotaMet", False), data
    except urllib.error.URLError as e:
        print(f"[WARN] Could not reach server: {e}")
        return None, None
    except Exception as e:
        print(f"[WARN] Error checking quota: {e}")
        return None, None


def main():
    parser = argparse.ArgumentParser(description="YouTube Blocker for Word Blaster")
    parser.add_argument("--server-url", required=True, help="Word Blaster server URL (e.g., https://your-app.onrender.com)")
    parser.add_argument("--learner-id", required=True, type=int, help="Learner account ID")
    parser.add_argument("--interval", type=int, default=CHECK_INTERVAL, help="Check interval in seconds (default: 60)")
    args = parser.parse_args()

    print(f"YouTube Blocker started")
    print(f"  OS: {platform.system()}")
    print(f"  Hosts file: {HOSTS_FILE}")
    print(f"  Server: {args.server_url}")
    print(f"  Learner ID: {args.learner_id}")
    print(f"  Check interval: {args.interval}s")

    # Check admin/root access
    if not is_admin():
        priv = "Administrator" if IS_WINDOWS else "root (sudo)"
        print(f"[ERROR] This script must be run as {priv}")
        sys.exit(1)

    # Block YouTube initially on startup
    block_youtube()

    while True:
        quota_met, status = check_quota(args.server_url, args.learner_id)

        if quota_met is None:
            print("[INFO] Server unreachable, keeping current block state")
        elif quota_met:
            if is_blocked():
                print(f"[INFO] Quota met ({status['minutesCompleted']}/{status['minutesRequired']} min) - Unblocking")
                unblock_youtube()
            else:
                print(f"[OK] YouTube unblocked ({status['minutesCompleted']}/{status['minutesRequired']} min)")
        else:
            if not is_blocked():
                print(f"[INFO] Quota not met ({status['minutesCompleted']}/{status['minutesRequired']} min) - Blocking")
                block_youtube()
            else:
                print(f"[WAIT] {status['minutesCompleted']}/{status['minutesRequired']} min completed")

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
