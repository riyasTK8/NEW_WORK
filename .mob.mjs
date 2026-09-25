import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const SP=process.env.SP, PORT=9500, BASE="http://localhost:4600/";
const chrome=spawn("google-chrome",["--headless=new",`--remote-debugging-port=${PORT}`,"--no-sandbox","--disable-gpu","--hide-scrollbars","--user-data-dir="+SP+"/ch-mob","about:blank"],{stdio:"ignore"});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let t;for(let i=0;i<40;i++){try{const l=await(await fetch(`http://localhost:${PORT}/json/list`)).json();t=l.find(x=>x.type==="page");if(t)break;}catch{}await sleep(250);}
const ws=new WebSocket(t.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let id=0;const p=new Map();let evts=[];
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&p.has(m.id)){p.get(m.id)(m);p.delete(m.id);}else if(m.method)evts.push(m);};
const send=(m,q={})=>new Promise(r=>{const i=++id;p.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:q}));});
const ev=async e=>(await send("Runtime.evaluate",{expression:e,awaitPromise:true,returnByValue:true})).result?.result?.value;
await send("Page.enable");await send("Runtime.enable");await send("Log.enable");await send("Network.enable");

// Real device metrics. CPU throttle 4x approximates a mid-range phone.
const D=[
 ["iPhone SE 2",        375,667,2],
 ["iPhone 13 mini",     375,812,3],
 ["iPhone 14/15",       393,852,3],
 ["iPhone 15 Pro Max",  430,932,3],
 ["Pixel 5",            393,851,3],
 ["Pixel 7 Pro",        412,892,3],
 ["Galaxy S8",          360,740,4],
 ["Galaxy S21 Ultra",   384,854,4],
 ["small Android",      360,640,3],
 ["very small",         320,568,2],
 ["iPhone 14 landscape",852,393,3],
 ["Galaxy landscape",   740,360,4],
];
const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=(r,g,b)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);

console.log("device                ovfX heroFits textFits  h2  tier    rAFmed  rAFp95  contrast");
for (const [name,w,h,dpr] of D){
  evts=[];
  await send("Page.navigate",{url:"about:blank"}); await sleep(300);
  await send("Emulation.setDeviceMetricsOverride",{width:w,height:h,deviceScaleFactor:dpr,mobile:true});
  await send("Emulation.setTouchEmulationEnabled",{enabled:true,maxTouchPoints:5});
  await send("Emulation.setCPUThrottlingRate",{rate:4});
  await send("Page.navigate",{url:BASE});
  await sleep(11000);
  const m=await ev(`
   (()=>{const sc=[...document.querySelectorAll('[data-scene]')].find(e=>+getComputedStyle(e).opacity>0.5);
    const box=sc?sc.querySelector('div'):null;const h2=sc?sc.querySelector('h2'):null;
    const panel=document.querySelector('[data-hero-panel]');const r=box?box.getBoundingClientRect():null;
    return {ovf:document.documentElement.scrollWidth>window.innerWidth+1,
      heroFits:Math.round(panel.getBoundingClientRect().height)<=window.innerHeight+1,
      fitsV:r?(r.top>=-1&&r.bottom<=window.innerHeight+1):true,
      h2:h2?Math.round(parseFloat(getComputedStyle(h2).fontSize)):0,
      box:r?[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)].join(','):'-'};})()`);
  // smoothness under throttle, no pixel readback
  const perf=await ev(`(async()=>{
    const s=document.getElementById('top');
    const range=s.getBoundingClientRect().height-window.innerHeight;
    const times=[];let last=performance.now();let run=true;
    const tick=()=>{const n=performance.now();times.push(n-last);last=n;if(run)requestAnimationFrame(tick);};
    requestAnimationFrame(tick);
    for(let k=0;k<=50;k++){window.scrollTo(0,s.offsetTop+(k/50)*range);await new Promise(r=>setTimeout(r,16));}
    run=false;await new Promise(r=>setTimeout(r,120));
    times.shift();times.sort((a,b)=>a-b);
    const pct=q=>times[Math.floor(q*(times.length-1))];
    return {med:+pct(0.5).toFixed(1),p95:+pct(0.95).toFixed(1),heap:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):-1};})()`);
  // contrast behind the copy
  const {result:shot}=await send("Page.captureScreenshot",{format:"png"});
  writeFileSync(`${SP}/m-${name.replace(/\W+/g,"-")}.png`,Buffer.from(shot.data,"base64"));
  await ev(`document.querySelectorAll('[data-scene]').forEach(e=>e.style.visibility='hidden')`);
  await sleep(400);
  const {result:bare}=await send("Page.captureScreenshot",{format:"png"});
  const sharp=(await import("sharp")).default;
  const {data,info}=await sharp(Buffer.from(bare.data,"base64")).raw().toBuffer({resolveWithObject:true});
  const [bx,by,bw,bh]=m.box==="-"?[0,0,0,0]:m.box.split(",").map(Number);
  const sx=info.width/w, sy=info.height/h; const vals=[];
  for(let y=Math.max(0,by);y<Math.min(h,by+bh);y+=3)for(let x=Math.max(0,bx);x<Math.min(w,bx+bw);x+=3){
    const i=(Math.round(y*sy)*info.width+Math.round(x*sx))*info.channels;
    vals.push(L(data[i],data[i+1],data[i+2]));}
  vals.sort((a,b)=>a-b);
  const p90=vals.length?vals[Math.floor(0.9*(vals.length-1))]:0;
  const ratio=1.05/(p90+0.05);
  const tier=[...new Set(evts.filter(e=>e.method==="Network.requestWillBeSent"&&/hero-frames\/\w+\//.test(e.params.request.url)).map(r=>r.params.request.url.split('hero-frames/')[1].split('/')[0]))].join(",")||"-";
  console.log(`${name.padEnd(21)} ${(m.ovf?"YES":"no").padEnd(4)} ${(m.heroFits?"yes":"NO").padEnd(8)} ${(m.fitsV?"yes":"NO").padEnd(8)} ${String(m.h2).padStart(3)} ${tier.padEnd(7)} ${String(perf.med+"ms").padStart(7)} ${String(perf.p95+"ms").padStart(7)}  ${ratio.toFixed(1)}:1 ${ratio>=4.5?"":"LOW"}`);
}
ws.close();chrome.kill();process.exit(0);
