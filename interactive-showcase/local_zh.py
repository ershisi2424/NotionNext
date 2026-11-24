"""汉化版入口。默认离线，只监听本机。Python 3.10+，无需第三方依赖。"""
import argparse
from html import escape
from pathlib import Path
from urllib.parse import urlsplit

from mirror import Mirror, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent
LOCALIZATION = b'<link rel="preload" href="/__zh/messages.tsv" as="fetch" crossorigin="anonymous"><link rel="stylesheet" href="/__zh/localize.css"><script defer src="/__zh/localize.js"></script>'
# 请求地址与可直接修改的本地文件一一对应，不允许按任意路径读文件。
ASSETS = {
    "/__zh/localize.css": ("localize.css", "text/css; charset=utf-8"),
    "/__zh/localize.js": ("localize.js", "application/javascript; charset=utf-8"),
    "/__zh/messages.tsv": ("zh-CN.tsv", "text/tab-separated-values; charset=utf-8"),
    **{
        f"/__zh/photography/{name}.webp": (f"photography/{name}.webp", "image/webp")
        for name in ("golden-river", "dusk-skyline", "riverside-towers", "river-light-trails")
    },
}


class ChineseMirror(Mirror):
    """为原镜像挂载中文词典、脚本和样式，保留原镜像的缓存及导航逻辑。"""

    blog_url = "http://127.0.0.1:3000/"

    def serve(self, send_body):
        if self.path not in ASSETS:
            super().serve(send_body)
            return

        filename, content_type = ASSETS[self.path]
        content = (ROOT / filename).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        # 修改词典后只需刷新浏览器，无需清缓存或重启服务。
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if send_body:
            self.wfile.write(content)

    def prepare_document(self, content):
        # 只传入博客入口。文章、主题、静态资源和同步仍由原博客服务提供。
        blog = f'<meta name="notion-blog-url" content="{escape(self.blog_url, quote=True)}">'.encode()
        return content.replace(b"</head>", blog + LOCALIZATION + b"</head>", 1)


def main():
    parser = argparse.ArgumentParser(description="二十四调试网页2.0互动版")
    parser.add_argument("--port", type=int, default=4186)
    parser.add_argument("--online", action="store_true", help="缓存未命中时允许从原站取资源")
    parser.add_argument("--blog-url", default=ChineseMirror.blog_url, help="现有 NotionNext 博客的完整网址")
    options = parser.parse_args()
    blog = urlsplit(options.blog_url)
    if blog.scheme not in {"http", "https"} or not blog.hostname or blog.username is not None:
        parser.error("--blog-url 必须是不含账号凭据的 HTTP(S) 地址")
    ChineseMirror.blog_url = options.blog_url
    ChineseMirror.offline = not options.online
    with ThreadingHTTPServer(("127.0.0.1", options.port), ChineseMirror) as server:
        print(f"http://127.0.0.1:{options.port}/", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main()

