const fs=require('fs'),crypto=require('crypto');
const K='QND8GYRV9M',IS='9fe22de0-d888-402a-ba6b-a6ef13e0d6e7',LOC='cb46dbe7-ca74-4f59-b88e-c7405fdc3f04';
const key=fs.readFileSync('D:/LifeNum/.keys/ios/AuthKey_QND8GYRV9M.p8','utf8');
const jwt=()=>{const n=Math.floor(Date.now()/1000),b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const d=`${b({alg:'ES256',kid:K,typ:'JWT'})}.${b({iss:IS,iat:n,exp:n+900,aud:'appstoreconnect-v1'})}`;return `${d}.${crypto.sign('sha256',Buffer.from(d),{key:crypto.createPrivateKey(key),dsaEncoding:'ieee-p1363'}).toString('base64url')}`;};
const api=async(p,o={})=>{const r=await fetch('https://api.appstoreconnect.apple.com'+p,{...o,headers:{Authorization:`Bearer ${jwt()}`,'Content-Type':'application/json'}});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t}return{status:r.status,body:j};};
(async()=>{
  const set=await api('/v1/appScreenshotSets',{method:'POST',body:JSON.stringify({data:{type:'appScreenshotSets',attributes:{screenshotDisplayType:'APP_IPAD_PRO_3GEN_129'},relationships:{appStoreVersionLocalization:{data:{type:'appStoreVersionLocalizations',id:LOC}}}}})});
  if(set.status>=300){console.log('setErr',JSON.stringify(set.body).slice(0,300));return;}
  const id=set.body.data.id, buf=fs.readFileSync('D:/LifeNum/.shots/ipad1.png'), md5=crypto.createHash('md5').update(buf).digest('hex');
  const sh=await api('/v1/appScreenshots',{method:'POST',body:JSON.stringify({data:{type:'appScreenshots',attributes:{fileSize:buf.length,fileName:'ipad1.png'},relationships:{appScreenshotSet:{data:{type:'appScreenshotSets',id}}}}})});
  if(sh.status>=300){console.log('shotErr',JSON.stringify(sh.body).slice(0,300));return;}
  const sid=sh.body.data.id;
  for(const op of sh.body.data.attributes.uploadOperations||[]){const h={};(op.requestHeaders||[]).forEach(x=>h[x.name]=x.value);await fetch(op.url,{method:op.method,headers:h,body:buf.subarray(op.offset,op.offset+op.length)});}
  const p=await api(`/v1/appScreenshots/${sid}`,{method:'PATCH',body:JSON.stringify({data:{type:'appScreenshots',id:sid,attributes:{uploaded:true,sourceFileChecksum:md5}}})});
  console.log('ipad',p.status);
  const ai=await api('/v1/apps/6825182736/appInfos'); const infoId=ai.body.data[0].id;
  const cats=await api('/v1/appCategories?limit=50&filter[platforms]=IOS');
  const cat=(cats.body.data||[]).find(c=>/Lifestyle/.test(c.attributes.name));
  console.log('catId',cat&&cat.id,cat&&cat.attributes.name);
  if(cat){const u=await api(`/v1/appInfos/${infoId}`,{method:'PATCH',body:JSON.stringify({data:{type:'appInfos',id:infoId,relationships:{primaryCategory:{data:{type:'appCategories',id:cat.id}}}}})});console.log('cat',u.status,u.status>=300?JSON.stringify(u.body).slice(0,300):'ok');}
})();
