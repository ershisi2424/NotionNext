import json
import unittest
from asset_pipeline import records
from native_chinese import DATA, localize_native, verify_native_inputs


class NativeChineseTests(unittest.TestCase):
    def test_compiled_inputs_are_current(self):
        verify_native_inputs(records())

    def test_both_home_variants_are_chinese_before_scripts_run(self):
        devices = set()
        for record, body in records():
            device = record.get('variant', {}).get('device')
            if record['url'] != '/' or not device:
                continue
            output = localize_native(body.read_bytes()).decode('utf-8')
            devices.add(device)
            self.assertIn('lang="zh-CN"', output)
            self.assertIn('id="hero-name">二十四直播调试</h1>', output)
            self.assertIn('ershisigu@qq.com', output)
            for original in ['The fastest way to reach me', 'Available for full-time and freelance work', 'Open to full-time roles and freelance projects']:
                self.assertNotIn(original, output)
        self.assertEqual(devices, {'mobile', 'desktop'})

    def test_desktop_and_loading_labels_are_compiled(self):
        labels = {'About Me': '关于我', 'Downloads': '下载', 'Opening the Rolodex.': '正在打开名片夹。'}
        checked = set()
        for record, body in records():
            if 'javascript' not in record['content_type']:
                continue
            source = body.read_bytes()
            output = localize_native(source).decode('utf-8')
            for original, chinese in labels.items():
                if json.dumps(original).encode() in source:
                    self.assertIn(chinese, output)
                    checked.add(original)
        self.assertEqual(checked, set(labels))

    def test_binary_assets_are_not_modified(self):
        blob = b'\x00\xffglTF\x01About Me\x00'
        self.assertEqual(blob, localize_native(blob))


if __name__ == '__main__':
    unittest.main()
