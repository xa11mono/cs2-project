// v64: browser-only autosave must work when the runtime lacks File System Access API.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = (v, m) => { if (!v) throw new Error(m); };
const source = fs.readFileSync(path.join(__dirname, '..', 'js/manager/v56-autosave.js'), 'utf8');

const records = new Map();
const store = {
  get(key) { const req = {}; setTimeout(() => { req.result = records.get(key); req.onsuccess?.(); }, 0); return req; },
  put(value, key) { records.set(key, value); return this; },
  delete(key) { records.delete(key); return this; },
  clear() { records.clear(); return this; }
};
const db = {
  objectStoreNames: { contains: () => true },
  createObjectStore() {},
  close() {},
  transaction() {
    const tx = { objectStore: () => store };
    const finish = () => tx.oncomplete?.();
    const originalPut = store.put;
    store.put = function (...args) { originalPut.apply(this, args); setTimeout(finish, 0); return this; };
    const originalDelete = store.delete;
    store.delete = function (...args) { originalDelete.apply(this, args); setTimeout(finish, 0); return this; };
    const originalClear = store.clear;
    store.clear = function (...args) { originalClear.apply(this, args); setTimeout(finish, 0); return this; };
    return tx;
  }
};
const indexedDB = {
  open() { const req = {}; setTimeout(() => { req.result = db; req.onupgradeneeded?.(); req.onsuccess?.(); }, 0); return req; }
};
const elements = {};
const localStorage = {
  length: 1,
  key: i => i === 0 ? 'sample' : null,
  getItem: k => k === 'sample' ? 'persisted' : null,
  setItem() {}
};
class Storage { setItem() {} }
const imported = [];
const window = {
  indexedDB,
  localStorage,
  hubArchiveReady: Promise.resolve(),
  hubArchiveExport: () => ({ brackets: [] }),
  addEventListener() {},
  setInterval() { return 1; },
  getElementById() { return null; }
};
const sandbox = {
  window, indexedDB, localStorage, Storage,
  document: { getElementById() { return null; } },
  teams: [{ name: 'Alpha' }],
  seasonState: { currentSeason: 1 },
  transferState: {},
  importData: event => imported.push(event.target.files[0]),
  console,
  Date, JSON, Promise, Math, Blob,
  setTimeout(fn, ms) { return ms <= 10 ? setTimeout(fn, ms) : 999; },
  clearTimeout() {},
  setInterval() { return 1; }
};
vm.runInNewContext(source, sandbox, { filename: 'v56-autosave.js' });

(async () => {
  assert(typeof window.showDirectoryPicker === 'undefined', 'test runtime intentionally has no folder picker');
  await window.v56ChooseAutosaveFolder();
  const primary = records.get('browserAutosave');
  assert(primary && (primary.payload || typeof primary.body === 'string'), 'select folder fallback must still save a full payload into IndexedDB');
  const parsed = primary.payload || JSON.parse(primary.body);
  assert(Array.isArray(parsed.teams) && parsed.teams[0].name === 'Alpha', 'browser backup must include the game team state');
  assert(parsed.localStorageSnapshot.sample === 'persisted', 'browser backup must include browser save keys');
  assert(!imported.length, 'choosing a folder fallback must not accidentally import data');
  await window.v56RestoreAutosave();
  assert(imported.length === 1, 'browser autosave must restore through the normal import path');
  assert(typeof imported[0].text === 'function', 'restored fallback must be a readable Blob');
  const cleared = await window.v56ClearAutosaveDatabase();
  assert(cleared && records.size === 0, 'factory reset must clear browser autosave and backup records');
  console.log('PASS v64: folder picker absence is non-blocking; browser autosave, restore and reset cleanup work');
})().catch(error => { console.error(error); process.exitCode = 1; });
