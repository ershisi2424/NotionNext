"""Root showcase on the same deployment as the /blog Next.js application."""
import sys
from pathlib import Path
from urllib.parse import urlsplit, parse_qsl, urlencode
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'interactive-showcase'))
from local_zh import ChineseMirror

class handler(ChineseMirror):
    offline = True
    blog_url = 'https://242424.help/blog/'

    def serve(self, send_body):
        route = urlsplit(self.path)
        pairs = parse_qsl(route.query, keep_blank_values=True)
        original = next((value for key, value in pairs if key == '__showcase_path'), route.path)
        query = urlencode([(key, value) for key, value in pairs if key != '__showcase_path'])
        self.path = original + ('?' + query if query else '')
        return super().serve(send_body)
