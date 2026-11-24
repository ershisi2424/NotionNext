"""Root showcase on the same deployment as the /blog Next.js application."""
import sys
from pathlib import Path
from urllib.parse import urlsplit, parse_qsl, urlencode
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'interactive-showcase'))
from local_zh import ChineseMirror
import json
from asset_pipeline import MANIFEST, rewrite

ASSET_VERSION = json.loads(MANIFEST.read_text(encoding='utf-8'))['version']

class handler(ChineseMirror):
    offline = True
    blog_url = 'https://242424.help/blog/'

    def prepare_document(self, content):
        return rewrite(super().prepare_document(content), ASSET_VERSION)

    def serve(self, send_body):
        route = urlsplit(self.path)
        pairs = parse_qsl(route.query, keep_blank_values=True)
        original = next((value for key, value in pairs if key == '__showcase_path'), route.path)
        query = urlencode([(key, value) for key, value in pairs if key not in ('__showcase_path', 'path') and not key.startswith('_vercel_')])
        self.path = original + ('?' + query if query else '')
        return super().serve(send_body)
