'use strict';
/* app.js - router, theme, settings and data management */
const App = {
  pages: { dashboard: ['Dashboard', Dash.render], sales: ['Daily Sales Summary', Sales.render], history: ['Sales History', Sales.history], products: ['Products', Prod.render], reports: ['Financial Overview', Rep.render], dues: ['Dues (Baki)', Biz.dues], srm: ['SR & Market Report', Biz.srm], stock: ['Stock, Returns & Damage', Biz.stock], settings: ['Settings', null] },
  route() {
    const k = App.pages[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard', [title, fn] = App.pages[k], el = U.$('#view');
    document.title = title + ' | MGI Fresh'; U.$('#title').textContent = title;
    document.querySelectorAll('#nav a, #bnav a').forEach(a => a.classList.toggle('on', a.hash === '#' + k));
    U.$('#today').textContent = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); el.classList.remove('pg'); void el.offsetWidth; el.classList.add('pg');
    U.$('#lockBtn').hidden = !(Store.db.settings.pin || Store.enc);
    U.$('#side').classList.remove('open'); (fn || App.settings)(el); U.icons(); window.scrollTo(0, 0);
  },
  theme(t) { document.documentElement.dataset.theme = t; U.$('#brandName').textContent = Store.db.settings.dealer; document.querySelector('meta[name=theme-color]').content = t === 'dark' ? '#151d18' : '#ffffff'; U.$('#themeBtn').innerHTML = `<i data-lucide="${t === 'dark' ? 'sun' : 'moon'}"></i>`; U.icons(); },
  settings(el) {
    const S = Store.db.settings, f = (k, l, t = 'text') => `<div><label for="s_${k}">${l}</label><input id="s_${k}" type="${t}" value="${U.esc(S[k])}" style="width:100%"></div>`;
    el.innerHTML = `<div class="card"><h3>Business details and print preferences</h3><div class="fg">${f('dealer', 'Dealership name')}${f('phone', 'Phone')}${f('email', 'Email', 'email')}${f('address', 'Address')}
      <div><label for="s_cur">Currency</label><input id="s_cur" value="BDT (৳)" readonly style="width:100%"></div>
      <div><label for="s_theme">Default theme</label><select id="s_theme" style="width:100%"><option value="light" ${S.theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${S.theme === 'dark' ? 'selected' : ''}>Dark</option></select></div>
      ${f('titleBn', 'Print title (Bengali)')}${f('distBn', 'Distributor line (Bengali)')}${f('addrBn', 'Address line (Bengali)')}${f('phoneBn', 'Phone line 1 (Bengali)')}${f('phone2Bn', 'Phone line 2 (Bengali)')}
      <div class="full"><label><input type="checkbox" id="s_bn" ${S.bnDigits ? 'checked' : ''}> Print numbers in Bengali digits (০১২৩)</label></div>
      <div class="full"><label><input type="checkbox" id="s_zero" ${S.showZero ? 'checked' : ''}> Preselect "All products" when printing (untick to preselect "Only sold products")</label></div></div>
      <div class="dlgact"><button class="btn primary" id="s_save">Save settings</button></div></div>
      <div class="card"><h3>Backup and restore</h3><div class="row"><button class="btn" id="b_exp"><i data-lucide="download"></i>Export all data (JSON)</button><button class="btn" id="b_imp"><i data-lucide="upload"></i>Restore from backup</button><input type="file" id="b_file" accept=".json,application/json" hidden></div>
      <p class="muted">Data lives in this browser only. Export a backup regularly, and before clearing browser data.</p></div>
      ${Cloud.card()}
      ${Store.enc ? `<div class="card"><h3>Security: your data is encrypted</h3><p class="muted">Everything this app keeps on this phone is encrypted with your password. The app locks after 5 minutes of no use. Backup files you download are not encrypted, so keep them safe.</p><div class="row"><button class="btn" id="e_lock"><i data-lucide="lock"></i>Lock now</button><button class="btn" id="e_chg">Change password</button><button class="btn danger" id="e_off">Turn off encryption</button></div></div>` : `<div class="card"><h3>Security</h3><p class="muted">A PIN only hides the screen from casual viewers. <b>Encryption</b> also scrambles the saved data on this phone and needs your password to open it, so it is the stronger choice. ${S.pin ? 'A PIN is set (locks after 5 minutes).' : ''}</p><div class="row"><button class="btn primary" id="e_on"><i data-lucide="shield-check"></i>Encrypt my data</button><button class="btn" id="u_pin"><i data-lucide="lock"></i>${S.pin ? 'Change or remove PIN' : 'Set a PIN only'}</button></div></div>`}
      <div class="card"><h3>App version</h3><p class="muted">Running version <b>${APP_V}</b>. If you uploaded new files but still see the old app, press this button. Your sales and products are not deleted.</p><button class="btn" id="u_app"><i data-lucide="refresh-cw"></i>Update app (clear cached files)</button></div>
      <div class="card"><h3>Danger zone</h3>${localStorage.getItem(KEY + '_prev') ? '<div class="note">A safety copy from before your last restore, reset or delete-all is available. <button class="btn sm" id="u_prev">Undo it (bring that data back)</button></div>' : ''}<div class="row"><button class="btn" id="d_sheet">Load product list from our printed sheet</button><button class="btn danger" id="d_prod">Delete all products</button><button class="btn danger" id="d_all">Reset entire application</button></div></div>`;
    const $ = s => U.$(s, el);
    $('#s_save').onclick = () => {
      ['dealer', 'phone', 'email', 'address', 'titleBn', 'distBn', 'addrBn', 'phoneBn', 'phone2Bn'].forEach(k => S[k] = $('#s_' + k).value.trim()); S.theme = $('#s_theme').value; S.showZero = $('#s_zero').checked; S.bnDigits = $('#s_bn').checked;
      if (!S.dealer) S.dealer = 'Foisal Chowdhury Traders'; Store.save(); App.theme(S.theme); U.toast('Settings saved');
    };
    $('#b_exp').onclick = () => { Store.exportJSON(); U.toast('Backup downloaded'); };
    $('#b_imp').onclick = () => $('#b_file').click();
    $('#b_file').onchange = async e => {
      const f = e.target.files[0]; if (!f) return; const r = Store.parseImport(await f.text());
      if (!r.ok) return U.toast(r.error, 'err');
      if (await U.ask('Restore backup?', `This replaces all current data with <b>${r.data.products.length}</b> products and <b>${r.data.sales.length}</b> sales sheets. A safety copy of current data is kept in the browser.`, [{ label: 'Cancel', v: false }, { label: 'Replace data', v: true, cls: 'danger' }])) {
        r.data.settings.pin = Store.db.settings.pin; Store.keepPrev();
        Store.db = r.data; Store.save(); Sales.cur = null; Sales.clean(); App.theme(Store.db.settings.theme); U.toast('Backup restored'); App.settings(el);
      }
    };
    $('#d_sheet').onclick = async () => { if (await U.confirm('Load the sheet product list?', `Replaces the product list with the ${Prod.build().length} products from your printed sheet. Same-name products keep their prices; new ones start at 0. Saved sales are not changed.`, 'Replace products')) { Store.keepPrev(); Prod.useSheetList(); U.toast('Product list loaded'); App.settings(el); } };
    const up = $('#u_prev'); if (up) up.onclick = async () => { if (await U.confirm('Bring back the previous data?', 'Your current data will be replaced by the safety copy.', 'Bring it back') && await Store.restorePrev()) { Sales.cur = null; Sales.clean(); U.toast('Previous data restored'); App.settings(el); } };
    Cloud.bind(el);
    const on = (id, fn) => { const x = $(id); if (x) x.onclick = fn; };
    on('#u_pin', () => Pin.change()); on('#e_on', () => Sec.enable()); on('#e_off', () => Sec.disable()); on('#e_chg', () => Sec.change()); on('#e_lock', () => Pin.lock());
    $('#u_app').onclick = async () => { try { const rs = await navigator.serviceWorker.getRegistrations(); await Promise.all(rs.map(r => r.unregister())); await Promise.all((await caches.keys()).map(k => caches.delete(k))); } catch (e) { } location.reload(true); };
    $('#d_prod').onclick = async () => { if (await U.confirm('Delete all products?', 'All products will be removed (saved sales are not affected). Export products to CSV first if needed.', 'Delete all')) { Store.keepPrev(); Store.db.products = []; Store.save(); Sales.cur = null; U.toast('All products deleted'); App.settings(el); } };
    $('#d_all').onclick = async () => { if (await U.confirm('Reset the entire application?', 'This permanently deletes all products, sales and settings. Export a backup first.', 'Reset everything')) { Store.keepPrev(); Store.db = Store.defaults(); Store.db.settings.seeded = true; Store.save(); Sales.cur = null; Sales.clean(); App.theme('light'); U.toast('Application reset'); App.settings(el); } };
  },
  async init() {
    if (Store.peek()) await Pin.unlockEnc(); else Store.load(); Prod.seed(); Prod.migrateUnits(); Prod.migrateNames(); Prod.migrateLayout(); Prod.migratePrices(); Prod.migrateSold(); Prod.migrateLiquids(); Prod.migratePrices2(); const merged = Prod.dedupe(); if (merged) setTimeout(() => U.toast('Merged ' + merged + ' duplicate product(s) with the same name'), 900); Store.snap(); App.theme(Store.db.settings.theme);
    U.$('#themeBtn').onclick = () => { const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; Store.db.settings.theme = t; Store.save(); App.theme(t); App.route(); };
    U.$('#menu').onclick = () => U.$('#side').classList.toggle('open');
    window.addEventListener('hashchange', App.route);
    window.addEventListener('storage', e => { if (e.key !== KEY) return; if (Sales.dirty) U.toast('Data was changed in another window. Save carefully.', 'err'); else { U.toast('Data changed in another window. Reloading...'); setTimeout(() => location.reload(), 1200); } });
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) { const had = !!navigator.serviceWorker.controller; navigator.serviceWorker.register('sw.js').then(r => r.update()).catch(() => { }); navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !Sales.dirty) location.reload(); }); }
    window.addEventListener('beforeunload', e => { if (Sales.dirty) { e.preventDefault(); e.returnValue = ''; } });
    if (Sales.loadDraft()) setTimeout(() => U.toast('Unsaved sales sheet restored. Open Daily Sales to continue.'), 600);
    document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && location.hash === '#sales') { e.preventDefault(); Sales.save(); } });
    if (!Store.db.settings.sheetAsked && Store.db.products.length === 40 && Store.db.products[0].name === 'Fresh Atta 2kg') setTimeout(async () => {
      const ok = await U.ask('Use your real product list?', 'Your printed sheet has 48 products. Replace the 40 sample products with them? Saved sales are not changed. Prices start at 0 and you set them in Products.', [{ label: 'Not now', v: false }, { label: 'Replace products', v: true, cls: 'primary' }]);
      Store.db.settings.sheetAsked = true; if (ok) Prod.useSheetList(); Store.save(); App.route();
    }, 800);
    if (document.fonts) ['400', '600', '700'].forEach(w => document.fonts.load(w + ' 14px "Hind Siliguri"', 'আমার').catch(() => { }));
    new MutationObserver(() => { cancelAnimationFrame(App._ic); App._ic = requestAnimationFrame(() => { if (document.querySelector('i[data-lucide]')) U.icons(); }); }).observe(document.body, { childList: true, subtree: true });
    U.$('#lockBtn').onclick = () => Pin.lock(); if (!Store.enc) Pin.lock(); Pin.touch();
    document.addEventListener('visibilitychange', () => { if (document.hidden && Store.enc) Store.flush(); });
    App.route(); if (U.pending) U.toast(U.pending, 'err');
    setTimeout(() => Cloud.auto(), 2500);
  }
};
document.addEventListener('DOMContentLoaded', App.init);
