// BizTrack Malawi - IndexedDB wrapper (design v1.0, section 2)
// Minimal promisified API. Three stores: transactions, customers, categories.
'use strict';

const DB_NAME = 'biztrack';
const DB_VERSION = 1;
const DEFAULT_CATEGORIES = ['Stock purchase', 'Transport', 'Utilities', 'Salaries', 'Rent', 'Other'];

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('transactions')) {
        const tx = db.createObjectStore('transactions', { keyPath: 'id' });
        tx.createIndex('date', 'date');
        tx.createIndex('type', 'type');
        tx.createIndex('customerId', 'customerId');
        tx.createIndex('categoryId', 'categoryId');
      }
      if (!db.objectStoreNames.contains('customers')) {
        const cu = db.createObjectStore('customers', { keyPath: 'id' });
        cu.createIndex('name', 'name', { unique: true });
      }
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      seedDefaults(_db).then(() => resolve(_db));
    };
    req.onerror = () => reject(req.error);
  });
}

async function seedDefaults(db) {
  const count = await dbCount('categories');
  if (count > 0) return;
  for (const name of DEFAULT_CATEGORIES) {
    await dbPut('categories', { id: 'cat-' + name.toLowerCase().replace(/\s+/g, '-'), name, builtin: true });
  }
}

function dbRun(store, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

const dbAdd = (store, val) => dbRun(store, 'readwrite', (s) => s.add(val));
const dbPut = (store, val) => dbRun(store, 'readwrite', (s) => s.put(val));
const dbGet = (store, key) => dbRun(store, 'readonly', (s) => s.get(key));
const dbGetAll = (store) => dbRun(store, 'readonly', (s) => s.getAll());
const dbCount = (store) => dbRun(store, 'readonly', (s) => s.count());
const dbDelete = (store, key) => dbRun(store, 'readwrite', (s) => s.delete(key));
