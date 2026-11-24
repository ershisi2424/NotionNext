"""Root crawl endpoints, independent of the Notion-backed /blog service."""
from xml.etree.ElementTree import Element, SubElement, tostring

from mirror import ROUTES

SITE_URL = 'https://www.242424.help'
NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9'


def crawl_response(path):
    if path == '/robots.txt':
        body = f'User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n'
        return 'text/plain; charset=utf-8', body.encode('utf-8')
    if path == '/sitemap.xml':
        root = Element('sitemapindex', xmlns=NAMESPACE)
        for suffix in ('/sitemap-public.xml', '/blog/sitemap.xml'):
            item = SubElement(root, 'sitemap')
            SubElement(item, 'loc').text = SITE_URL + suffix
    elif path == '/sitemap-public.xml':
        root = Element('urlset', xmlns=NAMESPACE)
        for route in dict.fromkeys(ROUTES):
            item = SubElement(root, 'url')
            SubElement(item, 'loc').text = SITE_URL + route
    else:
        return None
    return 'application/xml; charset=utf-8', tostring(root, encoding='utf-8', xml_declaration=True)
