import argparse
import concurrent.futures
import hashlib
import html
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from time import sleep
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit
from urllib.request import Request, urlopen
from uuid import uuid4
from native_chinese import localize_native
from case_refinements import refine_case_images

ORIGIN = "https://www.c-na.dev"
CACHE = Path(__file__).with_name("snapshot")
ROUTES = [
    "/", "/works/giftbede", "/works/iconly-pro", "/works/campaign-lark",
    "/works/solsta", "/works/maileroo", "/works/wassieverse-canvas",
    "/works/laelaps", "/explore", "/tank", "/space-invader", "/tetris", "/pac-man", "/snake",
]
FORWARDED = (
    "RSC", "Next-Router-State-Tree", "Next-Router-Prefetch",
    "Next-Router-Segment-Prefetch", "Next-Url",
)
REFERENCE = re.compile(
    r"""(?:(?:src|href|poster)=["'](/[^"'<>\s]+)|"""
    r"""["'`](/[a-zA-Z0-9_./%~-]+\.(?:js|css|wasm|glb|gltf|bin|ktx2|webp|avif|png|jpe?g|gif|svg|ico|mp3|flac|ogg|wav|mp4|webm|woff2?|pdf|json))(?=["'`]))"""
)
DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36"
MOBILE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"
CACHE_LOCKS = [Lock() for _ in range(128)]
TRANSIENT_STATUSES = {429, 500, 502, 503, 504}
RESPONSE_HEADERS = (
    "Cache-Control", "Vary", "X-Nextjs-Postponed", "X-Nextjs-Prerender", "X-Nextjs-Stale-Time",
)
CASE_NAVIGATION = b"""<script>
try {
  if (sessionStorage.getItem("desk:case-cover") === location.pathname) {
    const cover = document.createElement('div');
    cover.id = 'desk-case-loading-cover';
    cover.style.cssText = 'position:fixed;inset:0;background:#100f0c;z-index:70;pointer-events:auto';
    document.documentElement.appendChild(cover);
    setTimeout(() => cover.remove(), 6000);
  }
} catch {}
document.addEventListener('click', function(event) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element && event.target.closest('a[href]');
  if (!link || link.target || link.hasAttribute('download') || link.origin !== location.origin) return;
  if (!link.pathname.startsWith('/works/') || link.pathname === location.pathname) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.dispatchEvent(new CustomEvent("desk-case-navigate", {cancelable:true, detail:link.href}))) {
    location.assign(link.href);
  }
}, true);
</script>"""


def fetch(path, headers=None, offline=False, refresh=False):
    # 桌面、移动端与 RSC 请求使用不同缓存键，避免串用页面内容。
    headers = headers or {}
    route = urlsplit(path)
    html_page = route.path in ROUTES and not headers.get("RSC") and "_rsc=" not in route.query
    mobile = bool(re.search(r"Android|iPhone|Mobile", headers.get("User-Agent", ""), re.I))
    variant = {key: headers[key] for key in FORWARDED if headers.get(key)}
    if html_page:
        variant["device"] = "mobile" if mobile else "desktop"
    key = hashlib.sha256(json.dumps([path, variant], sort_keys=True).encode()).hexdigest()
    with CACHE_LOCKS[int(key[:2], 16) % len(CACHE_LOCKS)]:
        return load_response(key, path, variant, mobile, html_page, offline, refresh)


