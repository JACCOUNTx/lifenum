const fs = require('fs');
const crypto = require('crypto');
const KEY_ID = 'QND8GYRV9M';
const ISSUER = '9fe22de0-d888-402a-ba6b-a6ef13e0d6e7';
const LOC = 'cb46dbe7-ca74-4f59-b88e-c7405fdc3f04';
const DISPLAY = process.argv[2] || 'APP_IPHONE_67';
const FILES = ['s1.png','s2.png','s3.png'].map(n => `D:/LifeNum/.shots/${n}`);
const key = fs.readFileSync('D:/LifeNum/.keys/ios/AuthKey_QND8GYRV9M.p8', 'utf8');
function jwt() {
  const now = Math.floor(Date.now()/1000);
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const data = `${b64({alg:'ES256',kid:KEY_ID,typ:'JWT'})}.${b64({iss:ISSUER,iat:now,exp:now+900,aud:'appstoreconnect-v1'})}`;
  const sig = crypto.sign('sha256', Buffer.from(data), { key: crypto.createPrivateKey(key), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${data}.${sig}`;
}
async function api(path, opts = {}) {
  const res = await fetch('https://api.appstoreconnect.apple.com' + path, { ...opts,
    headers: { Authorization: `Bearer ${jwt()}`, 'Content-Type': 'application/json', ...(opts.headers||{}) } });
  const txt = await res.text();
  let js; try { js = JSON.parse(txt); } catch { js = txt; }
  return { status: res.status, body: js };
}
(async () => {
  const set = await api('/v1/appScreenshotSets', { method: 'POST', body: JSON.stringify({
    data: { type: 'appScreenshotSets', attributes: { screenshotDisplayType: DISPLAY },
      relationships: { appStoreVersionLocalization: { data: { type: 'appStoreVersionLocalizations', id: LOC } } } } }) });
  if (set.status >= 300) { console.log('setErr', set.status, JSON.stringify(set.body).slice(0,600)); return; }
  const setId = set.body.data.id;
  console.log('setId', setId, DISPLAY);
  for (const f of FILES) {
    const buf = fs.readFileSync(f);
    const name = f.split('/').pop();
    const md5 = crypto.createHash('md5').update(buf).digest('hex');
    const shot = await api('/v1/appScreenshots', { method: 'POST', body: JSON.stringify({
      data: { type: 'appScreenshots', attributes: { fileSize: buf.length, fileName: name },
        relationships: { appScreenshotSet: { data: { type: 'appScreenshotSets', id: setId } } } } }) });
    if (shot.status >= 300) { console.log('shotErr', name, shot.status, JSON.stringify(shot.body).slice(0,500)); continue; }
    const id = shot.body.data.id;
    for (const op of shot.body.data.attributes.uploadOperations || []) {
      const headers = {}; (op.requestHeaders||[]).forEach(h => headers[h.name] = h.value);
      const r = await fetch(op.url, { method: op.method, headers, body: buf.subarray(op.offset, op.offset + op.length) });
      if (!r.ok) console.log('uploadFail', name, r.status);
    }
    const patch = await api(`/v1/appScreenshots/${id}`, { method: 'PATCH', body: JSON.stringify({
      data: { type: 'appScreenshots', id, attributes: { uploaded: true, sourceFileChecksum: md5 } } }) });
    console.log('uploaded', name, patch.status, patch.status>=300 ? JSON.stringify(patch.body).slice(0,300) : 'ok');
  }
})();
