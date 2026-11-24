"""Vercel 上的只读互动展示入口；大资源由 public 静态目录提供。"""
import os
import sys
from pathlib import Path
from urllib.parse import urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from local_zh import ChineseMirror


class handler(ChineseMirror):
    offline = True
    blog_url = os.environ.get('BLOG_URL', 'https://blog.242424.help/').rstrip('/') + '/'

    def prepare_document(self, content):
        target = urlsplit(self.blog_url)
        if target.scheme != 'https' or not target.hostname or target.username:
            raise ValueError('BLOG_URL must be an HTTPS URL without credentials')
        return super().prepare_document(content)
