
const {chromium}=require('playwright');const fs=require('fs'),http=require('http'),path=require('path');
const root=path.resolve(process.argv[2]);const dir=path.join(root,'prestige-evidence');
const paths=process.argv.slice(3);
const mime={'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let url=decodeURI((req.url||'/').split('?')[0]),relative=url.replace(/^\/+/,'');
 let file=path.resolve(root,relative||'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return}
 fs.readFile(file,(err,bytes)=>{if(err){res.writeHead(404).end();return}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(bytes)})
});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});let records=[];
for(const relative of paths){const baseName=path.basename(relative,'.html');
 for(const [device,w,h,motion] of [['phone',390,844,'reduce'],['tablet',768,1024,'reduce'],['desktop',1440,900,'reduce']]){
  const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,isMobile:device==='phone',hasTouch:device==='phone',reducedMotion:motion});
  let errs=[];page.on('pageerror',e=>errs.push(String(e.message).slice(0,200)));
  let rec={relative,device,viewport:{width:w,height:h},at:new Date().toISOString(),browser:'Playwright Chromium',motion,url:base+'/'+relative};
  try{
   const response=await page.goto(base+'/'+relative,{waitUntil:'load',timeout:24000});
   await page.waitForTimeout(350);
   const data=await page.evaluate(()=>({h1:[...document.querySelectorAll('h1')].map(e=>e.innerText),scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,images:[...document.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),links:[...document.querySelectorAll('a')].filter(a=>a.innerText.trim()).length}));
   rec={...rec,status:response.status(),...data,errors:errs};
   const file=path.join(dir,'screenshots',baseName+'-'+device+'.jpg');
   fs.mkdirSync(path.dirname(file),{recursive:true});
   await page.screenshot({path:file,type:'jpeg',quality:78,fullPage:true,animations:'disabled',timeout:25000});
   rec.screenshot=path.relative(dir,file);
  }catch(e){rec.error=String(e.message).slice(0,350)}
  records.push(rec);await page.close();
 }
}
await browser.close();await new Promise(r=>server.close(r));
fs.writeFileSync(path.join(dir,'local-captures.json'),JSON.stringify(records,null,2));
console.log(JSON.stringify(records.map(({relative,device,status,scrollWidth,clientWidth,images,errors,error})=>({relative,device,status,scrollWidth,clientWidth,images:images?.length,broken:images?.filter(x=>!x.loaded),errors,error}))));
})().catch(e=>{console.error(e.stack);server.close();process.exit(1)})
