/* Almacenamiento local (IndexedDB). Todo queda en el teléfono: la app
 * nunca envía datos a un servidor y funciona completamente sin señal. */
window.GQ = window.GQ || {};

GQ.db = (function () {
  const NAME = 'geodata_gq';
  const VERSION = 1;
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = function (ev) {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains('samples')) {
          const s = db.createObjectStore('samples', { keyPath: 'id' });
          s.createIndex('muestra', 'muestra', { unique: false });
          s.createIndex('punto', 'punto', { unique: false });
          s.createIndex('proyecto', 'proyecto', { unique: false });
          s.createIndex('createdAt', 'createdAt', { unique: false });
        }
        if (!db.objectStoreNames.contains('photos')) {
          const p = db.createObjectStore('photos', { keyPath: 'id' });
          p.createIndex('sampleId', 'sampleId', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
      req.onsuccess = function () { _db = req.result; resolve(_db); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function tx(store, mode) {
    return open().then(function (db) {
      return db.transaction(store, mode).objectStore(store);
    });
  }

  function wrap(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' +
           Math.random().toString(36).slice(2, 8);
  }

  return {
    uid: uid,
    open: open,

    /* ---- muestras ---- */
    putSample: function (s) {
      return tx('samples', 'readwrite').then(function (st) { return wrap(st.put(s)); });
    },
    getSample: function (id) {
      return tx('samples', 'readonly').then(function (st) { return wrap(st.get(id)); });
    },
    allSamples: function () {
      return tx('samples', 'readonly').then(function (st) { return wrap(st.getAll()); })
        .then(function (rows) {
          rows.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
          return rows;
        });
    },
    deleteSample: function (id) {
      const self = this;
      return self.photosOf(id).then(function (ph) {
        return Promise.all(ph.map(function (p) { return self.deletePhoto(p.id); }));
      }).then(function () {
        return tx('samples', 'readwrite');
      }).then(function (st) { return wrap(st.delete(id)); });
    },
    clearSamples: function () {
      return Promise.all([
        tx('samples', 'readwrite').then(function (st) { return wrap(st.clear()); }),
        tx('photos', 'readwrite').then(function (st) { return wrap(st.clear()); })
      ]);
    },

    /* ---- fotos ---- */
    putPhoto: function (p) {
      return tx('photos', 'readwrite').then(function (st) { return wrap(st.put(p)); });
    },
    photosOf: function (sampleId) {
      return tx('photos', 'readonly').then(function (st) {
        return wrap(st.index('sampleId').getAll(sampleId));
      }).then(function (rows) {
        rows.sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
        return rows;
      });
    },
    allPhotos: function () {
      return tx('photos', 'readonly').then(function (st) { return wrap(st.getAll()); });
    },
    deletePhoto: function (id) {
      return tx('photos', 'readwrite').then(function (st) { return wrap(st.delete(id)); });
    },

    /* ---- ajustes ---- */
    setSetting: function (key, value) {
      return tx('settings', 'readwrite').then(function (st) {
        return wrap(st.put({ key: key, value: value }));
      });
    },
    getSetting: function (key, fallback) {
      return tx('settings', 'readonly').then(function (st) { return wrap(st.get(key)); })
        .then(function (r) { return r ? r.value : fallback; });
    },
    allSettings: function () {
      return tx('settings', 'readonly').then(function (st) { return wrap(st.getAll()); })
        .then(function (rows) {
          const o = {};
          rows.forEach(function (r) { o[r.key] = r.value; });
          return o;
        });
    }
  };
})();
