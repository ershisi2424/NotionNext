"""Serve precompiled Chinese payloads before HTML is painted or React starts."""
import base64
import hashlib
import json
import zlib
from functools import lru_cache
from pathlib import Path

DATA = Path(__file__).with_name('native-zh.json')


@lru_cache(maxsize=1)
def catalog():
    return json.loads(DATA.read_text(encoding='utf-8'))['payloads']


@lru_cache(maxsize=128)
def localize_native(content):
    normalized = content.replace(b'\r\n', b'\n')
    encoded = catalog().get(hashlib.sha256(normalized).hexdigest())
    return zlib.decompress(base64.b64decode(encoded)) if encoded else content


def verify_native_inputs(records):
    manifest = json.loads(DATA.read_text(encoding='utf-8'))
    def digest(content):
        return hashlib.sha256(content.replace(b'\r\n', b'\n')).hexdigest()
    for name, key in [('zh-CN.tsv', 'dictionary_sha'), ('compile_chinese.cjs', 'compiler_sha')]:
        if digest(DATA.with_name(name).read_bytes()) != manifest[key]:
            raise ValueError('Chinese payloads are stale: run node interactive-showcase/compile_chinese.cjs')
    sources = {digest(body.read_bytes()) for record, body in records
               if any(kind in record['content_type'] for kind in ('javascript', 'text/html', 'text/x-component'))}
    if sources != set(manifest['sources']):
        raise ValueError('Snapshot inputs changed: recompile Chinese payloads before export')
