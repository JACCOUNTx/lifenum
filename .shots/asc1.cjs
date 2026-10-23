const fs = require('fs');
const crypto = require('crypto');
const KEY_ID = 'QND8GYRV9M';
const ISSUER = '9fe22de0-d888-402a-ba6b-a6ef13e0d6e7';
const APP_ID = '6825182736';
const key = fs.readFileSync('D:/LifeNum/.keys/ios/AuthKey_QND8GYRV9M.p8', 'utf8');

function jwt() {
  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const now = Math.floor(Date.now()/1000);
  const payload = { iss: ISSUER, iat: now, exp: now + 900, aud: 'appstoreconnect-v1' };
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const data = `${b64(header)}.${b64(payload)}`;
  const sig = crypto.sign('sha256', Buffer.from(data), { key: crypto.createPrivateKey(key), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${data}.${sig}`;
}
async function api(path, opts = {}) {
  const res = await fetch('https://api.appstoreconnect.apple.com' + path, {
    ...opts,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json', ...(opts.headers||{}) },
  });
  const txt = await res.text();
  let js; try { js = JSON.parse(txt); } catch { js = txt; }
  return { status: res.status, body: js };
}
(async () => {
  const v = await api(`/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=10`);
  const ver = (v.body.data||[]).find(x => x.attributes.versionString === '1.0');
  console.log('version', ver && ver.id, ver && ver.attributes.appStoreState);
  const l = await api(`/v1/appStoreVersions/${ver.id}/appStoreVersionLocalizations`);
  const loc = l.body.data[0];
  console.log('loc', loc.id, loc.attributes.locale);
  const sets = await api(`/v1/appStoreVersionLocalizations/${loc.id}/appScreenshotSets`);
  console.log('sets', JSON.stringify((sets.body.data||[]).map(s=>s.attributes)));
})();
