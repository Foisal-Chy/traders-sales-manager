/* MGI Fresh | Dealership Management System. Developed by Md. Foisal Hossen Chowdhury, Department of CSE, International Islamic University Chittagong (IIUC). */
'use strict';
/* secure.js - optional encryption of everything saved on the phone (AES-GCM, key made from your password with PBKDF2) */
const Crypt = {
  te: new TextEncoder(), td: new TextDecoder(),
  ok: () => !!(window.crypto && crypto.subtle),
  b64(u) { let s = ''; for (let i = 0; i < u.length; i += 8192) s += String.fromCharCode(...u.subarray(i, i + 8192)); return btoa(s); },
  ub64: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
  async key(pw, salt) {
    const m = await crypto.subtle.importKey('raw', Crypt.te.encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' }, m, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  },
  async seal(text, key, salt) {
    const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, Crypt.te.encode(text)));
    return JSON.stringify({ enc: 1, salt: Crypt.b64(salt), iv: Crypt.b64(iv), ct: Crypt.b64(ct) });
  },
  async open(blob, key) { const j = typeof blob === 'string' ? JSON.parse(blob) : blob; return Crypt.td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: Crypt.ub64(j.iv) }, key, Crypt.ub64(j.ct))); },
  async sealPw(text, pw) { const salt = crypto.getRandomValues(new Uint8Array(16)); return Crypt.seal(text, await Crypt.key(pw, salt), salt); },
  async openPw(blob, pw) { const j = typeof blob === 'string' ? JSON.parse(blob) : blob; return Crypt.open(j, await Crypt.key(pw, Crypt.ub64(j.salt))); }
};

Object.assign(Store, {
  enc: null, _q: Promise.resolve(),
  peek() { try { const r = JSON.parse(localStorage.getItem(KEY)); return r && r.enc ? r : null; } catch (e) { return null; } },
  async unlock(pw) {
    const b = Store.peek(); if (!b) return false;
    try { const salt = Crypt.ub64(b.salt), key = await Crypt.key(pw, salt), d = JSON.parse(await Crypt.open(b, key)); if (!Store.valid(d)) return false; Store.db = Store.merge(d); Store.enc = { key, salt, pw }; return true; }
    catch (e) { return false; }
  },
  /* Saves are queued so an older save can never overwrite a newer one */
  flush() {
    return Store._q = Store._q.then(async () => {
      if (!Store.enc || !Store.db) return;
      try { localStorage.setItem(KEY, await Crypt.seal(JSON.stringify(Store.db), Store.enc.key, Store.enc.salt)); } catch (e) { U.toast('Could not save: browser storage is full or blocked', 'err'); }
    });
  },
  async turnOn(pw) {
    const salt = crypto.getRandomValues(new Uint8Array(16)); Store.enc = { key: await Crypt.key(pw, salt), salt, pw }; Store.db.settings.pin = '';
    await Store.flush(); if (!Store.peek()) { Store.enc = null; throw new Error('Could not save the encrypted data'); }
    Object.keys(localStorage).filter(k => k.startsWith(KEY + '_') && !k.endsWith('_cloud')).forEach(k => localStorage.removeItem(k));
    if (Sales.dirty) Sales.mark();
  },
  async turnOff() {
    await Store._q; clearTimeout(Store._w); Store.enc = null;
    if (Store.db.draft) { try { localStorage.setItem(KEY + '_draft', JSON.stringify(Store.db.draft)); } catch (e) { } delete Store.db.draft; }
    localStorage.removeItem(KEY + '_prev'); Store.save();
  },
  async changePw(pw) { const salt = crypto.getRandomValues(new Uint8Array(16)); Store.enc = { key: await Crypt.key(pw, salt), salt, pw }; await Store.flush(); }
});
{ /* the safety copy is encrypted too while encryption is on */
  const kp = Store.keepPrev;
  Store.keepPrev = function () { if (!Store.enc) return kp(); Crypt.seal(JSON.stringify(Store.db), Store.enc.key, Store.enc.salt).then(b => { try { localStorage.setItem(KEY + '_prev', b); } catch (e) { } }); };
  const rp = Store.restorePrev;
  Store.restorePrev = async function () {
    if (!Store.enc) return rp(); let d;
    try { const raw = JSON.parse(localStorage.getItem(KEY + '_prev')); d = JSON.parse(raw.enc ? await Crypt.open(raw, Store.enc.key) : JSON.stringify(raw)); } catch (e) { return false; }
    if (!Store.valid(d)) return false; Store.db = Store.merge(d); Store.db.settings.pin = ''; Store.save(); return true;
  };
}

