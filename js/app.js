/* Armado general: navegación, ajustes, tema y registro sin conexión. */
window.GQ = window.GQ || {};

GQ.app = (function () {
  const $ = function (id) { return document.getElementById(id); };
  const VERSION = '1.0.0';
  let ajustes = {};
  let vistaActual = 'form';
  let timerAviso = null;

  const POR_OMISION = {
    proyecto: '',
    sector: 'CR',
    operador: '',
    prefijo: 'GQ',
    tipoMuestra: GQ.catalogs.tipoMuestra[0],
    precisionAviso: 15,
    maxLado: 1600,
    tema: 'auto'
  };

  /* ---------- avisos ---------- */
  function aviso(texto) {
    const el = $('aviso');
    el.textContent = texto;
    el.classList.add('ver');
    clearTimeout(timerAviso);
    timerAviso = setTimeout(function () { el.classList.remove('ver'); }, 2600);
  }

  /* ---------- navegación ---------- */
  function ir(vista) {
    ['form', 'lista', 'detalle', 'mapa', 'exportar', 'ajustes'].forEach(function (v) {
      const el = $('vista-' + v);
      if (el) el.hidden = (v !== vista);
    });
    document.querySelectorAll('.barra button').forEach(function (b) {
      b.classList.toggle('activo', b.dataset.vista === vista ||
        (vista === 'detalle' && b.dataset.vista === 'lista'));
    });
    vistaActual = vista;
    if (vista === 'lista') GQ.list.refrescar();
    if (vista === 'mapa') GQ.map.refrescar();
    if (vista === 'exportar') pintarResumenExport();
    if (vista === 'ajustes') pintarAlmacenamiento();
    if (vista === 'form') GQ.form.actualizarSugerencias();
    if (vista !== 'form') $('subtitulo').textContent = {
      lista: 'Muestras guardadas', detalle: 'Ficha de la muestra',
      mapa: 'Croquis de puntos', exportar: 'Exportar datos', ajustes: 'Ajustes'
    }[vista] || '';
    window.scrollTo(0, 0);
  }

  function refrescar() {
    GQ.form.actualizarSugerencias();
    if (vistaActual === 'lista') GQ.list.refrescar();
    if (vistaActual === 'mapa') GQ.map.refrescar();
    if (vistaActual === 'exportar') pintarResumenExport();
  }

  /* ---------- tema ---------- */
  function aplicarTema(t) {
    if (t === 'claro' || t === 'oscuro') document.documentElement.dataset.tema = t;
    else delete document.documentElement.dataset.tema;
    const meta = document.querySelector('meta[name="theme-color"]');
    const oscuro = t === 'oscuro' ||
      (t !== 'claro' && window.matchMedia &&
       window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (meta) meta.setAttribute('content', oscuro ? '#17251f' : '#2f5d50');
  }

  function rotarTema() {
    const orden = ['auto', 'claro', 'oscuro'];
    const i = orden.indexOf(ajustes.tema || 'auto');
    ajustes.tema = orden[(i + 1) % 3];
    aplicarTema(ajustes.tema);
    GQ.db.setSetting('tema', ajustes.tema);
    aviso('Tema: ' + ajustes.tema);
  }

  /* ---------- ajustes ---------- */
  function pintarAjustes() {
    $('a-proyecto').value = ajustes.proyecto || '';
    $('a-operador').value = ajustes.operador || '';
    $('a-prefijo').value = ajustes.prefijo || 'GQ';
    $('a-precision').value = ajustes.precisionAviso || 15;
    $('a-calidad').value = String(ajustes.maxLado || 1600);

    const sel = $('a-sector');
    sel.innerHTML = '';
    GQ.catalogs.sectores.forEach(function (s) {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      if (s === ajustes.sector) o.selected = true;
      sel.appendChild(o);
    });

    const tipo = $('a-tipo');
    tipo.innerHTML = '';
    GQ.catalogs.tipoMuestra.forEach(function (s) {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      if (s === ajustes.tipoMuestra) o.selected = true;
      tipo.appendChild(o);
    });
    $('version').textContent = VERSION;
  }

  function guardarAjustes() {
    ajustes.proyecto = $('a-proyecto').value.trim();
    ajustes.sector = $('a-sector').value;
    ajustes.operador = $('a-operador').value.trim();
    ajustes.prefijo = ($('a-prefijo').value.trim() || 'GQ').toUpperCase();
    ajustes.tipoMuestra = $('a-tipo').value;
    ajustes.precisionAviso = parseInt($('a-precision').value, 10) || 15;
    ajustes.maxLado = parseInt($('a-calidad').value, 10) || 1600;

    const pares = Object.keys(ajustes).map(function (k) {
      return GQ.db.setSetting(k, ajustes[k]);
    });
    return Promise.all(pares).then(function () {
      GQ.form.setAjustes(ajustes);
      aviso('Ajustes guardados');
    });
  }

  /* ---------- almacenamiento ---------- */
  function pintarAlmacenamiento() {
    Promise.all([GQ.db.allSamples(), GQ.db.allPhotos()]).then(function (r) {
      let bytes = 0;
      r[1].forEach(function (f) { bytes += f.bytes || 0; });
      let txt = r[0].length + ' muestra(s) · ' + r[1].length + ' foto(s) · ' +
                (bytes / 1048576).toFixed(1) + ' MB en fotos';
      $('uso-almacen').textContent = txt;
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(function (e) {
          if (!e.quota) return;
          $('uso-almacen').textContent = txt + ' · espacio disponible ≈ ' +
            ((e.quota - (e.usage || 0)) / 1048576).toFixed(0) + ' MB';
        });
      }
    });
  }

  function pintarResumenExport() {
    Promise.all([GQ.db.allSamples(), GQ.db.allPhotos()]).then(function (r) {
      let bytes = 0;
      r[1].forEach(function (f) { bytes += f.bytes || 0; });
      $('resumen-exportar').innerHTML =
        '<div class="tarjeta-dato"><div class="valor">' + r[0].length + '</div><div class="rotulo">muestras</div></div>' +
        '<div class="tarjeta-dato"><div class="valor">' + r[1].length + '</div><div class="rotulo">fotos</div></div>' +
        '<div class="tarjeta-dato"><div class="valor">' + (bytes / 1048576).toFixed(1) + '</div><div class="rotulo">MB</div></div>';
    });
  }

  /* ---------- conexión ---------- */
  function estadoConexion() {
    const previo = document.getElementById('banda-conexion');
    if (previo) previo.remove();
    if (navigator.onLine) return;
    const d = document.createElement('div');
    d.id = 'banda-conexion';
    d.className = 'nota sin-conexion';
    d.textContent = 'Sin conexión — la app sigue funcionando y todo queda guardado en el teléfono.';
    document.querySelector('main').prepend(d);
  }

  /* ---------- inicio ---------- */
  function init() {
    return GQ.db.allSettings().then(function (guardados) {
      ajustes = Object.assign({}, POR_OMISION, guardados);
      aplicarTema(ajustes.tema);

      document.querySelectorAll('.barra button').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.dataset.vista === 'form') {
            if (vistaActual === 'form' && !GQ.form.estaEditando()) return;
            /* salir de la edición de una muestra guardada abre una nueva */
            if (GQ.form.estaEditando()) {
              GQ.form.nuevo().then(function () { ir('form'); });
              return;
            }
          }
          ir(b.dataset.vista);
        });
      });

      $('btn-tema').addEventListener('click', rotarTema);
      $('btn-guardar-ajustes').addEventListener('click', guardarAjustes);
      $('btn-borrar-todo').addEventListener('click', function () {
        const r = prompt('Esto borra TODAS las muestras y fotos de este teléfono.\n' +
                         'Escribe BORRAR para confirmar:');
        if (!r || r.trim().toUpperCase() !== 'BORRAR') return;
        GQ.db.clearSamples().then(function () {
          aviso('Todo borrado');
          refrescar();
          pintarAlmacenamiento();
        });
      });

      $('btn-xlsx').addEventListener('click', GQ.exportar.aExcel);
      $('btn-csv').addEventListener('click', GQ.exportar.aCSV);
      $('btn-zip').addEventListener('click', GQ.exportar.aZIP);
      $('btn-kml').addEventListener('click', GQ.exportar.aKML);
      $('btn-respaldo').addEventListener('click', GQ.exportar.respaldar);
      $('btn-restaurar').addEventListener('click', function () { $('input-respaldo').click(); });
      $('input-respaldo').addEventListener('change', function () {
        if (this.files && this.files[0]) GQ.exportar.restaurar(this.files[0]);
        this.value = '';
      });

      window.addEventListener('online', estadoConexion);
      window.addEventListener('offline', estadoConexion);
      estadoConexion();

      pintarAjustes();
      GQ.map.init();

      return GQ.form.init(ajustes);
    }).then(function () {
      return GQ.list.init();
    }).then(function () {
      ir('form');
      if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) {
        navigator.serviceWorker.register('sw.js').catch(function (e) {
          console.warn('Sin service worker:', e.message);
        });
      }
      if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persisted().then(function (ya) {
          if (!ya) navigator.storage.persist();
        });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    init().catch(function (e) {
      console.error(e);
      alert('No se pudo iniciar la aplicación: ' + e.message);
    });
  });

  return {
    ir: ir, aviso: aviso, refrescar: refrescar,
    ajustes: function () { return ajustes; },
    VERSION: VERSION
  };
})();
