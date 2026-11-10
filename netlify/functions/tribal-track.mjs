import { getStore } from "@netlify/blobs";
import { randomUUID,createHash,timingSafeEqual } from "node:crypto";
// No cookies, IP addresses, full referrers, user agents, email, or visitor IDs.
const hosts=new Set(["thetribalkavalounge.com","www.thetribalkavalounge.com"]);
const valid=new Set(["page_view","menu_view","phone_call","directions","order_online","event_interest","events_view","venue_rental_inquiry","event_inquiry","event_signup_form_open","vendor_market_interest","google_reviews","google_review_request","instagram","calendar_download","generate_lead","begin_checkout","event_quote_form_started","event_quote_thankyou_view","qa_ping"]);
const channels=new Set(["organic_search","ai_referral","referral","campaign","direct_or_unknown","qa"]);
const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
function json(body,status=200){return new Response(JSON.stringify(body),{status,headers});}
function eq(a,b){if(typeof a!=="string"||typeof b!=="string")return false;return timingSafeEqual(createHash("sha256").update(a).digest(),createHash("sha256").update(b).digest());}
function path(s){return typeof s==="string"&&s.length<=180&&/^\/[a-zA-Z0-9/_-]*$/.test(s)?s:"/";}
export default async function handler(req){
 const host=new URL(req.url).hostname.toLowerCase();
 if(!hosts.has(host))return json({error:"Tracking disabled on preview deployments"},404);
 if(req.method==="POST"){
  const origin=req.headers.get("origin");
  if(origin&&origin!==new URL(req.url).origin)return json({error:"Wrong origin"},403);
  if(!(req.headers.get("content-type")||"").startsWith("application/json"))return json({error:"JSON required"},415);
  if(Number(req.headers.get("content-length")||0)>1024)return json({error:"Too large"},413);
  let o;
  try{const raw=await req.text();if(raw.length>1024)return json({error:"Too large"},413);o=JSON.parse(raw);}catch{return json({error:"Invalid JSON"},400);}
  if(!o||!valid.has(o.event))return json({error:"Unknown event"},400);
  const now=new Date();
  const event={at:now.toISOString(),event:o.event,path:path(o.path),channel:channels.has(o.channel)?o.channel:"direct_or_unknown"};
  try{
   await getStore("tribal-anonymous-events-v1").setJSON("events/"+now.toISOString().slice(0,10)+"/"+Date.now()+"-"+randomUUID(),event);
   return new Response(null,{status:204,headers:{"Cache-Control":"no-store"}});
  }catch(e){console.error("Tribal event storage unavailable",e?.name||"unknown");return json({error:"Not recorded"},503);}
 }
 if(req.method==="GET"){
  // SHA-256 fingerprint of a 28-character randomly generated owner code.
  // No plaintext owner code is deployed or committed.
  const ownerCodeHash="1da0514b3883849dfb58cf2612d38a08990a0ec7d03a59cb1e409770288a02c4";
  const got=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
  const gotHash=createHash("sha256").update(got).digest("hex");
  if(!eq(ownerCodeHash,gotHash))return json({error:"Authentication required"},401);
  try{
   const store=getStore("tribal-anonymous-events-v1");
   const days=Array.from({length:14},(_,i)=>new Date(Date.now()-(13-i)*86400000).toISOString().slice(0,10));
   const items=[];let cursor;let pages=0;
   do{
    const r=await store.list({prefix:"events/",cursor});
    items.push(...(r.blobs||[]).filter(v=>v.key.split("/")[1]>=days[0]));
    cursor=r.cursor;pages++;
   }while(cursor&&pages<35&&items.length<3500);
   const records=await Promise.all(items.slice(0,3500).map(v=>store.get(v.key,{type:"json"}).catch(()=>null)));
   const byEvent={};const byChannel={};const views=Object.fromEntries(days.map(d=>[d,0]));let total=0;
   for(const r of records){
    const day=r?.at?.slice(0,10);if(!days.includes(day)||r.event==="qa_ping")continue;
    total++;byEvent[r.event]=(byEvent[r.event]||0)+1;byChannel[r.channel]=(byChannel[r.channel]||0)+1;
    if(r.event==="page_view")views[day]++;
   }
   return json({period_days:14,counts_are:"anonymous events, not unique people or confirmed bookings",total_events:total,page_views:byEvent.page_view||0,menu_clicks:byEvent.menu_view||0,directions_clicks:byEvent.directions||0,phone_clicks:byEvent.phone_call||0,order_clicks:byEvent.order_online||0,venue_quote_clicks:byEvent.venue_rental_inquiry||0,quote_form_starts:byEvent.event_quote_form_started||0,quote_thankyou_views:byEvent.event_quote_thankyou_view||0,events:byEvent,sources:byChannel,daily_views:Object.entries(views).map(([day,views])=>({day,views})),incomplete:Boolean(cursor||items.length>3500),checked_at:new Date().toISOString()});
  }catch(e){console.error("Tribal analytics report unavailable",e?.name||"unknown");return json({error:"Stats unavailable"},503);}
 }
 return json({error:"Method not allowed"},405);
}
