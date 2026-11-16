'use strict';
/* Receipt photos live in IndexedDB on this phone. Entries keep only the photo ids. */

const RDB = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const rq = indexedDB.open('payday-ledger', 2);
      rq.onupgradeneeded = () => { for (const st of ['receipts', 'state']) if (!rq.result.objectStoreNames.contains(st)) rq.result.createObjectStore(st); };
      rq.onsuccess = () => { this._db = rq.result; res(this._db); };
      rq.onerror = () => rej(rq.error);
    });
  },
  async run(mode, fn, store = 'receipts') {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction(store, mode);
      const rq = fn(tx.objectStore(store));
      tx.oncomplete = () => res(rq ? rq.result : undefined);
      tx.onerror = () => rej(tx.error);
    });
  },
  put(id, blob) { return this.run('readwrite', s => s.put(blob, id)); },
  get(id) { return this.run('readonly', s => s.get(id)); },
  del(id) { return this.run('readwrite', s => s.delete(id)); },
  clear() { R64.clear(); return this.run('readwrite', s => s.clear()); },
  getState() { return this.run('readonly', s => s.get('main'), 'state'); },
  putState(json) { return this.run('readwrite', s => s.put(json, 'main'), 'state'); },
};

async function compressImage(file, max = 1400, quality = .72) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const sc = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * sc); c.height = Math.round(img.naturalHeight * sc);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return await new Promise(res => c.toBlob(b => res(b || file), 'image/jpeg', quality));
  } finally { URL.revokeObjectURL(url); }
}

/* Photos being edited in the open form: kept ids, new blobs, and object URLs to release on close. */
const RForm = { keep: [], add: [], urls: new Map(), quick: null };
function receiptField(entry) {
  RForm.keep = [...((entry && entry.receipts) || [])]; RForm.add = [];
  setTimeout(renderReceiptThumbs, 0);
  return `<div class="field"><span>Receipt photos</span><div class="rcpts" id="rcpts"></div></div>`;
}
async function urlFor(id) {
  if (RForm.urls.has(id)) return RForm.urls.get(id);
  const fresh = RForm.add.find(a => a.id === id);
  const blob = fresh ? fresh.blob : await RDB.get(id).catch(() => null);
  if (!blob) return '';
  const u = URL.createObjectURL(blob); RForm.urls.set(id, u); return u;
}
function renderReceiptThumbs() {
  const el = document.getElementById('rcpts'); if (!el) return;
  const ids = [...RForm.keep, ...RForm.add.map(a => a.id)];
  el.innerHTML = ids.map(id => `<button type="button" class="rcpt" data-action="rcpt-view" data-rid="${id}" aria-label="View receipt"></button>`).join('')
    + `<label class="rcpt-add">${sprite('camera', '', null)}<br>ADD<input type="file" id="rcpt-input" accept="image/*" hidden></label>`;
  el.querySelectorAll('.rcpt').forEach(async b => { const u = await urlFor(b.dataset.rid); if (u) b.style.backgroundImage = `url("${u}")`; });
}
/* Called when the entry form is saved. Writes new photos, deletes removed ones, returns the ids to keep. */
function commitReceipts(oldIds = []) {
  for (const a of RForm.add) RDB.put(a.id, a.blob).catch(() => toast('Couldn’t save a photo. Your phone may be out of space.'));
  for (const id of oldIds) if (!RForm.keep.includes(id)) RDB.del(id).catch(() => {});
  const ids = [...RForm.keep, ...RForm.add.map(a => a.id)];
  RForm.add = [];
  return ids.length ? ids : undefined;
}
function deleteReceipts(ids) { for (const id of ids || []) RDB.del(id).catch(() => {}); }
function releaseReceiptURLs() { for (const u of RForm.urls.values()) URL.revokeObjectURL(u); RForm.urls.clear(); }

async function openViewer(id, editable) {
  const v = document.getElementById('viewer');
  const u = await urlFor(id);
  v.innerHTML = `<div class="vbar"><b class="pill gold-p">RECEIPT</b><button class="btn sm" data-action="viewer-close">Close</button></div>
    ${u ? `<img src="${u}" alt="Receipt photo">` : '<p class="muted" style="margin:auto">This photo is missing.</p>'}
    ${editable ? `<button class="btn danger block" data-action="viewer-remove" data-rid="${id}">Remove photo</button>` : '<span></span>'}`;
  v.hidden = false;
}
const receiptActions = {
  'rcpt-view': el => openViewer(el.dataset.rid, !!el.closest('form')),
  'viewer-close': () => { document.getElementById('viewer').hidden = true; },
  'viewer-remove': el => {
    const id = el.dataset.rid;
    RForm.keep = RForm.keep.filter(x => x !== id); RForm.add = RForm.add.filter(a => a.id !== id);
    document.getElementById('viewer').hidden = true; renderReceiptThumbs();
  },
};
document.addEventListener('change', async e => {
  const t = e.target;
  if ((t.id === 'rcpt-input' || t.id === 'q-photo') && t.files && t.files[0]) {
    let blob;
    try { blob = await compressImage(t.files[0]); } catch (_) { toast('That photo couldn’t be read. Try another.'); return; }
    const id = newId('r');
    if (t.id === 'q-photo') { RForm.quick = { id, blob }; const s = document.getElementById('q-photo-s'); if (s) s.textContent = 'Photo attached'; }
    else { RForm.add.push({ id, blob }); renderReceiptThumbs(); }
    t.value = '';
  }
});

/* Backups: photos travel as data URLs inside the JSON file. */
const blobToDataURL = b => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });
const R64 = new Map();
async function receiptsForBackup() {
  const out = {};
  for (const e of all()) for (const id of e.receipts || []) {
    if (!R64.has(id)) { const b = await RDB.get(id).catch(() => null); if (b) R64.set(id, await blobToDataURL(b)); }
    if (R64.has(id)) out[id] = R64.get(id);
  }
  return out;
}
async function restoreReceipts(map) {
  for (const [id, url] of Object.entries(map || {})) { try { const b = await (await fetch(url)).blob(); await RDB.put(id, b); } catch (_) { /* skip a broken photo */ } }
}
async function storageLine() {
  try { const e = await navigator.storage.estimate(); return `Using ${(e.usage / 1048576).toFixed(1)} MB on this phone.`; } catch (_) { return ''; }
}
