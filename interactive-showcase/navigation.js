/* Share the existing 96px chess cover across desktop and mobile documents. */
(() => {
  'use strict';
  const key = 'desk:navigation', reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let busy = false, layer = null, pending = null;
  try { pending = JSON.parse(sessionStorage.getItem(key)); sessionStorage.removeItem(key); } catch {}
  const colors = ['#100f0c', '#191814'];
  function grid(covered) {
    const cols = Math.ceil(innerWidth / 96), rows = Math.ceil(innerHeight / 96);
    const element = document.createElement('div');
    element.setAttribute('aria-hidden', 'true');
    element.id = 'desk-navigation-cover';
    element.style.cssText = `position:fixed;inset:0;display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr);z-index:70;pointer-events:auto`;
    for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) {
      const cell = document.createElement('div');
      cell.style.cssText = `background:${colors[(x+y)%2]};transform:scale(${covered?1.02:0});transform-origin:bottom right;transition:transform 260ms ease-in-out;transition-delay:${16*(cols-1-x+rows-1-y)+(x+y)%2*32}ms`;
      element.appendChild(cell);
    }
    document.documentElement.appendChild(element);
    return {element, duration:16*(cols-1+rows-1)+32+260};
  }
  const frames = callback => requestAnimationFrame(() => requestAnimationFrame(callback));
  function scrollToHash(hash, smooth) {
    const target = document.getElementById(hash.slice(1) || 'top');
    if (!target) {
      if(hash==='#top'){window.scrollTo({top:0,behavior:smooth&&!reduced()?'smooth':'instant'});return true;}
      return false;
    }
    const header=document.querySelector('header');
    const inset=(header?.getBoundingClientRect().height||40)+16;
    const top=Math.max(0,scrollY+target.getBoundingClientRect().top-inset);
    if(Math.abs(scrollY-top)>2)window.scrollTo({top,behavior:smooth&&!reduced()?'smooth':'instant'});
    return true;
  }
  // The 3D homepage may restore its initial scroll after hydration. Keep the
  // requested anchor stable briefly; real user input immediately takes priority.
  if(location.pathname==='/' && location.hash) {
    let cancelled=false, timer;
    const stop=()=>{cancelled=true;clearTimeout(timer);for(const name of ['wheel','touchstart','pointerdown','keydown'])window.removeEventListener(name,stop);};
    for(const name of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(name,stop,{passive:true});
    const until=Date.now()+5000, hash=location.hash;
    const settle=()=>{if(cancelled||location.hash!==hash||Date.now()>until){stop();return;}scrollToHash(hash,false);timer=setTimeout(settle,120);};
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',settle,{once:true});else settle();
  }
  if (pending && pending.path === location.pathname && Date.now()-pending.time<15000 && !reduced()) {
    layer = grid(true); busy = true;
    const reveal = () => {
      if (!layer) return;
      scrollToHash(location.hash, false);
      frames(() => {
        for (const cell of layer.element.children) {cell.style.transformOrigin='top left';cell.style.transform='scale(0)';}
        layer.element.style.pointerEvents='none';
        setTimeout(() => {layer?.element.remove();layer=null;busy=false;},layer.duration);
      });
    };
    const ready = () => {
      const image=document.querySelector('main img');
      Promise.race([Promise.all([document.fonts.ready,image?.decode?image.decode().catch(()=>{}):Promise.resolve()]),new Promise(resolve=>setTimeout(resolve,1200))]).then(reveal);
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
    setTimeout(()=>{if(layer){layer.element.remove();layer=null;busy=false;}},5000);
  }
  // Registered in the head before React: a single owner for these links.
  window.addEventListener('click', event => {
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const link=event.target instanceof Element&&event.target.closest('a[href]');
    if(!link||link.target&&link.target!=='_self'||link.hasAttribute('download'))return;
    const target=new URL(link.href,location.href);
    if(target.origin!==location.origin||target.search||!(target.pathname==='/'||target.pathname.startsWith('/works/')))return;
    event.preventDefault();event.stopImmediatePropagation();
    if(busy)return;
    const menu=document.querySelector('header button[aria-expanded="true"]');
    menu?.click();
    if(target.pathname===location.pathname){
      if(target.hash){if(location.hash!==target.hash)history.pushState(history.state,'',target.hash);window.dispatchEvent(new HashChangeEvent('hashchange'));scrollToHash(target.hash,true);}return;
    }
    if(target.pathname==='/'){try{sessionStorage.setItem('site:started','1');}catch{}}
    if(reduced()){location.assign(target.href);return;}
    busy=true;layer=grid(false);
    frames(()=>{for(const cell of layer.element.children)cell.style.transform='scale(1.02)';});
    setTimeout(()=>{
      try{sessionStorage.setItem(key,JSON.stringify({path:target.pathname,time:Date.now()}));}catch{}
      location.assign(target.href);
    },layer.duration+34);
  },true);
  window.addEventListener('pageshow',event=>{if(event.persisted){layer?.element.remove();layer=null;busy=false;}});
})();
