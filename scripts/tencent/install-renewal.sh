#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get install -y lego openssl
install -d -m 700 /etc/notionnext-acme /var/lib/notionnext-acme
bash -n /opt/notionnext/scripts/tencent/renew-certificate.sh
cat >/etc/systemd/system/notionnext-certificate.service <<'EOF'
[Unit]
Description=Renew NotionNext HTTPS certificate with DNS validation
After=network-online.target
Wants=network-online.target
[Service]
Type=oneshot
User=root
UMask=0077
ExecStart=/usr/bin/bash /opt/notionnext/scripts/tencent/renew-certificate.sh
TimeoutStartSec=15min
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
EOF
cat >/etc/systemd/system/notionnext-certificate.timer <<'EOF'
[Unit]
Description=Check NotionNext HTTPS renewal twice daily
[Timer]
OnCalendar=*-*-* 03,15:00:00
RandomizedDelaySec=45min
Persistent=true
Unit=notionnext-certificate.service
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemd-analyze verify /etc/systemd/system/notionnext-certificate.service /etc/systemd/system/notionnext-certificate.timer
printf 'RENEWAL_PREPARED: run staging validation, first production issuance, then enable the timer\n'
