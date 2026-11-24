"""Versioned, byte-preserving asset export shared by the build and HTML server."""
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent
MANIFEST = ROOT / 'asset-manifest.json'
PREFIX = '/__showcase/v/'
ASSET_PATH = re.compile(r'(?<![\w./-])/(?:_next/(?!image)|__zh/|models/|textures/|sounds/|stills/|projects/|logos/|draco/|icons/|tech-icons/|about/|testimonials/|gifs/)')


def records():
    for metadata in sorted((ROOT / 'snapshot').glob('*/*/response.json')):
        record = json.loads(metadata.read_text(encoding='utf-8'))
        body = metadata.with_name(record.get('body', 'body'))
        if record['status'] == 200 and body.is_file():
            yield record, body


def version():
    digest = hashlib.sha256()
    for record, body in records():
        digest.update(json.dumps([record['url'], record.get('variant')], sort_keys=True).encode())
        content = body.read_bytes()
        if any(kind in record['content_type'] for kind in ('text/', 'javascript', 'json')):
            content = content.replace(b'\r\n', b'\n')
        digest.update(hashlib.sha256(content).digest())
    for name in ('localize.js', 'localize.css', 'zh-CN.tsv', 'asset_pipeline.py', 'build_vercel.py', 'local_zh.py'):
        digest.update((ROOT / name).read_bytes().replace(b'\r\n', b'\n'))
    for path in sorted((ROOT / 'photography').rglob('*')):
        if path.is_file():
            digest.update(path.relative_to(ROOT).as_posix().encode())
            digest.update(hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest()[:20]


def rewrite(content, release):
    # Avoid Vercel's reserved Next Image endpoint, which may re-encode snapshots.
    text = re.sub(r'(?<![\w./-])/_next/image\b', '/__showcase-image', content.decode('utf-8'))
    return ASSET_PATH.sub(lambda match: PREFIX + release + match.group(), text).encode('utf-8')


def image_key(url):
    route = urlsplit(url)
    if route.path != '/_next/image':
        return None
    params = parse_qs(route.query)
    if set(params) != {'url', 'w', 'q'} or any(len(v) != 1 for v in params.values()):
        return None
    return tuple(params[k][0] for k in ('url', 'w', 'q'))


def prepare_config():
    release = version()
    images = {}
    for record, body in records():
        key = image_key(record['url'])
        if key and not record.get('variant') and record['content_type'].startswith('image/'):
            images[key] = hashlib.sha256(body.read_bytes()).hexdigest() + '.' + record['content_type'].split('/')[1].split(';')[0].replace('jpeg', 'jpg')
    config_path = ROOT.parent / 'vercel.json'
    config = json.loads(config_path.read_text(encoding='utf-8'))
    # Only replace our generated rules; preserve all existing page and blog routing.
    rules = [rule for rule in config['rewrites'] if not rule.get('source', '').startswith(PREFIX) and rule.get('source') != '/__showcase-image' and not (rule.get('source') == '/_next/image' and rule.get('has'))]
    image_rules = [{
        'source': '/__showcase-image',
        'has': [{'type': 'query', 'key': k, 'value': re.escape(v)} for k, v in zip(('url', 'w', 'q'), key)],
        'destination': f'/blog/__showcase-assets/v/{release}/images/{name}',
    } for key, name in sorted(images.items())]
    config['rewrites'] = [{'source': PREFIX + ':version/:path*', 'destination': '/blog/__showcase-assets/v/:version/:path*'}, *image_rules, {'source': '/__showcase-image', 'destination': '/api/showcase?__showcase_path=/_next/image'}, *rules]
    config['headers'] = [rule for rule in config.get('headers', []) if not rule.get('source', '').startswith(PREFIX)] + [{
        'source': PREFIX + ':version/:path*',
        'headers': [{'key': 'Cache-Control', 'value': 'public, max-age=31536000, immutable'}],
    }]
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    MANIFEST.write_text(json.dumps({'version': release, 'images': [{'key': key, 'file': name} for key, name in sorted(images.items())]}, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared version {release}: {len(images)} exact image routes')


if __name__ == '__main__':
    prepare_config()
