#!/usr/bin/env bash
set -euo pipefail
cd /opt/notionnext
test -f .next/BUILD_ID
test -f /etc/notionnext.env
id notionnext >/dev/null 2>&1 || useradd --system --home-dir /opt/notionnext --shell /usr/sbin/nologin notionnext
install -d -o notionnext -g notionnext /opt/notionnext-cache /var/www/acme
chown -R notionnext:notionnext .next /opt/notionnext-cache
cat >/etc/systemd/system/notionnext-blog.service <<'EOF'
[Unit]
Description=NotionNext live blog
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=notionnext
WorkingDirectory=/opt/notionnext
EnvironmentFile=/etc/notionnext.env
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3000
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
EOF
cat >/etc/systemd/system/notionnext-showcase.service <<'EOF'
[Unit]
Description=Interactive showcase
After=network-online.target
[Service]
Type=simple
User=notionnext
WorkingDirectory=/opt/notionnext
EnvironmentFile=/etc/notionnext.env
ExecStart=/usr/bin/python3 scripts/tencent/showcase_server.py
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
[Install]
WantedBy=multi-user.target
EOF
install -m 644 scripts/tencent/nginx.conf /etc/nginx/sites-available/notionnext
ln -sfn /etc/nginx/sites-available/notionnext /etc/nginx/sites-enabled/notionnext
nginx -t
systemctl daemon-reload
systemctl enable --now notionnext-blog notionnext-showcase
systemctl reload nginx
