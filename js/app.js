/* Armado general: navegación, ajustes, tema y registro sin conexión. */
window.GQ = window.GQ || {};

GQ.app = (function () {
  const $ = function (id) { return document.getElementById(id); };
  const VERSION = '1.3.0';
  let ajustes = {};
  let vistaActual = 'form';
  let timerAviso = null;

  const POR_OMISION = {
    entrega: 'compartir',
    proyecto: '',
    sector: '',
    sectores: [],
    tiposExtra: [],
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

    pintarCatalogos();
    $('version').textContent = VERSION;
  }

  /* Repinta solo las listas de prefijos y tipos. Se llama al agregar o
     quitar una entrada, y no toca el resto del formulario para no borrar
     lo que el usuario esté escribiendo. */
  function pintarCatalogos() {
    const sectores = ajustes.sectores || [];
    const sel = $('a-sector');
    const selPrevio = sel.value;
    sel.innerHTML = '';
    if (!sectores.length) {
      sel.insertAdjacentHTML('beforeend', '<option value="">— todavía no creas ninguno —</option>');
    }
    sectores.forEach(function (s) {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      sel.appendChild(o);
    });
    sel.value = sectores.indexOf(selPrevio) >= 0 ? selPrevio : (ajustes.sector || '');

    const tipo = $('a-tipo');
    const tipoPrevio = tipo.value;
    const tipos = GQ.form.listaTipos();
    tipo.innerHTML = '';
    tipos.forEach(function (s) {
      const o = document.createElement('option');
      o.value = s; o.textContent = s;
      tipo.appendChild(o);
    });
    tipo.value = tipos.indexOf(tipoPrevio) >= 0 ? tipoPrevio : (ajustes.tipoMuestra || tipos[0]);

    pintarCatalogo('a-sectores-lista', sectores, 'sectores',
                   'No has creado ningún prefijo todavía.');
    pintarCatalogo('a-tipos-lista', ajustes.tiposExtra || [], 'tiposExtra',
                   'Solo están los cuatro tipos del compilado.');
  }

  /* Chips de un catálogo propio; tocarlos lo elimina. */
  function pintarCatalogo(contenedorId, valores, clave, vacio) {
    const cont = $(contenedorId);
    cont.innerHTML = '';
    if (!valores.length) {
      cont.innerHTML = '<span class="ayuda" style="text-transform:none">' + vacio + '</span>';
      return;
    }
    valores.forEach(function (v) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip';
      b.textContent = v + '  ✕';
      b.addEventListener('click', function () {
        if (!confirm('¿Quitar «' + v + '» de la lista?\n' +
                     'Las muestras ya guardadas con ese valor no se modifican.')) return;
        ajustes[clave] = (ajustes[clave] || []).filter(function (x) { return x !== v; });
        if (clave === 'sectores' && ajustes.sector === v) ajustes.sector = ajustes.sectores[0] || '';
        if (clave === 'tiposExtra' && ajustes.tipoMuestra === v) {
          ajustes.tipoMuestra = GQ.catalogs.tipoMuestra[0];
        }
        Promise.all([
          GQ.db.setSetting(clave, ajustes[clave]),
          GQ.db.setSetting('sector', ajustes.sector),
          GQ.db.setSetting('tipoMuestra', ajustes.tipoMuestra)
        ]).then(function () {
          GQ.form.setAjustes(ajustes);
          GQ.form.repintarCatalogos();
          pintarCatalogos();
          aviso('«' + v + '» eliminado de la lista');
        });
      });
      cont.appendChild(b);
    });
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

  /* El botón de compartir del sistema no existe en todos los equipos
     (en un computador, por ejemplo). Ahí se deja solo la descarga. */
  function prepararEntrega() {
    const sel = $('exp-entrega');
    const hay = GQ.exportar.compartirDisponible();
    if (!hay) {
      sel.value = 'descargar';
      sel.querySelector('option[value="compartir"]').disabled = true;
      sel.disabled = true;
    } else {
      sel.value = ajustes.entrega || 'compartir';
    }
    pintarAyudaEntrega(hay);
  }

  function pintarAyudaEntrega(hay) {
    if (hay === undefined) hay = GQ.exportar.compartirDisponible();
    const el = $('exp-entrega-ayuda');
    if (!hay) {
      el.textContent = 'Este equipo no ofrece el menú de compartir del sistema, ' +
                       'así que el archivo se guarda en la carpeta de descargas.';
      return;
    }
    el.textContent = $('exp-entrega').value === 'compartir'
      ? 'Se abre el menú del teléfono para elegir a dónde enviarlo. No necesitas cable.'
      : 'El archivo queda en la carpeta de descargas del teléfono.';
  }

  function pintarResumenExport() {
    Promise.all([GQ.db.allSamples(), GQ.db.allPhotos()]).then(function (r) {
      let bytes = 0;
      r[1].forEach(function (f) { bytes += f.bytes || 0; });

      /* Proyectos presentes en los datos, para exportar uno solo. */
      const sel = $('exp-proyecto');
      const previo = sel.value;
      const proyectos = {};
      r[0].forEach(function (s) { if (s.proyecto) proyectos[s.proyecto] = (proyectos[s.proyecto] || 0) + 1; });
      sel.innerHTML = '<option value="">Todas las muestras (' + r[0].length + ')</option>';
      Object.keys(proyectos).sort().forEach(function (p) {
        sel.insertAdjacentHTML('beforeend',
          '<option value="' + p.replace(/"/g, '&quot;') + '">' + p + ' (' + proyectos[p] + ')</option>');
      });
      sel.value = proyectos[previo] ? previo : '';
      $('exp-conteo').textContent = sel.value
        ? 'Se exportarán las ' + proyectos[sel.value] + ' muestras de ' + sel.value + '.'
        : 'Se exportarán las ' + r[0].length + ' muestras guardadas.';

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

      $('a-sector-add').addEventListener('click', function () {
        const v = ($('a-sector-nuevo').value || '').trim().toUpperCase();
        if (!v) { aviso('Escribe el prefijo'); return; }
        if (!/^[A-ZÑ0-9]{1,10}$/.test(v)) {
          aviso('Usa solo letras y números, sin espacios ni guiones'); return;
        }
        if ((ajustes.sectores || []).indexOf(v) >= 0) { aviso('Ya está en la lista'); return; }
        ajustes.sectores = (ajustes.sectores || []).concat([v]);
        if (!ajustes.sector) ajustes.sector = v;
        Promise.all([
          GQ.db.setSetting('sectores', ajustes.sectores),
          GQ.db.setSetting('sector', ajustes.sector)
        ]).then(function () {
          $('a-sector-nuevo').value = '';
          GQ.form.setAjustes(ajustes);
          GQ.form.repintarCatalogos();
          pintarCatalogos();
          aviso('Prefijo ' + v + ' creado');
        });
      });

      $('a-tipo-add').addEventListener('click', function () {
        const v = ($('a-tipo-nuevo').value || '').trim();
        if (!v) { aviso('Escribe el tipo de muestra'); return; }
        if (GQ.form.listaTipos().indexOf(v) >= 0) { aviso('Ya está en la lista'); return; }
        ajustes.tiposExtra = (ajustes.tiposExtra || []).concat([v]);
        GQ.db.setSetting('tiposExtra', ajustes.tiposExtra).then(function () {
          $('a-tipo-nuevo').value = '';
          GQ.form.setAjustes(ajustes);
          GQ.form.repintarCatalogos();
          pintarCatalogos();
          aviso('Tipo agregado');
        });
      });
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

      prepararEntrega();
      $('exp-proyecto').addEventListener('change', pintarResumenExport);
      $('exp-entrega').addEventListener('change', function () {
        ajustes.entrega = this.value;
        GQ.db.setSetting('entrega', this.value);
        pintarAyudaEntrega();
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
    refrescarCatalogos: function () { if ($('a-sectores-lista')) pintarCatalogos(); },
    ajustes: function () { return ajustes; },
    VERSION: VERSION
  };
})();
