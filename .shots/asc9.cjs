const fs=require('fs'),crypto=require('crypto');
const K='QND8GYRV9M',IS='9fe22de0-d888-402a-ba6b-a6ef13e0d6e7';
const key=fs.readFileSync('D:/LifeNum/.keys/ios/AuthKey_QND8GYRV9M.p8','utf8');
const jwt=()=>{const n=Math.floor(Date.now()/1000),b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const d=`${b({alg:'ES256',kid:K,typ:'JWT'})}.${b({iss:IS,iat:n,exp:n+900,aud:'appstoreconnect-v1'})}`;return `${d}.${crypto.sign('sha256',Buffer.from(d),{key:crypto.createPrivateKey(key),dsaEncoding:'ieee-p1363'}).toString('base64url')}`;};
const api=async(p,o={})=>{const r=await fetch('https://api.appstoreconnect.apple.com'+p,{...o,headers:{Authorization:`Bearer ${jwt()}`,'Content-Type':'application/json'}});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t}return{status:r.status,body:j};};
(async()=>{
  const cats=await api('/v1/appCategories?limit=200');
  console.log(cats.status, JSON.stringify((cats.body.data||[]).slice(0,5).map(c=>({id:c.id,attrs:c.attributes}))));
})();

