const fs = require('fs'); const crypto = require('crypto');
const KEY_ID='QND8GYRV9M', ISSUER='9fe22de0-d888-402a-ba6b-a6ef13e0d6e7';
const VER='a961d755-febf-4bff-bc5a-269ce45278e0';
const key = fs.readFileSync('D:/LifeNum/.keys/ios/AuthKey_QND8GYRV9M.p8','utf8');
function jwt(){const now=Math.floor(Date.now()/1000);const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const d=`${b({alg:'ES256',kid:KEY_ID,typ:'JWT'})}.${b({iss:ISSUER,iat:now,exp:now+900,aud:'appstoreconnect-v1'})}`;return `${d}.${crypto.sign('sha256',Buffer.from(d),{key:crypto.createPrivateKey(key),dsaEncoding:'ieee-p1363'}).toString('base64url')}`;}
async function api(p,o={}){const r=await fetch('https://api.appstoreconnect.apple.com'+p,{...o,headers:{Authorization:`Bearer ${jwt()}`,'Content-Type':'application/json',...(o.headers||{})}});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t}return{status:r.status,body:j};}
(async()=>{
  const v = await api(`/v1/appStoreVersions/${VER}`,{method:'PATCH',body:JSON.stringify({data:{type:'appStoreVersions',id:VER,attributes:{copyright:'2026 MARLLEE CONCEPT LIMITED'}}})});
  console.log('ver',v.status, v.status>=300?JSON.stringify(v.body).slice(0,300):'ok');
  const app = await api('/v1/apps/6825182736',{method:'PATCH',body:JSON.stringify({data:{type:'apps',id:'6825182736',attributes:{contentRightsDeclaration:'USES_THIRD_PARTY_CONTENT'}}})});
  console.log('app',app.status, app.status>=300?JSON.stringify(app.body).slice(0,400):'ok');
  const ai = await api(`/v1/apps/6825182736/appInfos`);
  const infoId = (ai.body.data||[])[0].id;
  const ar = await api(`/v1/appInfos/${infoId}/ageRatingDeclaration`);
  console.log('ageRatingId', ar.body.data && ar.body.data.id, JSON.stringify(ar.body.data && ar.body.data.attributes).slice(0,300));
})();
