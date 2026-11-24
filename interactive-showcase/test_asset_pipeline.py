import hashlib
import json
import re
import unittest
from asset_pipeline import ROOT, MANIFEST, image_key, records, rewrite, version


class AssetPipelineTests(unittest.TestCase):
    def test_image_routes_accept_hydrated_versioned_sources(self):
        config = json.loads((ROOT.parent / 'vercel.json').read_text())
        routes = [r for r in config['rewrites'] if r['source'] == '/__showcase-image' and r.get('has')]
        self.assertTrue(routes)
        for route in routes:
            pattern = next(h['value'] for h in route['has'] if h['key'] == 'url')
            source = re.sub(r'^\(\?:.*?\)\?', '', pattern)
            source = re.sub(r'\\(.)', r'\1', source)
            self.assertIsNotNone(re.fullmatch(pattern, source))
            self.assertIsNotNone(re.fullmatch(pattern, '/__showcase/v/8e5cad428d2717135ff1' + source))

    def test_version_matches_inputs(self):
        self.assertEqual(json.loads(MANIFEST.read_text())['version'], version())

    def test_image_key_keeps_width_and_quality_and_ignores_order(self):
        self.assertEqual(image_key('/_next/image?q=75&w=640&url=%2Fstills%2Fhero.webp'),
                         ('/stills/hero.webp', '640', '75'))
        self.assertNotEqual(image_key('/_next/image?q=30&w=640&url=%2Fa.webp'),
                            image_key('/_next/image?q=75&w=640&url=%2Fa.webp'))
        self.assertIsNone(image_key('/_next/image?url=a&w=640&q=75&q=30'))

    def test_rewrite_preserves_external_and_image_urls_and_is_idempotent(self):
        source = b'"/models/mac.glb" "https://other.test/models/mac.glb" "/_next/image?url=x" "/_next/" "/blog/article/guide"'
        result = rewrite(source, 'test')
        self.assertIn(b'"/__showcase/v/test/models/mac.glb"', result)
        self.assertIn(b'"https://other.test/models/mac.glb"', result)
        self.assertIn(b'"/__showcase-image?url=x"', result)
        self.assertIn(b'"/__showcase/v/test/_next/"', result)
        self.assertIn(b'"/blog/article/guide"', result)
        self.assertEqual(result, rewrite(result, 'test'))

    def test_exported_images_are_byte_identical(self):
        manifest = json.loads(MANIFEST.read_text())
        mapping = {tuple(item['key']): item['file'] for item in manifest['images']}
        output = ROOT.parent / 'public' / '__showcase-assets' / 'v' / manifest['version'] / 'images'
        checked = set()
        for record, body in records():
            key = image_key(record['url'])
            if key in mapping:
                self.assertEqual(hashlib.sha256(body.read_bytes()).digest(),
                                 hashlib.sha256((output / mapping[key]).read_bytes()).digest())
                checked.add(key)
        self.assertEqual(checked, set(mapping))


if __name__ == '__main__':
    unittest.main()
