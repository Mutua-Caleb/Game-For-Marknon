#!/usr/bin/env python3
"""
YouTube Blocker for Word Blaster
Blocks YouTube via /etc/hosts until the daily quiz quota is met.
Runs as a systemd service on Ubuntu.

Usage:
  sudo python3 blocker.py --server-url http://YOUR_SERVER:3001 --learner-id 1
"""

import argparse
import json
import os
import shutil
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

HOSTS_FILE = "/etc/hosts"
BLOCK_START = "# >>> WORDBLASTER YOUTUBE BLOCK START >>>"
BLOCK_END = "# <<< WORDBLASTER YOUTUBE BLOCK END <<<"
CHECK_INTERVAL = 60  # seconds


def get_block_lines():
    """Generate the block entries for /etc/hosts."""
    lines = [BLOCK_START]
    for domain in YOUTUBE_DOMAINS:
        lines.append(f"127.0.0.1  {domain}")
    lines.append(BLOCK_END)
    return "\n".join(lines) + "\n"


def is_blocked():
    """Check if YouTube is currently blocked in /etc/hosts."""
    try:
        with open(HOSTS_FILE, "r") as f:
            content = f.read()
        return BLOCK_START in content
    except Exception:
        return False


def block_youtube():
    """Add YouTube block entries to /etc/hosts."""
    if is_blocked():
        return  # Already blocked

    try:
        with open(HOSTS_FILE, "a") as f:
            f.write("\n" + get_block_lines())
        print("[BLOCKED] YouTube domains added to /etc/hosts")
        # Flush DNS cache
        os.system("systemd-resolve --flush-caches 2>/dev/null || true")
    except PermissionError:
        print("[ERROR] Need root privileges to modify /etc/hosts")
        sys.exit(1)


def unblock_youtube():
    """Remove YouTube block entries from /etc/hosts."""
    if not is_blocked():
        return  # Already unblocked

    try:
        with open(HOSTS_FILE, "r") as f:
            content = f.read()

        # Remove the block section
        start_idx = content.find(BLOCK_START)
        end_idx = content.find(BLOCK_END)
        if start_idx != -1 and end_idx != -1:
            # Remove from start marker to end marker (including newline after)
            end_idx = end_idx + len(BLOCK_END)
            if end_idx < len(content) and content[end_idx] == "\n":
                end_idx += 1
            # Also remove leading newline if present
            if start_idx > 0 and content[start_idx - 1] == "\n":
                start_idx -= 1
            new_content = content[:start_idx] + content[end_idx:]
            with open(HOSTS_FILE, "w") as f:
                f.write(new_content)
            print("[UNBLOCKED] YouTube domains removed from /etc/hosts")
            # Flush DNS cache
            os.system("systemd-resolve --flush-caches 2>/dev/null || true")
    except PermissionError:
        print("[ERROR] Need root privileges to modify /etc/hosts")
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
    parser.add_argument("--server-url", required=True, help="Word Blaster server URL (e.g., http://192.168.1.10:3001)")
    parser.add_argument("--learner-id", required=True, type=int, help="Learner account ID")
    parser.add_argument("--interval", type=int, default=CHECK_INTERVAL, help="Check interval in seconds (default: 60)")
    args = parser.parse_args()

    print(f"YouTube Blocker started")
    print(f"  Server: {args.server_url}")
    print(f"  Learner ID: {args.learner_id}")
    print(f"  Check interval: {args.interval}s")

    # Check root access
    if os.geteuid() != 0:
        print("[ERROR] This script must be run as root (sudo)")
        sys.exit(1)

    # Block YouTube initially on startup
    block_youtube()

    while True:
        quota_met, status = check_quota(args.server_url, args.learner_id)

        if quota_met is None:
            # Server unreachable - keep current state (stay blocked for safety)
            print("[INFO] Server unreachable, keeping current block state")
        elif quota_met:
            # Quota met - unblock YouTube
            if is_blocked():
                print(f"[INFO] Quota met ({status['minutesCompleted']}/{status['minutesRequired']} min) - Unblocking")
                unblock_youtube()
            else:
                print(f"[OK] YouTube unblocked ({status['minutesCompleted']}/{status['minutesRequired']} min)")
        else:
            # Quota not met - ensure YouTube is blocked
            if not is_blocked():
                print(f"[INFO] Quota not met ({status['minutesCompleted']}/{status['minutesRequired']} min) - Blocking")
                block_youtube()
            else:
                print(f"[WAIT] {status['minutesCompleted']}/{status['minutesRequired']} min completed")

        time.sleep(args.interval)


if __name__ == "__main__":
    main()
