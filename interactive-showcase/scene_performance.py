"""Small, validated performance patches for the captured desktop scene.

Keep camera poses, easing, artwork and idle/low-power scheduling unchanged.
Apply during export rather than editing the retained source snapshot.
"""

MARKER = '/* desk-scene-smooth-v1 */'
SCENE_SIGNATURE = 'function e3(){let e=(0,h.useThree)(e=>e.advance)'
PATCHES = (
    # Render active interaction at the browser's refresh cadence. Camera
    # transitions already do this; the old input branch capped it at 60 Hz.
    ('let f=1e3/x,g=e-r;', 'if(60===x){r=e,b(e);return}let f=1e3/x,g=e-r;'),
    # Audit object transforms at 10 Hz; camera matrices are still checked on
    # every rendered frame. 100 ms remains below the existing 150 ms wake
    # window and well below the 1500 ms idle timeout.
    ('let r=l.current,{current:s}=r;s.length=0,t.traverseVisible',
     'let r=l.current;if(performance.now()-(r.lastAudit??0)<100)return;'
     'r.lastAudit=performance.now();let{current:s}=r;s.length=0,t.traverseVisible'),
    # Respond sooner to sustained slow active frames while keeping the
    # existing quality tiers, cooldown and cautious recovery hysteresis.
    ('eU.length<45', 'eU.length<30'),
    ('if(i>25&&n<ez.length-1)', 'if(i>20.5&&n<ez.length-1)'),
    ('eB=i<18.5?eB+1:0', 'eB=i<16.9?eB+1:0'),
)


def optimize_scene(source):
    if MARKER in source or SCENE_SIGNATURE not in source:
        return source
    for old, new in PATCHES:
        if source.count(old) != 1:
            raise ValueError('Scene performance patch no longer matches: ' + old)
        source = source.replace(old, new, 1)
    return MARKER + source
