
const { chromium }=require('playwright');
const fs=require('fs'),path=require('path');
(async()=>{
 const b=await chromium.launch({headless:true});
 const root=process.argv[2];const refs=[
 ['tribal-live','https://thetribalkavalounge.com/'],
 ['kava-culture','https://kavaculture.com/'],
 ['decades-kava','https://decadeskava.com/'],
 ['ritual-coffee','https://ritualcoffee.com/']
 ];let results=[];
 for(const [name,url] of refs){
  for (const [device,w,h] of [['desktop',1440,900],['phone',390,844]]){
   const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1,reducedMotion:'reduce',isMobile:device==='phone',hasTouch:device==='phone'});
   let rec={name,url,device,width:w,height:h,captured_at:new Date().toISOString(),method:'Playwright chromium'};
   try{
    const response=await p.goto(url,{waitUntil:'domcontentloaded',timeout:18000});
    await p.waitForTimeout(800);
    rec.status=response?.status();rec.finalUrl=p.url();rec.title=await p.title();
    rec.h1=(await p.locator('h1').allTextContents()).map(x=>x.trim().slice(0,150)).slice(0,4);
    rec.navigation=(await p.locator('header a,nav a').allTextContents()).map(x=>x.trim().slice(0,45)).filter(Boolean).slice(0,15);
    rec.scrollWidth=await p.evaluate(()=>document.documentElement.scrollWidth);
    const fn=path.join(root,'references',name+'-'+device+'.jpg');
    await p.screenshot({path:fn,type:'jpeg',quality:76,fullPage:true,animations:'disabled',timeout:20000});
    rec.screenshot='references/'+name+'-'+device+'.jpg';
   }catch(e){rec.error=String(e.message).slice(0,500)}
   results.push(rec);await p.close();
  }
 }
 await b.close();
 fs.writeFileSync(path.join(root,'references','observations.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results.map(({name,device,status,h1,scrollWidth,error})=>({name,device,status,h1,scrollWidth,error}))));
})().catch(e=>{console.error(e.stack);process.exit(1)})
