#!/usr/bin/env bash
set -euo pipefail
cd /opt/notionnext
if [ ! -f /etc/notionnext.env ]; then
    install -m 600 scripts/tencent/production.env.example /etc/notionnext.env
    python3 - <<'PY'
import secrets
with open('/etc/notionnext.env', 'a') as f:
    f.write('\nREVALIDATION_TOKEN=' + secrets.token_urlsafe(48) + '\n')
    f.write('CACHE_REVALIDATION_TOKEN=' + secrets.token_urlsafe(48) + '\n')
PY
fi
set -a
source /etc/notionnext.env
set +a
export NODE_OPTIONS='--max-old-space-size=2304 --dns-result-order=ipv4first'
export NEXT_BUILD_CPUS=1
export BUILD_PREFETCH_ENABLED=false
export NEXT_TELEMETRY_DISABLED=1
npm install --global yarn@1.22.22 --registry=https://registry.npmmirror.com
yarn install --production=false --frozen-lockfile --network-timeout 180000 --registry https://registry.npmmirror.com
python3 interactive-showcase/asset_pipeline.py
python3 interactive-showcase/build_vercel.py --output public/__showcase-assets
yarn build
bash scripts/tencent/install-services.sh
curl --fail --retry 10 --retry-delay 3 --retry-all-errors -H 'Host: 242424.art' http://127.0.0.1/blog -o /dev/null
curl --fail -H 'Host: 242424.art' http://127.0.0.1/sitemap.xml -o /dev/null
printf 'DEPLOYMENT_READY\n'
