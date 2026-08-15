import Dexie from "dexie";

// Same DB name, store names, and keyPaths as the original hand-rolled
// IndexedDB schema, so any data from the prior prototype still opens here.
export const db = new Dexie("orbs");
db.version(1).stores({
  meta: "key",
  interests: "id",
  photos: "id",
  entries: "id",
});

export function getAll(store) {
  return db[store].toArray();
}

export function put(store, obj) {
  return db[store].put(obj);
}

export function del(store, id) {
  return db[store].delete(id);
}

export function clearAll() {
  return Promise.all(["meta", "interests", "photos", "entries"].map((s) => db[s].clear()));
}
