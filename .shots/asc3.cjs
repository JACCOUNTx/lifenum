const fs = require('fs');
const crypto = require('crypto');
const KEY_ID='QND8GYRV9M', ISSUER='9fe22de0-d888-402a-ba6b-a6ef13e0d6e7';
const VER='a961d755-febf-4bff-bc5a-269ce45278e0', LOC='cb46dbe7-ca74-4f59-b88e-c7405fdc3f04';
const key = fs.readFileSync('D:/LifeNum/.keys/ios/AuthKey_QND8GYRV9M.p8','utf8');
function jwt(){const now=Math.floor(Date.now()/1000);const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const d=`${b({alg:'ES256',kid:KEY_ID,typ:'JWT'})}.${b({iss:ISSUER,iat:now,exp:now+900,aud:'appstoreconnect-v1'})}`;return `${d}.${crypto.sign('sha256',Buffer.from(d),{key:crypto.createPrivateKey(key),dsaEncoding:'ieee-p1363'}).toString('base64url')}`;}
async function api(p,o={}){const r=await fetch('https://api.appstoreconnect.apple.com'+p,{...o,headers:{Authorization:`Bearer ${jwt()}`,'Content-Type':'application/json',...(o.headers||{})}});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t}return{status:r.status,body:j};}
(async()=>{
  const desc = '命數五行穿衣法：以生命數字、干支與五行理論，每日推薦最適合你的穿搭顏色。\n\n輸入出生日期即可獲得每日五行能量分布、主色／輔助色／點綴色建議，以及每週運程與穿搭日曆。\n\n會員可解鎖完整運程、每日穿搭靈感、分享、週曆、記錄與完整個人分析（每月 HK$88，自動續訂，可隨時取消）。\n\n內容基於傳統五行文化整理，僅供穿搭靈感與娛樂參考。';
  const l = await api(`/v1/appStoreVersionLocalizations/${LOC}`,{method:'PATCH',body:JSON.stringify({data:{type:'appStoreVersionLocalizations',id:LOC,attributes:{description:desc,keywords:'五行,穿衣,生命數字,運程,干支,配色,穿搭,運勢',supportUrl:'https://lifenum.pages.dev/privacy'}}})});
  console.log('loc',l.status, l.status>=300?JSON.stringify(l.body).slice(0,400):'ok');
  const v = await api(`/v1/appStoreVersions/${VER}`,{method:'PATCH',body:JSON.stringify({data:{type:'appStoreVersions',id:VER,attributes:{copyright:'2026 MARLLEE CONCEPT LIMITED',contentRightsDeclaration:'USES_THIRD_PARTY_CONTENT'}}})});
  console.log('ver',v.status, v.status>=300?JSON.stringify(v.body).slice(0,500):'ok');
})();
