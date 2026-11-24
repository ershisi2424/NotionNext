"""Root showcase on the same deployment as the /blog Next.js application."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'interactive-showcase'))
from local_zh import ChineseMirror

class handler(ChineseMirror):
    offline = True
    blog_url = 'https://242424.help/blog/'
