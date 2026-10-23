const fs = require('fs'); const crypto = require('crypto');
const KEY_ID='QND8GYRV9M', ISSUER='9fe22de0-d888-402a-ba6b-a6ef13e0d6e7';
const AR='41e80dc6-3aed-4263-a268-79a655a2604c';
const key = fs.readFileSync('D:/LifeNum/.keys/ios/AuthKey_QND8GYRV9M.p8','utf8');
function jwt(){const now=Math.floor(Date.now()/1000);const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const d=`${b({alg:'ES256',kid:KEY_ID,typ:'JWT'})}.${b({iss:ISSUER,iat:now,exp:now+900,aud:'appstoreconnect-v1'})}`;return `${d}.${crypto.sign('sha256',Buffer.from(d),{key:crypto.createPrivateKey(key),dsaEncoding:'ieee-p1363'}).toString('base64url')}`;}
async function api(p,o={}){const r=await fetch('https://api.appstoreconnect.apple.com'+p,{...o,headers:{Authorization:`Bearer ${jwt()}`,'Content-Type':'application/json',...(o.headers||{})}});const t=await r.text();let j;try{j=JSON.parse(t)}catch{j=t}return{status:r.status,body:j};}
(async()=>{
  const attrs = {
    alcoholTobaccoOrDrugUseOrReferences:'NONE', contests:'NONE', gambling:false, gamblingSimulated:'NONE',
    gunsOrOtherWeapons:'NONE', healthOrWellnessTopics:'NONE', lootBox:'NONE', medicalOrTreatmentInformation:'NONE',
    messagingAndChat:false, parentalControls:'NONE', profanityOrCrudeHumor:'NONE', horrorOrFearThemes:'NONE',
    matureOrSuggestiveThemes:'NONE', sexualContentGraphicAndNudity:'NONE', sexualContentOrNudity:'NONE',
    unrestrictedWebAccess:false, advertising:false, ageAssurance:false, userGeneratedContent:false,
    violenceCartoonOrFantasy:'NONE', violenceRealistic:'NONE', violenceRealisticProlongedGraphicOrSadistic:'NONE',
    socialMedia:false
  };
  const r = await api(`/v1/ageRatingDeclarations/${AR}`,{method:'PATCH',body:JSON.stringify({data:{type:'ageRatingDeclarations',id:AR,attributes:attrs}})});
  console.log('ageRating', r.status, r.status>=300?JSON.stringify(r.body).slice(0,600):'ok');
})();
