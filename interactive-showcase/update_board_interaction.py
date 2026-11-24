"""给开发板原有点击动作补充事件，保留运行电路动画的行为。"""
import json
import subprocess

from mirror import CACHE, atomic_write


def main():
    original = '(0,i.startArduinoSketch)()'
    patched = original + ';window.dispatchEvent(new CustomEvent("desk-esp32-click"))'
    updates = []
    found = 0
    for metadata in CACHE.glob('*/*/response.json'):
        record = json.loads(metadata.read_text(encoding='utf-8'))
        if not record['url'].split('?', 1)[0].endswith('.js'):
            continue
        path = metadata.with_name(record.get('body', 'body'))
        source = path.read_text(encoding='utf-8')
        if '/models/arduino_uno.glb' not in source:
            continue
        if patched in source:
            found += 1
            continue
        assert source.count(original) == 1, '开发板点击回调与预期不符'
        updated = source.replace(original, patched, 1)
        subprocess.run(['node', '--check', '-'], input=updated, encoding='utf-8', check=True, capture_output=True)
        updates.append((path, updated))
        found += 1
    assert found, '未找到开发板组件'
    for path, updated in updates:
        atomic_write(path, updated.encode('utf-8'))
    print(f'已核对 {found} 个开发板模块，更新 {len(updates)} 个。')


if __name__ == '__main__':
    main()
