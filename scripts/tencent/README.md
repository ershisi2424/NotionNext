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
