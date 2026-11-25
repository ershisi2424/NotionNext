"""Repair the existing progressive image transition; do not add visual effects."""

MARKER = '/* progressive-image-ready-v1 */'


def refine_case_images(source):
    source = refine_case_navigation(source)
    if MARKER in source or '"ProgressiveImage",()=>g' not in source:
        return source
    changes = (
        # Initial opacity must be zero until decode has completed, including cache hits.
        ('let U=!A(3),k=$(3)?l:""', 'let U=!O[3],k=l'),
        # Keep the original lower-resolution layer through the existing fade duration.
        ('700*!!E', 'window.matchMedia("(prefers-reduced-motion: reduce)").matches?0:700'),
        # Commit the hidden frame before revealing a cached/decoded image.
        ('catch{}}I(3)};if', 'catch{}}let reveal=()=>{window.matchMedia("(prefers-reduced-motion: reduce)").matches?I(3):requestAnimationFrame(()=>requestAnimationFrame(()=>I(3)))};t.decode?t.decode().catch(()=>{}).then(reveal):reveal()};if'),
    )
    for before, after in changes:
        if source.count(before) != 1:
            raise ValueError('Progressive image implementation changed: ' + before)
        source = source.replace(before, after, 1)
    return MARKER + source


NAV_MARKER = '/* shared-chess-navigation-v2 */'


def refine_case_navigation(source):
    # The document-level handler owns home/case links on every device.
    if NAV_MARKER in source or '"PageTransition",()=>d' not in source:
        return source
    before = 'let n=i(t);!n||'
    after = 'let n=i(t);if(n&&(n.pathname==="/"||n.pathname.startsWith("/works/")))return;!n||'
    if source.count(before) != 1:
        raise ValueError('Page transition navigation signature changed')
    return NAV_MARKER + source.replace(before, after, 1)
