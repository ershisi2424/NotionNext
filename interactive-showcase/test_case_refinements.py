import re
import unittest
from asset_pipeline import records, rewrite
from native_chinese import localize_native
from case_refinements import refine_case_images, MARKER


class CaseRefinementTests(unittest.TestCase):
    def test_original_progressive_image_fade_waits_for_decode(self):
        count = 0
        for record, body in records():
            if 'javascript' not in record['content_type']:
                continue
            source = localize_native(body.read_bytes()).decode()
            if '"ProgressiveImage",()=>g' not in source:
                continue
            updated = refine_case_images(source)
            self.assertIn('let U=!O[3],k=l', updated)
            self.assertIn('t.decode().catch(()=>{}).then(reveal)', updated)
            self.assertNotIn('700*!!E', updated)
            self.assertEqual(updated, refine_case_images(updated))
            count += 1
        self.assertEqual(count, 3)

    def test_all_initial_tab_titles_omit_original_author(self):
        count = 0
        for record, body in records():
            if 'text/html' not in record['content_type']:
                continue
            output = localize_native(body.read_bytes()).decode()
            title = re.search(r'<title>(.*?)</title>', output)
            if title:
                self.assertNotRegex(title[1], r'(?i)Sina|Gholizadeh|Golizadeh')
                count += 1
        self.assertGreater(count, 10)


if __name__ == '__main__':
    unittest.main()
