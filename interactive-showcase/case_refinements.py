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


NAV_MARKER = '/* case-chess-navigation-v1 */'


def refine_case_navigation(source):
    if NAV_MARKER in source or '"PageTransition",()=>d' not in source:
        return source
    changes = (
        ('let n=i(t);!n||', 'let n=i(t);if(n?.pathname.startsWith("/works/"))return;!n||'),
        ('function d(){let e=(0,n.useRouter)()',
         'function d(){let C=false;try{C=sessionStorage.getItem("desk:case-cover")===location.pathname}catch{}let e=(0,n.useRouter)()'),
        ('[d,f]=(0,r.useState)("idle"),[p,m]=(0,r.useState)({cols:0,rows:0})',
         '[d,f]=(0,r.useState)(C?"covered":"idle"),[p,m]=(0,r.useState)(()=>C?{cols:Math.ceil(innerWidth/96),rows:Math.ceil(innerHeight/96)}:{cols:0,rows:0})'),
        ('if((0,r.useEffect)(()=>(u=e=>',
         ' (0,r.useEffect)(()=>{let active=true;let navigate=event=>{event.preventDefault();if(g.current!=="idle")return;g.current="mount";E.current(()=>{try{sessionStorage.setItem("desk:case-cover",new URL(event.detail,location.href).pathname)}catch{}location.assign(event.detail)})};window.addEventListener("desk-case-navigate",navigate);if(C){document.getElementById("desk-case-loading-cover")?.remove();try{sessionStorage.removeItem("desk:case-cover")}catch{}let image=document.querySelector("main img"),ready=Promise.all([document.fonts.ready,image?.decode?image.decode().catch(()=>{}):Promise.resolve()]);Promise.race([ready,new Promise(resolve=>setTimeout(resolve,1500))]).then(()=>{if(active)requestAnimationFrame(()=>requestAnimationFrame(()=>{if(active)f("reveal")}))})}return()=>{active=false;window.removeEventListener("desk-case-navigate",navigate)}},[]);if((0,r.useEffect)(()=>(u=e=>'),
    )
    for before, after in changes:
        if source.count(before) != 1:
            raise ValueError('Case transition implementation changed: ' + before)
        source = source.replace(before, after, 1)
    return NAV_MARKER + source