/* Password screen shown when the app opens and data is encrypted */
Pin.unlockEnc = () => new Promise(res => {
  let o = U.$('#lock'); if (!o) { o = document.createElement('div'); o.id = 'lock'; document.body.appendChild(o); }
  o.hidden = false;
  if (!Crypt.ok()) { o.innerHTML = '<div class="lockbox"><h2>Cannot open</h2><p class="muted">This browser cannot decrypt your data here. Open the app from its https link.</p></div>'; return; }
  o.innerHTML = `<form class="lockbox"><div class="logo">MGI</div><h2>Enter password</h2><p class="muted">Your data is encrypted on this phone.</p><input id="lp" type="password" autocomplete="off" aria-label="Password" style="width:100%;text-align:center;font-size:20px"><p id="le" style="color:var(--danger);min-height:1.3em;margin:6px 0"></p><button class="btn primary" style="width:100%;justify-content:center">Unlock</button><p class="muted" style="font-size:12px">Forgot it? <a href="#" id="lf">Erase this phone's data</a>, then restore your backup file.</p></form>`;
  const f = U.$('#lp', o); f.focus();
  U.$('#lf', o).onclick = e => { e.preventDefault(); if (confirm('This erases ALL data this app keeps on this phone. You can only get it back from a backup file. Continue?') && confirm('Really erase everything on this phone?')) { Object.keys(localStorage).filter(k => k.startsWith(KEY)).forEach(k => localStorage.removeItem(k)); location.reload(); } };
  U.$('.lockbox', o).onsubmit = async e => {
    e.preventDefault(); const b = U.$('button', o); b.disabled = true; U.$('#le', o).textContent = 'Checking...';
    const ok = await Store.unlock(f.value); b.disabled = false;
    if (ok) { o.hidden = true; res(); } else { U.$('#le', o).textContent = 'Wrong password'; f.value = ''; f.focus(); }
  };
});

const Sec = {
  async enable() {
    if (!Crypt.ok()) return U.toast('Encryption needs a secure (https) page.', 'err'); let pw;
    const ok = await U.modal('Encrypt my data', `<p>Your sales, products and settings will be stored encrypted on this phone and the password will be asked every time the app opens.</p><p><b>If you forget the password the data cannot be recovered</b>, except from a backup file. A backup file is downloaded first.</p><label for="e1">Password (6 or more characters)</label><input id="e1" type="password" autocomplete="new-password" style="width:100%"><label for="e2" style="margin-top:8px">Repeat password</label><input id="e2" type="password" autocomplete="new-password" style="width:100%"><label style="display:flex;gap:8px;align-items:center;margin-top:10px"><input type="checkbox" id="e3"> I understand, and I will keep my backup file safe</label><p id="ee" style="color:var(--danger)"></p>`,
      [{ label: 'Cancel', v: false }, { label: 'Encrypt', v: true, cls: 'primary' }], () => {
        const a = U.$('#e1').value, b = U.$('#e2').value, er = m => { U.$('#ee').textContent = m; return false; };
        if (a.length < 6) return er('Use at least 6 characters.'); if (a !== b) return er('The two passwords do not match.'); if (!U.$('#e3').checked) return er('Please tick the box.'); pw = a;
      });
    if (!ok) return;
    try { Store.exportJSON(); await Store.turnOn(pw); U.toast('Your data is now encrypted'); } catch (e) { U.toast(e.message, 'err'); }
    App.route();
  },
  async checkCurrent() {
    let cur; const ok = await U.modal('Current password', '<input id="c0" type="password" style="width:100%">', [{ label: 'Cancel', v: false }, { label: 'Next', v: true, cls: 'primary' }], () => { cur = U.$('#c0').value; });
    if (!ok) return false; if (cur !== Store.enc.pw) { U.toast('Wrong password', 'err'); return false; } return true;
  },
  async disable() {
    if (!(await Sec.checkCurrent())) return;
    if (!(await U.confirm('Turn off encryption?', 'Your data will be stored without a password on this phone again.', 'Turn off'))) return;
    await Store.turnOff(); U.toast('Encryption is off'); App.route();
  },
  async change() {
    if (!(await Sec.checkCurrent())) return; let np;
    const ok = await U.modal('New password', '<label for="n1">New password (6 or more characters)</label><input id="n1" type="password" autocomplete="new-password" style="width:100%"><label for="n2" style="margin-top:8px">Repeat</label><input id="n2" type="password" autocomplete="new-password" style="width:100%"><p id="ne" style="color:var(--danger)"></p>', [{ label: 'Cancel', v: false }, { label: 'Change', v: true, cls: 'primary' }], () => {
      const a = U.$('#n1').value; if (a.length < 6) { U.$('#ne').textContent = 'Use at least 6 characters.'; return false; } if (a !== U.$('#n2').value) { U.$('#ne').textContent = 'The two passwords do not match.'; return false; } np = a;
    });
    if (ok) { await Store.changePw(np); U.toast('Password changed'); }
  }
};