def load_response(key, path, variant, mobile, html_page, offline, refresh):
    directory = CACHE / key[:2] / key
    metadata = directory / "response.json"
    if metadata.exists() and (offline or not refresh):
        record = json.loads(metadata.read_text(encoding="utf-8"))
        content = (directory / record.get("body", "body")).read_bytes()
        if any(kind in record['content_type'] for kind in ('javascript', 'text/html', 'text/x-component')):
            content = localize_native(content)
        if 'javascript' in record['content_type']:
            content = refine_case_images(content.decode('utf-8')).encode('utf-8')
        return record["status"], record["content_type"], content, record.get("headers", {})

    if offline:
        return 404, "text/plain; charset=utf-8", b"Resource is not in the local snapshot.", {}

    request_headers = {key: value for key, value in variant.items() if key in FORWARDED}
    request_headers["User-Agent"] = MOBILE_UA if mobile else DESKTOP_UA
    if html_page:
        request_headers["Cookie"] = "device=" + variant["device"]
    result = request_origin(path, request_headers)
    if result[0] == 200:
        directory.mkdir(parents=True, exist_ok=True)
        body_name = hashlib.sha256(result[2]).hexdigest()
        body_path = directory / body_name
        if not body_path.exists():
            atomic_write(body_path, result[2])
        record = {
            "url": path, "variant": variant, "status": result[0],
            "content_type": result[1], "body": body_name, "headers": result[3],
        }
        atomic_write(metadata, json.dumps(record).encode())
    return result


def request_origin(path, headers):
    # 仅对超时及暂时性 HTTP 状态退避重试，永久错误原样返回。
    for attempt in range(3):
        try:
            try:
                response = urlopen(Request(ORIGIN + path, headers=headers), timeout=12)
            except HTTPError as error:
                response = error
            with response:
                result = (
                    response.status, response.headers.get("Content-Type", "application/octet-stream"),
                    response.read(), {key: response.headers[key] for key in RESPONSE_HEADERS if key in response.headers},
                )
            if result[0] not in TRANSIENT_STATUSES or attempt == 2:
                return result
        except (URLError, TimeoutError, ConnectionError):
            if attempt == 2:
                raise
        sleep(0.2 * (2 ** attempt))


def atomic_write(path, content):
    # 先写临时文件，再原子替换，读请求不会拿到半份快照。
    temp = path.with_name(uuid4().hex + ".tmp")
    try:
        temp.write_bytes(content)
        for attempt in range(3):
            try:
                temp.replace(path)
                return
            except PermissionError:
                if attempt == 2:
                    raise
                sleep(0.05 * (attempt + 1))
    finally:
        temp.unlink(missing_ok=True)


def references(content, content_type):
    if not any(kind in content_type for kind in ("html", "javascript", "css", "manifest", "json")):
        return []
    source = content.decode("utf-8", errors="replace").replace(r'\"', '"')
    paths = set()
    for match in REFERENCE.finditer(source):
        path = html.unescape(match[1] or match[2]).split("#", 1)[0]
        if not path.startswith("//") and not path.startswith("/cdn-cgi/l/") and path not in ROUTES:
            paths.add(path)
    for source_set in re.findall(r'(?:srcset|imageSrcSet)="([^"]+)"', source, flags=re.I):
        for url in re.findall(r'(/[^ ,]+)\s+\d+w', source_set):
            paths.add(html.unescape(url))
    for chunk in re.findall(r'"(static/chunks/[a-zA-Z0-9_.~/-]+\.(?:js|css))"', source):
        paths.add("/_next/" + chunk)
    for font in re.findall(r'\.\./media/([a-zA-Z0-9_.-]+\.woff2?)', source):
        paths.add("/_next/static/media/" + font)
    return paths


def crawl(refresh_pages=False, access_logs=()):
    queue = [(path, agent) for path in ROUTES for agent in (DESKTOP_UA, MOBILE_UA)]
    queue.extend((path, DESKTOP_UA) for path in ("/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/resume.pdf", "/icon-192.png", "/icon-512.png", "/draco/draco_decoder.wasm"))
    for log in access_logs:
        for path in re.findall(r'"GET (/[^ ]+) HTTP/1\.[01]"', log.read_text(encoding="utf-8", errors="replace")):
            if path.startswith("/") and not path.startswith("//") and not re.search(r"(?:\?|&)_rsc=", path):
                queue.append((path, DESKTOP_UA))
    queue = list(dict.fromkeys(queue))
    seen = set(queue)
    issues = {}
    success = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as pool:
        while queue:
            batch, queue = queue, []
            futures = [
                pool.submit(fetch, path, {"User-Agent": agent}, refresh=refresh_pages and path in ROUTES)
                for path, agent in batch
            ]
            for (path, agent), future in zip(batch, futures):
                try:
                    status, content_type, payload, _ = future.result()
                except (OSError, ValueError) as error:
                    issues[path] = str(error)
                    continue
                if status != 200:
                    issues[path] = status
                    continue
                success += 1
                for reference in references(payload, content_type):
                    item = (reference, DESKTOP_UA)
                    if item not in seen:
                        seen.add(item)
                        queue.append(item)
            print(f"Fetched {success}; queued {len(queue)}; unresolved {len(issues)}", flush=True)
    atomic_write(
        Path(__file__).with_name("crawl-result.json"),
        json.dumps({"success": success, "issues": issues}, indent=2).encode(),
    )


