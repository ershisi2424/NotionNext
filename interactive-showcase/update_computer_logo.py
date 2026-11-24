"""替换 GLB 中电脑外壳的标识贴图，保留网格、材质与屏幕。"""
import json
import struct
from pathlib import Path

from mirror import CACHE, atomic_write

ROOT = Path(__file__).resolve().parent


def main():
    image = (ROOT / 'mac-huawei-texture.png').read_bytes()
    assert image.startswith(b'\x89PNG\r\n\x1a\n')
    count = 0
    for metadata in CACHE.glob('*/*/response.json'):
        record = json.loads(metadata.read_text(encoding='utf-8'))
        if record['url'] != '/models/mac.glb':
            continue
        path = metadata.with_name(record.get('body', 'body'))
        data = path.read_bytes()
        backup = ROOT / 'mac-original.glb'
        if not backup.exists():
            atomic_write(backup, data)
        original = backup.read_bytes()
        assert original[:4] == b'glTF'
        length = struct.unpack_from('<I', original, 12)[0]
        model = json.loads(original[20:20 + length])
        binary = original[28 + length:]
        binary += b'\0' * (-len(binary) % 4)
        offset = len(binary)
        binary += image
        binary += b'\0' * (-len(binary) % 4)
        model['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(image)})
        model['images'][0] = {'name': 'Huawei Computer Logo', 'mimeType': 'image/png', 'bufferView': len(model['bufferViews']) - 1}
        model['buffers'][0]['byteLength'] = len(binary)
        header = json.dumps(model, separators=(',', ':')).encode('utf-8')
        header += b' ' * (-len(header) % 4)
        output = struct.pack('<4sII', b'glTF', 2, 28 + len(header) + len(binary))
        output += struct.pack('<I4s', len(header), b'JSON') + header
        output += struct.pack('<I4s', len(binary), b'BIN\0') + binary
        assert len(output) == struct.unpack_from('<I', output, 8)[0]
        atomic_write(path, output)
        count += 1
    assert count, '未找到电脑模型'
    print(f'已更新 {count} 个电脑模型，原模型已保留。')


if __name__ == '__main__':
    main()
