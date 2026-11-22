
const {chromium}=require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(process.argv[2],'dist'), out=path.join(process.argv[2],'prestige-evidence','acceptance');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.xml':'application/xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const url=decodeURI((req.url||'/').split('?')[0]), rel=url.replace(/^\/+/,'');
 const logical=rel ? path.join(root,rel):path.join(root,'botanical-home.html');
 let dest=path.resolve(logical);
 if(fs.existsSync(dest)&&fs.statSync(dest).isDirectory())dest=path.join(dest,'index.html');
 if(!dest.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(dest,(err,bytes)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{'content-type':mime[path.extname(dest)]||'application/octet-stream'});res.end(bytes)})
});
function luminance(rgb){const c=(rgb.match(/\d+(?:\.\d+)?/g)||[]).slice(0,3).map(Number).map(v=>{v/=255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)});return c[0]*.2126+c[1]*.7152+c[2]*.0722}
function ratio(a,b){let x=luminance(a),y=luminance(b);return +((Math.max(x,y)+.05)/(Math.min(x,y)+.05)).toFixed(2)}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});let results=[];let failures=[];
 for(const [label,w,h,reduced] of [['phone-320',320,780,true],['phone-390',390,844,true],['tablet',768,1024,true],['desktop',1440,900,false]]){
  const page=await browser.newPage({viewport:{width:w,height:h},reducedMotion:reduced?'reduce':'no-preference',isMobile:w<=430,hasTouch:w<=430});
  let errors=[],badResponses=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(origin) && r.status()>=400)badResponses.push([r.status(),r.url()])});
  const started=Date.now();
  await page.goto(origin+'/',{waitUntil:'load',timeout:30000});
  const info=await page.evaluate(()=>{
   const by=s=>document.querySelector(s),css=s=>getComputedStyle(by(s));
   const cta=by('.hero-actions a[href="/menu"]');
   const media=by('.hero-media');
   return {title:document.title,h1:document.querySelectorAll('h1').length,
    h1Text:by('h1')?.innerText,firstVisitClarity:{toplineDisplay:css('.topline').display,alcoholFreeDisplay:css('.hero-foot span:nth-child(2)').display,locationFontPx:parseFloat(css('.hero-foot span:first-child').fontSize)},hrefs:[...document.querySelectorAll('.hero-actions a')].map(a=>a.getAttribute('href')),
    scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,
    order:{copy:css('.hero-left').order,photo:css('.hero-media').order},
    cta:{visible:!!(cta && cta.getBoundingClientRect().width && cta.getBoundingClientRect().height),height:cta?.getBoundingClientRect().height,
      foreground:css('.action.primary').color,background:css('.action.primary').backgroundColor},
    body:{foreground:css('.hero-left .body-lg').color,background:css('.hero-left').backgroundColor},
    gallery:{slides:document.querySelectorAll('[data-hero-slide]').length,active:[...document.querySelectorAll('[data-hero-slide]')].filter(i=>i.classList.contains('is-active')).length},
    discoverContrast:{background:css('#drinks').backgroundColor,heading:css('#drinks .display2').color,body:css('#drinks .body-lg').color,secondaryButton:css('#drinks .action.outline').color},
    reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
    robot:by('meta[name="robots"]')?.content,
    canonical:by('link[rel="canonical"]')?.href,
    paint:performance.getEntriesByType('paint').map(e=>({name:e.name,ms:Math.round(e.startTime)}))
   }
  });
  const assets=await page.evaluate(async()=>{
   const urls=[...new Set([...document.images].map(i=>i.getAttribute('src')).filter(Boolean))];
   return Promise.all(urls.map(async src=>{try{const r=await fetch(src);return {src,status:r.status}}catch(e){return {src,error:String(e.message)}}}))
  });
  // Keyboard navigation: tab into the primary action (never force focus).
  await page.evaluate(()=>document.activeElement?.blur());
  let focus=null;
  for(let n=0;n<18;n++){
   await page.keyboard.press('Tab');
   focus=await page.evaluate(()=>({tag:document.activeElement?.tagName,href:document.activeElement?.getAttribute('href'),outline:getComputedStyle(document.activeElement).outlineWidth}));
   if(focus.href==='/menu')break;
  }
  const focusPass=focus?.href==='/menu' && parseFloat(focus.outline)>=2;
  if(label==='phone-390'){
   await page.screenshot({path:path.join(out,'screenshots','botanical-keyboard-focus-phone.jpg'),type:'jpeg',quality:80,fullPage:false});
  }
  const before=await page.locator('[data-hero-slide].is-active').getAttribute('src');
  await page.locator('[data-hero-next]').click();
  const after=await page.locator('[data-hero-slide].is-active').getAttribute('src');
  const galleryPass=before!==after;
  const contrast={cta:ratio(info.cta.foreground,info.cta.background),body:ratio(info.body.foreground,info.body.background)};
  const conditions={
   'exactly one h1':info.h1===1,
   'CTA link is menu':info.hrefs[0]==='/menu',
   'original location-led headline':!info.h1Text.toLowerCase().replace(/\s+/g,' ').includes('stay for the people'),
   'focused mobile metadata':w>430 || (info.firstVisitClarity.toplineDisplay==='none' && info.firstVisitClarity.alcoholFreeDisplay==='none' && info.firstVisitClarity.locationFontPx>=12),
   'real crafted drink photo':(await page.locator('.prestige-drink-photo img').count())===1,
   'carousel edge controls':(await page.locator('.hero-controls').evaluate(e=>{const p=e.parentElement.getBoundingClientRect(),b=e.getBoundingClientRect();return b.bottom>=p.bottom-90 && b.bottom<=p.bottom && b.left>=p.left && b.right<=p.right})),
   'decorative sticker removed':(await page.locator('.hero-corner').evaluate(e=>getComputedStyle(e).display==='none')),
   'CTA visible 44px':info.cta.visible && info.cta.height>=44,
   'responsive no overflow':info.scrollWidth<=info.clientWidth,
   'small mobile copy before photo':w>430 || Number(info.order.copy)<Number(info.order.photo),
   'real carousel controls':info.gallery.slides===3 && info.gallery.active===1 && galleryPass,
   'all image resources load':assets.every(a=>a.status===200),
   'keyboard focus':focusPass,
   'readability contrast':contrast.cta>=4.5 && contrast.body>=4.5,
   'discover section accessible colors':ratio(info.discoverContrast.heading,info.discoverContrast.background)>=3 && ratio(info.discoverContrast.body,info.discoverContrast.background)>=4.5 && ratio(info.discoverContrast.secondaryButton,info.discoverContrast.background)>=4.5,
   'no page script errors':errors.length===0,
   'reduced motion preference':info.reducedMotion===reduced
  };
  // Click the real first action and assert local pre-rendered destination responds.
  await page.locator('.hero-actions a[href="/menu"]').click();
  await page.waitForLoadState('domcontentloaded');
  const destination={url:page.url(),heading:(await page.locator('h1').allTextContents()).map(x=>x.slice(0,90)),path:new URL(page.url()).pathname};
  conditions['menu navigation']=destination.path==='/menu' && (await page.locator('h1').count())>=1;
  if(label==='phone-390')await page.screenshot({path:path.join(out,'screenshots','botanical-menu-navigation-phone.jpg'),type:'jpeg',quality:80,fullPage:false});
  const rec={label,viewport:{width:w,height:h},at:new Date().toISOString(),environment:'Mac Playwright Chromium local built dist',info,contrast,assets,keyboard:focus,menuDestination:destination,errors,badResponses,elapsedMs:Date.now()-started,conditions};
  results.push(rec);for(const [name,pass]of Object.entries(conditions))if(!pass)failures.push(label+': '+name);
  await page.close();
 }
 await browser.close();await new Promise(r=>server.close(r));
 fs.writeFileSync(path.join(out,'browser-acceptance.json'),JSON.stringify({results,failures},null,2));
 console.log(JSON.stringify({failures,summaries:results.map(r=>({label:r.label,contrast:r.contrast,elapsedMs:r.elapsedMs,conditions:r.conditions,brokenAssets:r.assets.filter(a=>a.status!==200),pageErrors:r.errors}))},null,2))
 if(failures.length)process.exitCode=2;
})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1});
