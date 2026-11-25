"""Serve the interactive showcase behind nginx on an ordinary Linux server."""
import json
import mimetypes
import os
from pathlib import Path
import re
import sys
from http.server import ThreadingHTTPServer
from urllib.parse import parse_qs, urlencode, urlsplit

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / 'api'), str(ROOT / 'interactive-showcase')]
from showcase import handler as ShowcaseHandler
from asset_pipeline import MANIFEST, rewrite
from local_zh import ChineseMirror
import seo_metadata

ORIGIN = os.environ.get('SITE_ORIGIN', 'https://242424.art').rstrip('/')
seo_metadata.SITE_URL = ORIGIN
MANIFEST_DATA = json.loads(MANIFEST.read_text(encoding='utf-8'))
IMAGE_FILES = {tuple(entry['key']): entry['file'] for entry in MANIFEST_DATA['images']}


class Handler(ShowcaseHandler):
    blog_url = ORIGIN + '/blog/'

    def prepare_document(self, content):
        return rewrite(ChineseMirror.prepare_document(self, content), MANIFEST_DATA['version'])

    def serve(self, send_body):
        route = urlsplit(self.path)
        if route.path in ('/__showcase-image', '/_next/image'):
            query = parse_qs(route.query)
            if set(query) == {'url', 'w', 'q'} and all(len(v) == 1 for v in query.values()):
                source = re.sub(r'^/__showcase/v/[a-f0-9]{20}(?=/)', '', query['url'][0])
                key = (source, query['w'][0], query['q'][0])
                filename = IMAGE_FILES.get(key)
                if filename:
                    path = ROOT / 'public' / '__showcase-assets' / 'v' / MANIFEST_DATA['version'] / 'images' / filename
                    if path.is_file():
                        body = path.read_bytes()
                        self.send_response(200)
                        content_type = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
                                        '.webp': 'image/webp', '.avif': 'image/avif'}.get(path.suffix)
                        self.send_header('Content-Type', content_type or mimetypes.guess_type(filename)[0] or 'application/octet-stream')
                        self.send_header('Content-Length', str(len(body)))
                        self.send_header('Cache-Control', 'public, max-age=3600')
                        self.end_headers()
                        if send_body:
                            self.wfile.write(body)
                        return
                self.path = '/_next/image?' + urlencode({'url': source, 'w': key[1], 'q': key[2]})
        return super().serve(send_body)


if __name__ == '__main__':
    with ThreadingHTTPServer(('127.0.0.1', int(os.environ.get('SHOWCASE_PORT', '9010'))), Handler) as server:
        server.serve_forever()
