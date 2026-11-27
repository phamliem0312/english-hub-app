// window.storage chỉ có trong Claude Artifact; ở trình duyệt thường thì dùng localStorage.
const localStore = {
  get: async (k) => { const v = localStorage.getItem(k); return v === null ? null : { value: v }; },
  set: async (k, v) => localStorage.setItem(k, v),
};
const store = () => window.storage || localStore;

export const save = async (k, v) => { try { await store().set(k, JSON.stringify(v)); } catch { /* bộ nhớ đầy/bị chặn: bỏ qua */ } };
export const load = async (k, d = null) => {
  try { const r = await store().get(k); if (r) return JSON.parse(r.value); } catch { /* dữ liệu hỏng: dùng mặc định */ }
  return d;
};

// Bản ghi âm theo tuần (blob quá lớn cho localStorage) → IndexedDB.
function idb(mode, fn) {
  return new Promise((ok, fail) => {
    const r = indexedDB.open('eh2', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('rec');
    r.onerror = () => fail(r.error);
    r.onsuccess = () => {
      const tx = r.result.transaction('rec', mode); const q = fn(tx.objectStore('rec'));
      tx.oncomplete = () => ok(q.result); tx.onerror = () => fail(tx.error);
    };
  });
}
export const putRec = (k, blob) => idb('readwrite', (s) => s.put(blob, k));
export const getRec = (k) => idb('readonly', (s) => s.get(k));
export const clearRecs = () => idb('readwrite', (s) => s.clear());
