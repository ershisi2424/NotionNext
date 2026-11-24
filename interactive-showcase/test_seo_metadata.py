import unittest
from xml.etree import ElementTree

from mirror import ROUTES
from seo_metadata import crawl_response, SITE_URL, NAMESPACE


class CrawlMetadataTests(unittest.TestCase):
    def test_root_index_discovers_both_sites(self):
        content_type, body = crawl_response('/sitemap.xml')
        self.assertTrue(content_type.startswith('application/xml'))
        root = ElementTree.fromstring(body)
        self.assertEqual(root.tag, '{' + NAMESPACE + '}sitemapindex')
        urls = [node.text for node in root.findall('.//{' + NAMESPACE + '}loc')]
        self.assertEqual(urls, [SITE_URL + '/sitemap-public.xml', SITE_URL + '/blog/sitemap.xml'])

    def test_public_map_contains_real_local_routes_without_duplicates(self):
        _, body = crawl_response('/sitemap-public.xml')
        root = ElementTree.fromstring(body)
        urls = [node.text for node in root.findall('.//{' + NAMESPACE + '}loc')]
        self.assertEqual(len(urls), len(set(urls)))
        self.assertIn(SITE_URL + '/', urls)
        self.assertIn(SITE_URL + '/works/giftbede', urls)
        self.assertTrue(all(url.removeprefix(SITE_URL) in ROUTES for url in urls))

    def test_root_robots_announces_index_and_does_not_block_crawlers(self):
        _, body = crawl_response('/robots.txt')
        self.assertIn(b'User-agent: *\nAllow: /', body)
        self.assertIn((SITE_URL + '/sitemap.xml').encode(), body)
        self.assertNotIn(b'Disallow: /', body)
        self.assertIsNone(crawl_response('/blog/sitemap.xml'))


if __name__ == '__main__':
    unittest.main()
