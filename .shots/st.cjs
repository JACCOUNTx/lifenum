const fs=require('fs'),crypto=require('crypto');
const K='QND8GYRV9M',IS='9fe22de0-d888-402a-ba6b-a6ef13e0d6e7';
const key=fs.readFileSync('D:/LifeNum/.keys/ios/AuthKey_QND8GYRV9M.p8','utf8');
const jwt=()=>{const n=Math.floor(Date.now()/1000),b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const d=`${b({alg:'ES256',kid:K,typ:'JWT'})}.${b({iss:IS,iat:n,exp:n+900,aud:'appstoreconnect-v1'})}`;return `${d}.${crypto.sign('sha256',Buffer.from(d),{key:crypto.createPrivateKey(key),dsaEncoding:'ieee-p1363'}).toString('base64url')}`;};
const api=async(p)=>{const r=await fetch('https://api.appstoreconnect.apple.com'+p,{headers:{Authorization:`Bearer ${jwt()}`}});return (await r.json());};
(async()=>{
  const v=await api('/v1/apps/6825182736/appStoreVersions?filter[platform]=IOS&limit=5');
  console.log('versions', (v.data||[]).map(x=>x.attributes.versionString+':'+x.attributes.appStoreState).join(', '));
  const s=await api('/v1/subscriptions/6825190714');
  const sId=s.data.id;
  const p=await api(`/v1/subscriptions/${sId}/prices?limit=5`);
  console.log('subPrices', (p.data||[]).map(x=>x.attributes).map(a=>a.startDate).slice(0,3));
  const g=await api(`/v1/subscriptions/${sId}/subscriptionLocalizations`);
  console.log('loc', (g.data||[]).map(x=>x.attributes.locale));
})();
