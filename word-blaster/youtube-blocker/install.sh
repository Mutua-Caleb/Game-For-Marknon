#!/bin/bash
# Word Blaster YouTube Blocker - Installation Script
# Run on the kid's Ubuntu computer with: sudo bash install.sh

set -e

echo "=== Word Blaster YouTube Blocker Setup ==="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Please run as root (sudo bash install.sh)"
  exit 1
fi

# Get server URL and learner ID
read -p "Enter Word Blaster server URL (e.g., https://your-app.onrender.com): " SERVER_URL
read -p "Enter Learner ID (number from registration): " LEARNER_ID

# Validate inputs
if [ -z "$SERVER_URL" ] || [ -z "$LEARNER_ID" ]; then
  echo "ERROR: Server URL and Learner ID are required"
  exit 1
fi

# Copy blocker script
echo "Installing blocker script..."
mkdir -p /opt/wordblaster-blocker
cp blocker.py /opt/wordblaster-blocker/blocker.py
chmod +x /opt/wordblaster-blocker/blocker.py

# Create systemd service with actual values
echo "Creating systemd service..."
cat > /etc/systemd/system/wordblaster-blocker.service <<EOF
[Unit]
Description=Word Blaster YouTube Blocker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/python3 /opt/wordblaster-blocker/blocker.py --server-url ${SERVER_URL} --learner-id ${LEARNER_ID}
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
echo "Enabling and starting service..."
systemctl daemon-reload
systemctl enable wordblaster-blocker
systemctl start wordblaster-blocker

echo ""
echo "=== Setup Complete ==="
echo "YouTube is now blocked until daily quiz quota is met."
echo ""
echo "Useful commands:"
echo "  sudo systemctl status wordblaster-blocker  - Check status"
echo "  sudo journalctl -u wordblaster-blocker -f  - View logs"
echo "  sudo systemctl stop wordblaster-blocker     - Stop blocker"
echo "  sudo systemctl disable wordblaster-blocker  - Disable on boot"
