# Tencent Lighthouse deployment

Target: Ubuntu 24.04, `/opt/notionnext`, Node.js 22, nginx, Python 3.
The old Vercel deployment stays independent. Both sites read the existing Notion
database; `NEXT_PUBLIC_SITE_URL_OVERRIDE` gives this deployment its own URL without
editing the shared Notion configuration.

After cloning the repository, run `bash scripts/tencent/build-release.sh` as root.
The script creates `/etc/notionnext.env` with mode 600 and random refresh secrets
on first run, installs dependencies, exports the interactive assets, builds the
full Next.js application and enables two systemd services. It does not export a
static blog. nginx proxies `/blog` without adding a page cache, so NotionNext ISR
and the authenticated `/blog/api/revalidate` endpoint remain available.

Use `systemctl status notionnext-blog notionnext-showcase` and
`journalctl -u notionnext-blog` for operation. Build on the host with one worker
and a bounded Node heap to fit the 4 GB instance. Configure HTTPS after HTTP
validation. The HTTP server block retains the ACME challenge directory.

For an update, review the target commit, fetch the repository, fast-forward to
that commit, and run the build script again. Keep `/etc/notionnext.env` outside
Git and do not print it in command execution logs.

Validate homepage, `/explore`, case images (including versioned optimizer URLs),
`/blog`, one article, `/robots.txt`, `/sitemap.xml` and both child sitemaps.
Verify Notion fetches from the server, then change a controlled draft and confirm
the new deployment reads it after cache expiry or authenticated revalidation.
Do not change published content just to exercise the pipeline.

## Certificate renewal

The DNS renewal workflow uses Ubuntu's `lego` package and DNSPod DNS-01. HTTP
validation is unsuitable while the domain is intercepted for missing ICP filing.
Run `bash scripts/tencent/install-renewal.sh` to install the service and timer
without enabling them. Create `/etc/notionnext-acme/credentials.env` from
`acme-credentials.env.example`, owned by root with mode 600, with a dedicated
domain-scoped DNS identity. The owner must accept the Let's Encrypt subscriber
agreement before setting `ACME_ACCEPT_TERMS=yes`. Do not use the main account key.
`dns-renewal-policy.example.json` scopes record operations to the DNSPod domain
ID 100332863 (`242424.art`). Domain listing is account-wide because the provider
requires it. The script creates/deletes TXT challenges, but the IAM record-write
permission is domain-wide; it is not limited to TXT records. Have the owner
approve this access explicitly before creating or granting the dedicated identity.

Run `bash scripts/tencent/renew-certificate.sh staging` first. This uses a separate
ACME account/state directory and never installs an untrusted staging certificate.
Then run `bash scripts/tencent/renew-certificate.sh` for first production issuance.
Only after both succeed, run `systemctl enable --now notionnext-certificate.timer`.
The timer checks twice daily with a random delay and renews within 30 days of
expiry. Deployment verifies coverage of both hostnames, remaining validity,
trusted certificate chain and private key match before changing installed files.
An nginx configuration or reload failure restores the previous certificate pair.
Check `journalctl -u notionnext-certificate` and `systemctl list-timers` for status.
This does not change Notion configuration, app services, or the old Vercel domain.
