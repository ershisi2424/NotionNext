import json
import subprocess
import unittest

from asset_pipeline import records, rewrite
from scene_performance import optimize_scene, SCENE_SIGNATURE


class ScenePerformanceTests(unittest.TestCase):
    def test_active_refresh_and_idle_budget(self):
        source = next(body.read_text(encoding='utf-8') for record, body in records()
                      if 'javascript' in record['content_type'] and
                      SCENE_SIGNATURE in body.read_text(encoding='utf-8'))
        optimized = optimize_scene(source)
        start = optimized.index('let e1=["pointermove"')
        end = optimized.index('var e4=', start)
        scheduler = optimized[start:end]
        harness = r'''
const assert = require('node:assert/strict');
let now=0, next, audit, renders=0, visits=0, lowPower=false;
const performance={now:()=>now};
const events={};
const window={addEventListener:(name,fn)=>events[name]=fn,removeEventListener(){}};
const requestAnimationFrame=fn=>(next=fn,1), cancelAnimationFrame=()=>{};
const h={useThree:select=>select({advance:()=>{renders++;audit?.(state)}})};
const r={useRef:current=>({current}),useEffect:fn=>fn()};
const b={useFrame:fn=>audit=fn};
const eZ={notifyWorldRendered(){},isWorldPaused:()=>false,
 isWorldLowPower:()=>lowPower,hasFrameDemand:()=>true,onWorldWake(){}};
const e0={isStudioActive:()=>false};
const R={getCameraFocusState:()=>({phase:'idle',activeId:null})};
const eJ={subscribeSceneHighlight:()=>()=>{}};
const eI={subscribeSiteCamera:()=>()=>{}};
let eU=[],eG=0,eB=0,eV=[0],ez=[{}],e_={get:()=>0};
const eq=()=>{};
const matrix={elements:[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]};
const state={camera:{matrixWorld:matrix,projectionMatrix:matrix},
 scene:{traverseVisible:fn=>{visits++;fn({isMesh:true,id:1,matrixWorld:matrix})}}};
'''
        assertions = r'''
e3();
for(now=0;now<900;now+=1000/120) next(now);
assert(renders>100, `Active animation was capped: ${renders} frames`);
assert(visits<=10, `Scene audit repeated too often: ${visits}`);
const before=renders;
lowPower=true;
for(;now<1800;now+=1000/120) next(now);
assert(renders-before<=30, 'Low-power frame budget was removed');
console.log(JSON.stringify({activeFrames:before,sceneAudits:visits,lowPowerFrames:renders-before}));
'''
        result = subprocess.run(['node', '-e', harness + scheduler + assertions],
                                capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertGreater(json.loads(result.stdout)['activeFrames'], 100)
        self.assertEqual(optimized, optimize_scene(optimized))
        exported = rewrite(source.encode(), 'test').decode()
        self.assertIn('desk-scene-smooth-v1', exported)


if __name__ == '__main__':
    unittest.main()