class Mirror(BaseHTTPRequestHandler):
    offline = False

    def do_HEAD(self):
        self.serve(False)

    def do_GET(self):
        self.serve(True)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in {"/cdn-cgi/rum", "/1792987270f67189/view"}:
            self.send_error(501)
            return
        self.send_response(204)
        self.end_headers()

    def prepare_document(self, content):
        # 子类可在保留快照原始字节的前提下增加本地页面功能。
        return content

    def serve(self, send_body):
        path = self.path
        try:
            route = urlsplit(path)
        except ValueError:
            self.send_error(400)
            return
        if route.scheme or route.netloc or not path.startswith("/") or path.startswith("//"):
            self.send_error(400)
            return
        headers = {key: self.headers[key] for key in (*FORWARDED, "User-Agent") if key in self.headers}
        try:
            response = fetch(path, headers, self.offline)
            if (self.offline and response[0] == 404) or response[0] in TRANSIENT_STATUSES:
                response = self.offline_fallback(route, headers, response)
        except OSError as error:
            response = self.offline_fallback(
                route, headers, (502, "text/plain; charset=utf-8", str(error).encode(), {})
            )
        except ValueError:
            self.send_error(400)
            return
        status, content_type, content, response_headers = response
        if status == 200 and content_type.startswith("text/html") and route.path.startswith("/works/"):
            # Preserve the public document and use full navigation between case studies.
            content = content.replace(b"</head>", CASE_NAVIGATION + b"</head>", 1)
        if status == 200 and content_type.startswith("text/html"):
            content = self.prepare_document(content)
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        for key, value in response_headers.items():
            if key != "Vary":
                self.send_header(key, value)
        if route.path in ROUTES:
            self.send_header("Vary", ", ".join((*FORWARDED, "User-Agent")))
        elif "Vary" in response_headers:
            self.send_header("Vary", response_headers["Vary"])
        self.end_headers()
        if send_body:
            try:
                self.wfile.write(content)
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
                return

    @staticmethod
    def offline_fallback(route, headers, missing):
        params = parse_qs(route.query)
        if route.path == "/_next/image":
            source = params.get("url", [""])[0]
            if source.startswith("/") and not source.startswith("//"):
                result = fetch(source, offline=True)
                if result[0] == 200 and result[1].startswith("image/"):
                    return result
        if route.path in ROUTES and ("_rsc" in params or headers.get("RSC")):
            # An HTML response tells Next.js to navigate to the cached document.
            status, content_type, content, _ = fetch(
                route.path, {"User-Agent": headers.get("User-Agent", "")}, offline=True
            )
            return status, content_type, content, {"Cache-Control": "no-store"}
        return missing


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--crawl", action="store_true")
    parser.add_argument("--refresh-pages", action="store_true")
    parser.add_argument("--access-log", action="append", default=[], type=Path)
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--port", type=int, default=4174)
    options = parser.parse_args()
    if options.crawl:
        crawl(options.refresh_pages, options.access_log)
    else:
        Mirror.offline = options.offline
        with ThreadingHTTPServer(("127.0.0.1", options.port), Mirror) as server:
            print(f"http://127.0.0.1:{options.port}/", flush=True)
            server.serve_forever()


