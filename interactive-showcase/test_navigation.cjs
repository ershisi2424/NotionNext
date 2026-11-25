const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/navigation.js','utf8');
function setup(path='/',reduced=false){
 const handlers={},timers=[],assigned=[],storage=new Map(),scrolls=[],hashes=[];
 const element=()=>({style:{},children:[],setAttribute(){},appendChild(n){this.children.push(n)},remove(){this.removed=true}});
 const document={documentElement:element(),readyState:'complete',fonts:{ready:Promise.resolve()},getElementById(id){return{getBoundingClientRect(){return{top:500}}}},querySelector(){return null},createElement:element,addEventListener(){}};
 const location={pathname:path,href:'https://example.test'+path,origin:'https://example.test',hash:'',assign(url){assigned.push(url)}};
 const context={document,location,innerWidth:390,innerHeight:844,scrollY:0,HashChangeEvent:class{},Date,JSON,Promise,URL,Element:class{},matchMedia:()=>({matches:reduced}),requestAnimationFrame:fn=>fn(),setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},sessionStorage:{getItem:k=>storage.get(k)||null,removeItem:k=>storage.delete(k),setItem:(k,v)=>storage.set(k,v)},history:{pushState:(a,b,hash)=>hashes.push(hash)},window:{addEventListener:(name,fn)=>handlers[name]=fn,dispatchEvent(){},scrollTo:options=>scrolls.push(options)}};
 vm.runInNewContext(source,context);
 function click(href,extra={}){const target=new context.Element();target.closest=()=>({href,target:'',hasAttribute:()=>false});const event={button:0,target,preventDefault(){this.prevented=true},stopImmediatePropagation(){},...extra};handlers.click(event);return event;}
 return {click,timers,assigned,storage,scrolls,hashes,document};
}
let s=setup('/');s.click('https://example.test/#top');assert.equal(s.assigned.length,0);assert.equal(s.scrolls[0].top,444);assert.equal(s.hashes[0],'#top');
s=setup('/works/giftbede');s.click('https://example.test/#contact');assert.equal(s.assigned.length,0);assert.ok(s.document.documentElement.children.length);s.click('https://example.test/#contact');assert.equal(s.timers.length,1);s.timers[0].fn();assert.equal(s.assigned.length,1);assert.equal(s.storage.get('site:started'),'1');assert.equal(JSON.parse(s.storage.get('desk:navigation')).path,'/');
s=setup('/');assert.ok(!s.click('https://other.test/').prevented);assert.ok(!s.click('https://example.test/works/giftbede',{ctrlKey:true}).prevented);assert.equal(s.timers.length,0);
s=setup('/',true);s.click('https://example.test/works/giftbede');assert.equal(s.assigned.length,1);assert.equal(s.document.documentElement.children.length,0);
console.log('Navigation behavior checks passed: same-page, contact, duplicate click, external/modified click, reduced motion');
