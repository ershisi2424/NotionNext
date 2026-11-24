"""机器人点击播放本地音频，替换原站外跳转。"""
import hashlib
import json
import re
import subprocess
from pathlib import Path

from mirror import CACHE, atomic_write

ROOT = Path(__file__).resolve().parent
URL = '/sounds/robot/yaoyao-lingxian.mp3'


def main():
    audio = (ROOT / 'sounds' / 'yaoyao-lingxian.mp3').read_bytes()
    key = hashlib.sha256(json.dumps([URL, {}], sort_keys=True).encode()).hexdigest()
    directory = CACHE / key[:2] / key
    directory.mkdir(parents=True, exist_ok=True)
    atomic_write(directory / 'body', audio)
    atomic_write(directory / 'response.json', json.dumps({'url': URL, 'variant': {}, 'status': 200, 'content_type': 'audio/mpeg', 'body': 'body', 'headers': {}}).encode())
    pattern = re.compile(r'onClick:\(\)=>\{let e=i\.default\.env\.NEXT_PUBLIC_ROBOT_URL\?\.trim\(\)\|\|"https://origin\.c-na\.dev";window\.open\(e,"_blank","noopener,noreferrer"\)\}')
    replacement = 'onClick:()=>{window.dispatchEvent(new CustomEvent("desk-robot-audio"))}'
    count = 0
    for meta in CACHE.glob('*/*/response.json'):
        record = json.loads(meta.read_text(encoding='utf-8'))
        if not record['url'].split('?', 1)[0].endswith('.js'):
            continue
        path = meta.with_name(record.get('body', 'body'))
        source = path.read_text(encoding='utf-8')
        if 'NEXT_PUBLIC_ROBOT_URL' not in source and 'desk-robot-audio' not in source:
            continue
        updated, matches = pattern.subn(replacement, source)
        assert matches or 'desk-robot-audio' in source
        updated = updated.replace('children:"Origin"', 'children:"大嘴"')
        subprocess.run(['node', '--check', '-'], input=updated, encoding='utf-8', check=True, capture_output=True)
        atomic_write(path, updated.encode('utf-8'))
        count += 1
    assert count
    print(f'已更新 {count} 个机器人模块，音频已接入本地缓存。')


if __name__ == '__main__':
    main()
