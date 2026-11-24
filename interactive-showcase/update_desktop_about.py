"""从本地文案更新电脑的关于我文档，保留窗口及文件行为。"""
import json
import re
import subprocess
from pathlib import Path

from mirror import CACHE, atomic_write

ROOT = Path(__file__).resolve().parent


def main():
    about = json.loads((ROOT / 'desktop-about.json').read_text(encoding='utf-8'))
    assert about['id'] == 'about-me' and about['sections']
    pattern = re.compile(r'([\w$]+)=\{id:"about-me",title:.*?\},(?=[\w$]+=[\w$]+\.PROJECTS\.flatMap)', re.S)
    # 首次更新后为 JSON 属性格式，后续仍可重复运行。
    updated_pattern = re.compile(r'(\w+)=/\*local-desktop-about\*/.*?/\*local-desktop-about:end\*/,', re.S)
    payload = json.dumps(about, ensure_ascii=False, separators=(',', ':'))
    updates = []
    matched = 0
    for metadata in CACHE.glob('*/*/response.json'):
        record = json.loads(metadata.read_text(encoding='utf-8'))
        if not record['url'].split('?', 1)[0].endswith('.js'):
            continue
        path = metadata.with_name(record.get('body', 'body'))
        source = path.read_text(encoding='utf-8')
        match = updated_pattern.search(source) or pattern.search(source)
        if not match:
            continue
        matched += 1
        replacement = f'{match[1]}=/*local-desktop-about*/{payload}/*local-desktop-about:end*/,'
        updated = source[:match.start()] + replacement + source[match.end():]
        if updated == source:
            continue
        subprocess.run(['node', '--check', '-'], input=updated, encoding='utf-8', capture_output=True, check=True)
        updates.append((path, updated))
    assert matched, '未找到关于我文档模块'
    for path, updated in updates:
        atomic_write(path, updated.encode('utf-8'))
    print(f'已核对 {matched} 个关于我模块，更新 {len(updates)} 个；语法检查通过。')


if __name__ == '__main__':
    main()
