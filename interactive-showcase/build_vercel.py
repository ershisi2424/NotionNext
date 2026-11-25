"""把快照中的公开资源导出到 Vercel CDN，保留网页设备变体由函数处理。"""
import argparse
import json
import shutil
from pathlib import Path
from urllib.parse import urlsplit
from asset_pipeline import MANIFEST, records, rewrite, version, image_key

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output')
    options = parser.parse_args()
    output = Path(options.output).resolve() if options.output else ROOT / 'public'
    output.mkdir(exist_ok=True)
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    release = manifest['version']
    if release != version():
        raise ValueError('Asset inputs changed: run python interactive-showcase/asset_pipeline.py and commit its manifest/config')
    versioned = output / 'v' / release
    images = {tuple(item['key']): item['file'] for item in manifest['images']}
    count = 0
    for record, body in records():
        key = image_key(record['url'])
        if key in images:
            target = versioned / 'images' / images[key]
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(body, target)
    for metadata in (ROOT / 'snapshot').glob('*/*/response.json'):
        record = json.loads(metadata.read_text(encoding='utf-8'))
        route = urlsplit(record['url'])
        if route.query or record['status'] != 200 or record.get('variant'):
            continue
        if record['content_type'].startswith('text/html') or route.path.startswith('/api/'):
            continue
        relative = Path(route.path.lstrip('/'))
        if not relative.parts or '..' in relative.parts or '\\' in route.path:
            raise ValueError(f'Invalid asset path: {route.path}')
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(metadata.with_name(record.get('body', 'body')), target)
        target_v = versioned / relative
        target_v.parent.mkdir(parents=True, exist_ok=True)
        content = target.read_bytes()
        if any(kind in record['content_type'] for kind in ('javascript', 'text/css', 'json')):
            content = rewrite(content, release)
        target_v.write_bytes(content)
        count += 1
    zh = output / '__zh'
    zh.mkdir(exist_ok=True)
    for name in ('localize.js', 'localize.css'):
        shutil.copyfile(ROOT / name, zh / name)
    shutil.copyfile(ROOT / 'zh-CN.tsv', zh / 'messages.tsv')
    shutil.copytree(ROOT / 'photography', zh / 'photography', dirs_exist_ok=True)
    shutil.copytree(ROOT / 'contacts', zh / 'contacts', dirs_exist_ok=True)
    shutil.copytree(zh, versioned / '__zh', dirs_exist_ok=True)
    localize = versioned / '__zh' / 'localize.js'
    localize.write_bytes(rewrite(localize.read_bytes(), release))
    css = versioned / '__zh' / 'localize.css'
    css.write_bytes(rewrite(css.read_bytes(), release))
    print(f'Exported {count} snapshot assets and localization resources to public/')


if __name__ == '__main__':
    main()
