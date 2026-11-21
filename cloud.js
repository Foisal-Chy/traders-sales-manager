'use strict';
/* cloud.js - free cloud backup and restore through a private GitHub Gist (manual upload/download, with a warning if another phone saved newer data) */
const Cloud = {
  K: KEY + '_cloud', FILE: 'mgi-fresh-backup.json',
  get() { try { return JSON.parse(localStorage.getItem(Cloud.K)) || {}; } catch (e) { return {}; } },
  set(o) { localStorage.setItem(Cloud.K, JSON.stringify({ ...Cloud.get(), ...o })); },
  async api(path, opt = {}) {
    let r; try { r = await fetch('https://api.github.com' + path, { ...opt, headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + Cloud.get().token, 'Content-Type': 'application/json' } }); }
    catch (e) { throw new Error('Could not reach GitHub. Check your internet connection.'); }
    if (!r.ok) throw new Error(r.status === 401 ? 'GitHub did not accept the token (401). Check the token and that it has the "gist" permission.' : r.status === 403 ? 'GitHub refused the request (403). Try again later.' : 'GitHub error ' + r.status);
    return r.json();
  },
  async find() {
    const c = Cloud.get(); if (c.gid) return c.gid;
    const g = (await Cloud.api('/gists?per_page=100')).find(x => x.description === 'MGI Fresh backup' && x.files && x.files[Cloud.FILE]);
    if (g) { Cloud.set({ gid: g.id }); return g.id; } return null;
  },
  async read(gid) {
    const f = (await Cloud.api('/gists/' + gid)).files[Cloud.FILE]; if (!f) throw new Error('The backup file was not found in the cloud.');
    return JSON.parse(f.truncated ? await (await fetch(f.raw_url)).text() : f.content);
  },
  async upload(force) {
    const c = Cloud.get(); if (!c.token) throw new Error('Add your GitHub token first.');
    const gid = await Cloud.find(); let rev = 0;
    if (gid) { const r = await Cloud.read(gid); rev = r.rev || 0; if (!force && rev !== (c.rev || 0)) return { conflict: r }; }
    const plain = JSON.parse(JSON.stringify(Store.db)); delete plain.draft;
    const body = Store.enc ? await Crypt.sealPw(JSON.stringify(plain), Store.enc.pw) : plain;
    const files = { [Cloud.FILE]: { content: JSON.stringify({ app: 'mgi-fresh', rev: rev + 1, savedAt: new Date().toISOString(), enc: !!Store.enc, body }) } };
    const g = gid ? await Cloud.api('/gists/' + gid, { method: 'PATCH', body: JSON.stringify({ files }) }) : await Cloud.api('/gists', { method: 'POST', body: JSON.stringify({ description: 'MGI Fresh backup', public: false, files }) });
    Cloud.set({ gid: g.id, rev: rev + 1, at: new Date().toISOString() }); return { ok: true, rev: rev + 1 };
  },
  async download() {
    if (!Cloud.get().token) throw new Error('Add your GitHub token first.');
    const gid = await Cloud.find(); if (!gid) throw new Error('No cloud backup found yet. Upload one from the other phone first.');
    const r = await Cloud.read(gid); let data = r.body;
    if (r.enc) { if (!Store.enc) throw new Error('This cloud backup is encrypted. Turn on encryption here with the same password first.'); try { data = JSON.parse(await Crypt.openPw(data, Store.enc.pw)); } catch (e) { throw new Error('Could not open the cloud backup. It was encrypted with a different password.'); } }
    return { rev: r.rev || 0, savedAt: r.savedAt, data };
  },
  async push(force) {
    try {
      U.toast('Uploading...'); const r = await Cloud.upload(force);
      if (r.conflict) {
        const a = await U.ask('Cloud has newer data', `Another phone saved newer data to the cloud on ${new Date(r.conflict.savedAt).toLocaleString()}. What do you want to do?`, [{ label: 'Cancel', v: false }, { label: 'Download it first', v: 'dl' }, { label: 'Overwrite cloud with this phone', v: 'ow', cls: 'danger' }]);
        return a === 'dl' ? Cloud.pull() : a === 'ow' ? Cloud.push(true) : undefined;
      }
      U.toast('Uploaded to the cloud (version ' + r.rev + ')'); Cloud.refresh();
    } catch (e) { U.toast(e.message, 'err'); }
  },
  async pull() {
    try {
      const r = await Cloud.download();
      if (!(await U.confirm('Replace the data on this phone?', `Cloud backup saved on ${new Date(r.savedAt).toLocaleString()}. The data on this phone will be replaced. You can undo this from Settings.`, 'Replace'))) return;
      if (!Store.valid(r.data)) throw new Error('The cloud backup is not valid.');
      Store.keepPrev(); const d = Store.merge(r.data); d.settings.pin = Store.db.settings.pin; Store.db = d; Store.save(); Cloud.set({ rev: r.rev, at: new Date().toISOString() });
      Sales.cur = null; Sales.clean(); App.theme(Store.db.settings.theme); U.toast('Data restored from the cloud'); App.route();
    } catch (e) { U.toast(e.message, 'err'); }
  },
  /* Once a day, when the app opens online and auto-upload is ticked */
  async auto() {
    const c = Cloud.get(); if (!c.token || !c.auto || !navigator.onLine || (c.at && Date.now() - new Date(c.at) < 20 * 36e5)) return;
    try { const r = await Cloud.upload(false); if (r.conflict) U.toast('Cloud has newer data from another phone. Open Settings, Cloud backup.', 'err'); else U.toast('Cloud backup updated'); } catch (e) { /* stay quiet */ }
  },
  card() {
    const c = Cloud.get();
    return `<div class="card"><h3>Cloud backup (free, with GitHub)</h3><p class="muted">Keeps a copy of your data in a private GitHub Gist so you can recover a lost phone or move data to another phone. It is an upload/download backup, not live sync: if two phones change data at the same time, you get a warning and choose. ${Store.enc ? 'Your data is uploaded encrypted with your password.' : 'Your data is uploaded as readable text, so turn on encryption first if you want it scrambled.'}</p>
      <details class="meta"><summary>How to get the token (one time)</summary><p class="muted">On github.com: Settings, Developer settings, Personal access tokens, Tokens (classic), Generate new token. Tick only <b>gist</b>. Copy the token and paste it below. Anyone who gets this token can read and change your gists, and it is stored on this phone, so do not share it.</p></details>
      <div class="f"><label for="cl_t">GitHub token</label><input id="cl_t" type="password" autocomplete="off" placeholder="${c.token ? 'Token saved (hidden). Paste a new one to replace.' : 'Paste token here'}" style="width:100%"></div>
      <div class="row"><button class="btn" id="cl_s">Save token</button><button class="btn primary" id="cl_u"><i data-lucide="cloud-upload"></i>Upload now</button><button class="btn" id="cl_d"><i data-lucide="cloud-download"></i>Download from cloud</button>${c.token ? '<button class="btn danger" id="cl_r">Remove token</button>' : ''}</div>
      <label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="cl_a" ${c.auto ? 'checked' : ''}> Upload automatically once a day when I open the app</label>
      <p class="muted" id="cl_i">${c.at ? 'Last upload or download: ' + new Date(c.at).toLocaleString() + ' (version ' + (c.rev || 0) + ')' : 'Nothing uploaded yet.'}</p></div>`;
  },
  refresh() { const i = U.$('#cl_i'); if (i) { const c = Cloud.get(); i.textContent = c.at ? 'Last upload or download: ' + new Date(c.at).toLocaleString() + ' (version ' + (c.rev || 0) + ')' : 'Nothing uploaded yet.'; } },
  bind(el) {
    const $ = s => U.$(s, el);
    $('#cl_s').onclick = () => { const t = $('#cl_t').value.trim(); if (!t) return U.toast('Paste the token first', 'err'); Cloud.set({ token: t, gid: '', rev: 0 }); U.toast('Token saved'); App.route(); };
    $('#cl_u').onclick = () => Cloud.push(false); $('#cl_d').onclick = () => Cloud.pull();
    $('#cl_a').onchange = e => Cloud.set({ auto: e.target.checked });
    const r = $('#cl_r'); if (r) r.onclick = async () => { if (await U.confirm('Remove the token?', 'Cloud backup stops until you add a token again. Data already in the cloud stays there.', 'Remove')) { localStorage.removeItem(Cloud.K); App.route(); } };
  }
};
