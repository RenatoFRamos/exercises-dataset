// Único módulo do app que fala com armazenamento (regra 8 do plano de execução).
// Nenhuma view ou módulo de domínio deve importar IndexedDB diretamente.
//
// Interface exposta (estável — usada por TODO o resto do app):
//   init(), get(collection, id), getAll(collection), query(collection, criteria),
//   put(collection, record), putMany(collection, records), remove(collection, id),
//   clear(collection), newId()
//
// Backend: IndexedDB do navegador. O app é um único arquivo HTML aberto via
// file://; os dados persistem localmente no perfil do navegador de quem
// abriu o arquivo. `criteria` em query() é sempre um objeto simples de
// igualdade (nunca uma função) — filtragem mais complexa acontece em
// memória, fora deste arquivo, sobre o resultado de getAll()/query().

import { DB_NAME, DB_VERSION, COLLECTIONS, COLLECTION_NAMES } from './schema.js';

let dbPromise = null;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of COLLECTION_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          const { keyPath, indexes = [] } = COLLECTIONS[name];
          const store = db.createObjectStore(name, { keyPath });
          for (const indexField of indexes) {
            store.createIndex(indexField, indexField, { unique: false });
          }
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function init() {
  if (!dbPromise) dbPromise = openDatabase();
  return dbPromise;
}

function assertCollection(collection) {
  if (!COLLECTIONS[collection]) {
    throw new Error(`Coleção desconhecida: ${collection}`);
  }
}

async function withStore(collection, mode, fn) {
  assertCollection(collection);
  const db = await init();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(collection, mode);
    const store = tx.objectStore(collection);
    const result = fn(store);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function get(collection, id) {
  assertCollection(collection);
  const db = await init();
  const tx = db.transaction(collection, 'readonly');
  const store = tx.objectStore(collection);
  const result = await requestToPromise(store.get(id));
  return result ?? null;
}

export async function getAll(collection) {
  assertCollection(collection);
  const db = await init();
  const tx = db.transaction(collection, 'readonly');
  const store = tx.objectStore(collection);
  const result = await requestToPromise(store.getAll());
  return result || [];
}

export async function query(collection, criteria = {}) {
  const all = await getAll(collection);
  const keys = Object.keys(criteria);
  if (keys.length === 0) return all;
  return all.filter((record) => keys.every((key) => record[key] === criteria[key]));
}

export async function put(collection, record) {
  assertCollection(collection);
  return withStore(collection, 'readwrite', (store) => {
    store.put(record);
    return record;
  });
}

export async function putMany(collection, records) {
  assertCollection(collection);
  return withStore(collection, 'readwrite', (store) => {
    for (const record of records) store.put(record);
    return records;
  });
}

export async function remove(collection, id) {
  assertCollection(collection);
  return withStore(collection, 'readwrite', (store) => {
    store.delete(id);
  });
}

export async function clear(collection) {
  assertCollection(collection);
  return withStore(collection, 'readwrite', (store) => {
    store.clear();
  });
}

export function newId() {
  return crypto.randomUUID();
}
