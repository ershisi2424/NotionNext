#!/usr/bin/env bash
set -euo pipefail
umask 077
exec 9>/run/lock/notionnext-acme.lock
flock -n 9 || exit 0
config=/etc/notionnext-acme/credentials.env
test -f "$config" || { echo 'DNS renewal credentials are not configured' >&2; exit 78; }
test "$(stat -c '%u:%a' "$config")" = '0:600' || { echo 'Credentials must be owned by root with mode 600' >&2; exit 78; }
set -a
source "$config"
set +a
: "${TENCENTCLOUD_SECRET_ID:?Missing DNS access key ID}"
: "${TENCENTCLOUD_SECRET_KEY:?Missing DNS access key secret}"
: "${ACME_EMAIL:?Missing ACME account email}"
test "${ACME_ACCEPT_TERMS:-no}" = yes || { echo 'ACME subscriber agreement has not been accepted' >&2; exit 78; }
state=/var/lib/notionnext-acme/production
server=https://acme-v02.api.letsencrypt.org/directory
mode=${1:-renew}
case "$mode" in
  staging)
    state=/var/lib/notionnext-acme/staging
    server=https://acme-staging-v02.api.letsencrypt.org/directory
    ;;
  renew) ;;
  *) echo 'Usage: renew-certificate.sh [renew|staging]' >&2; exit 64 ;;
esac
install -d -m 700 "$state"
args=(--path "$state" --server "$server" --email "$ACME_EMAIL" --accept-tos --dns tencentcloud --domains 242424.art --domains www.242424.art)
if [ -s "$state/certificates/242424.art.crt" ]; then
  /usr/bin/lego "${args[@]}" renew --days 30
else
  /usr/bin/lego "${args[@]}" run
fi
if [ "$mode" = staging ]; then
  echo 'STAGING_VALIDATION_OK: staging certificate was not deployed'
  exit 0
fi
/usr/bin/python3 /opt/notionnext/scripts/tencent/deploy-certificate.py \
  "$state/certificates/242424.art.crt" "$state/certificates/242424.art.key"
