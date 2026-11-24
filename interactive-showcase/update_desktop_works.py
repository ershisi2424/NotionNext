"""将电脑内职业文件夹替换为本地作品分类和说明。"""
import json
import re
import subprocess
from pathlib import Path

from mirror import CACHE, atomic_write

ROOT = Path(__file__).resolve().parent
START = '/*local-desktop-works:start*/'
END = '/*local-desktop-works:end*/'


def main():
    content = json.loads((ROOT / 'desktop-works.json').read_text(encoding='utf-8'))
    ids = [entry['id'] for folder in content['folders'] for entry in folder['children']]
    assert len(ids) == len(set(ids))
    assert set(ids) == set(content['notes'])
    folders = json.dumps(content['folders'], ensure_ascii=False, separators=(',', ':'))
    notes = json.dumps(content['notes'], ensure_ascii=False, separators=(',', ':'))
    original = re.compile(r'(\w+)=\[\.\.\.\w+\.map\(e=>\(\{id:`career-.*?\],(\w+)=(\{\.\.\.\w+,\.\.\.\w+\.notes\})', re.S)
    patched = re.compile(re.escape(START) + r'(\w+)=.*?,(\w+)=Object\.assign\((\{\.\.\.\w+,\.\.\.\w+\.notes\}),.*?' + re.escape(END), re.S)
    updates = []
    matched = 0
    for metadata in CACHE.glob('*/*/response.json'):
        record = json.loads(metadata.read_text(encoding='utf-8'))
        if not record['url'].split('?', 1)[0].endswith('.js'):
            continue
        path = metadata.with_name(record.get('body', 'body'))
        source = path.read_text(encoding='utf-8')
        match = patched.search(source) or original.search(source)
        if not match:
            continue
        matched += 1
        replacement = f'{START}{match[1]}={folders},{match[2]}=Object.assign({match[3]},{notes}){END}'
        updated = source[:match.start()] + replacement + source[match.end():]
        if updated == source:
            continue
        subprocess.run(['node', '--check', '-'], input=updated, encoding='utf-8', capture_output=True, check=True)
        updates.append((path, updated))
    assert matched, '未找到电脑作品数据模块'
    for path, updated in updates:
        atomic_write(path, updated.encode('utf-8'))
    print(f'已核对 {matched} 个模块，更新 {len(updates)} 个；共 {len(content["folders"])} 类、{len(ids)} 篇作品说明。')


if __name__ == '__main__':
    main()
