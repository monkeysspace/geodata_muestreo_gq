/* Fotografías: se reducen en el propio teléfono antes de guardarlas,
 * para que decenas de muestras quepan sin llenar el almacenamiento. */
window.GQ = window.GQ || {};

GQ.photos = (function () {

  function leerArchivo(file) {
    return new Promise(function (resolve, reject) {
      const fr = new FileReader();
      fr.onload = function () { resolve(fr.result); };
      fr.onerror = function () { reject(new Error('No se pudo leer la imagen.')); };
      fr.readAsDataURL(file);
    });
  }

  function cargarImagen(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Imagen no válida.')); };
      img.src = src;
    });
  }

  /* Reduce al lado máximo indicado y devuelve un JPEG. */
  function redimensionar(file, maxLado, calidad) {
    return leerArchivo(file).then(cargarImagen).then(function (img) {
      let w = img.naturalWidth, h = img.naturalHeight;
      const escala = Math.min(1, maxLado / Math.max(w, h));
      w = Math.round(w * escala); h = Math.round(h * escala);

      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);

      return new Promise(function (resolve) {
        if (c.toBlob) {
          c.toBlob(function (b) { resolve({ blob: b, w: w, h: h }); },
                   'image/jpeg', calidad || 0.82);
        } else {
          const d = c.toDataURL('image/jpeg', calidad || 0.82);
          const bin = atob(d.split(',')[1]);
          const arr = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve({ blob: new Blob([arr], { type: 'image/jpeg' }), w: w, h: h });
        }
      });
    });
  }

  /* Guarda una foto asociada a una muestra (o a un borrador). */
  function agregar(sampleId, file, opts) {
    opts = opts || {};
    const maxLado = parseInt(opts.maxLado, 10) || 1600;
    return redimensionar(file, maxLado, 0.82).then(function (r) {
      const reg = {
        id: GQ.db.uid('foto'),
        sampleId: sampleId,
        blob: r.blob,
        ancho: r.w,
        alto: r.h,
        bytes: r.blob.size,
        nombreOriginal: file.name || '',
        createdAt: Date.now()
      };
      return GQ.db.putPhoto(reg).then(function () { return reg; });
    });
  }

  function urlDe(foto) {
    return URL.createObjectURL(foto.blob);
  }

  /* Reasigna las fotos tomadas en un borrador a la muestra ya guardada. */
  function reasignar(desdeId, haciaId) {
    return GQ.db.photosOf(desdeId).then(function (fotos) {
      return Promise.all(fotos.map(function (f) {
        f.sampleId = haciaId;
        return GQ.db.putPhoto(f);
      }));
    });
  }

  function nombreArchivo(muestra, indice) {
    const base = (muestra.muestra || muestra.punto || 'muestra')
      .replace(/[^A-Za-z0-9._-]+/g, '_');
    return base + '_' + String(indice + 1).padStart(2, '0') + '.jpg';
  }

  return {
    agregar: agregar,
    urlDe: urlDe,
    reasignar: reasignar,
    redimensionar: redimensionar,
    nombreArchivo: nombreArchivo
  };
})();
