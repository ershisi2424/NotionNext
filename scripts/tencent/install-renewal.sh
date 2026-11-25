#!/usr/bin/env bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get install -y ca-certificates curl openssl
temporary=$(mktemp -d)
trap 'rm -rf "$temporary"' EXIT
test "$(uname -m)" = x86_64 || { echo 'Pinned lego archive requires x86_64' >&2; exit 1; }
archive=${LEGO_RELEASE_ARCHIVE:-$temporary/lego.tar.gz}
if [ -z "${LEGO_RELEASE_ARCHIVE:-}" ]; then
    curl --fail --location --retry 2 --connect-timeout 15 --max-time 300 \
        https://github.com/go-acme/lego/releases/download/v5.7.0/lego_v5.7.0_linux_amd64.tar.gz -o "$archive"
fi
printf '%s  %s\n' ffc7f0d75810a70affffb10fc20a8db4d6dd4917f8f88cda9b54fb08c82a1967 "$archive" | sha256sum -c -
tar -xzf "$archive" -C "$temporary" lego
install -m 755 "$temporary/lego" /usr/local/bin/lego
/usr/local/bin/lego dnshelp --code tencentcloud >/dev/null
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
