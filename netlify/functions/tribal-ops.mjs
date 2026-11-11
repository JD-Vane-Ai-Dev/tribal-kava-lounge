import { getStore } from "@netlify/blobs";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";

const VALID_HOSTS = new Set(["thetribalkavalounge.com","www.thetribalkavalounge.com","localhost","127.0.0.1"]);
const OWNER_HASH = "1da0514b3883849dfb58cf2612d38a08990a0ec7d03a59cb1e409770288a02c4";
const TYPES = ["inquiry","vendor","post"];
const STATUSES = {
 inquiry:["new","contacted","quoted","pending","booked","closed"],
 vendor:["idea","invited","applied","approved","declined"],
 post:["draft","needs_review","approved","published","archived"]
};
const HEADERS={"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","referrer-policy":"no-referrer"};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:HEADERS});
const safe=(v,max=300)=>typeof v==="string"?v.slice(0,max).trim():"";
const validID=(v)=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(v);
function authorized(req){
 const bearer=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"");
 if(!bearer||bearer.length>128)return false;
 const actual=createHash("sha256").update(bearer).digest();
 const expected=Buffer.from(OWNER_HASH,"hex");
 return timingSafeEqual(actual,expected);
}
function sanitize(o,type){
 const out={};
 const fields=type==="inquiry"
  ?{name:160,contact:220,eventType:100,date:24,guests:8,extras:350,status:30,followUp:24,notes:1500,source:120,quoteAmount:30}
  :type==="vendor"
  ?{name:160,category:120,contact:220,status:30,followUp:24,notes:1500}
  :{platform:80,campaign:120,caption:1500,status:30,scheduledFor:32,approvedAt:32,publishedUrl:400,notes:1000};
 for(const [name,max] of Object.entries(fields))out[name]=safe(o[name],max);
 if(!STATUSES[type].includes(out.status))out.status=STATUSES[type][0];
 if(type==="post"&&out.publishedUrl&&!/^https:\/\/[a-z0-9.-]+\//i.test(out.publishedUrl))out.publishedUrl="";
 return out;
}
export default async function handler(req) {
 let u;
 try{u=new URL(req.url);}catch{return json({error:"Invalid URL"},400);}
 if(!VALID_HOSTS.has(u.hostname.toLowerCase()))return json({error:"Unavailable on preview hosts"},404);
 if(!authorized(req))return json({error:"Owner code required"},401);
 const origin=req.headers.get("origin");
 if(origin&&origin!==u.origin)return json({error:"Cross-origin action blocked"},403);
 const store=getStore("tribal-owner-workspace-v1");
 try{
  if(req.method==="GET"){
   const records=[];let cursor;let pageCount=0;
   do{
    const batch=await store.list({prefix:"v1/",cursor});
    for(const blob of batch.blobs||[]){
     if(records.length>=500)break;
     const record=await store.get(blob.key,{type:"json"});
     if(record&&TYPES.includes(record.type))records.push(record);
    }
    cursor=batch.cursor;pageCount++;
   }while(cursor&&pageCount<15&&records.length<500);
   return json({records,partial:Boolean(cursor),source:"Owner-maintained tracker; Netlify Forms are not automatically imported"});
  }
  if(req.method!=="POST")return json({error:"Method not allowed"},405);
  if(!(req.headers.get("content-type")||"").startsWith("application/json"))return json({error:"JSON required"},415);
  const raw=await req.text();
  if(raw.length>12000)return json({error:"Payload too large"},413);
  let o;
  try{o=JSON.parse(raw);}catch{return json({error:"Invalid JSON"},400);}
  if(!o||!TYPES.includes(o.type))return json({error:"Invalid record type"},400);
  if(o.action==="delete"){
   if(!validID(o.id))return json({error:"Invalid record ID"},400);
   await store.delete("v1/"+o.type+"/"+o.id);
   return json({ok:true});
  }
  if(o.action!=="save")return json({error:"Invalid operation"},400);
  const id=validID(o.id)?o.id:randomUUID();
  const key="v1/"+o.type+"/"+id;
  const previous=validID(o.id)?await store.get(key,{type:"json"}):null;
  if(validID(o.id)&&!previous)return json({error:"Record no longer exists"},404);
  const record={id,type:o.type,...sanitize(o,o.type),
   createdAt:previous?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};
  await store.setJSON(key,record);
  return json({ok:true,record});
 }catch(err){
  console.error("Owner workspace request failed",err?.name||"unknown");
  return json({error:"Workspace storage unavailable"},503);
 }
}

