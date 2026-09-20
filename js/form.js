/* Formulario de muestra: captura, GPS, fotos, borrador automático. */
window.GQ = window.GQ || {};

GQ.form = (function () {
  const C = GQ.catalogs;
  const BORRADOR = 'gq_borrador';
  let estado = null;      // muestra en edición
  let ajustes = {};
  let ultimaGuardada = null;

  const $ = function (id) { return document.getElementById(id); };

  /* ---------- utilidades ---------- */

  function opciones(select, valores, seleccionado) {
    select.innerHTML = '';
    valores.forEach(function (v) {
      const o = document.createElement('option');
      o.value = v; o.textContent = v;
      if (v === seleccionado) o.selected = true;
      select.appendChild(o);
    });
  }

  function datalist(el, valores) {
    el.innerHTML = '';
    valores.forEach(function (v) {
      const o = document.createElement('option');
      o.value = v;
      el.appendChild(o);
    });
  }

  function chips(contenedor, valores, alTocar) {
    contenedor.innerHTML = '';
    valores.forEach(function (v) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.textContent = v;
      b.addEventListener('click', function () { alTocar(v, b); });
      contenedor.appendChild(b);
    });
  }

  function agregarTexto(textarea, texto) {
    const actual = textarea.value.replace(/\s+$/, '');
    if (!actual) {
      textarea.value = texto.charAt(0).toUpperCase() + texto.slice(1) + '. ';
    } else if (/[.;:,]$/.test(actual)) {
      /* tras un punto se abre una frase nueva; tras coma se sigue enumerando */
      textarea.value = actual + ' ' + texto + (actual.endsWith('.') ? '. ' : '');
    } else if (/\b(de|del|con|y|e|a)$/i.test(actual)) {
      /* la frase quedó abierta por una preposición: no corresponde coma */
      textarea.value = actual + ' ' + texto;
    } else {
      textarea.value = actual + ', ' + texto;
    }
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    guardarBorrador();
  }

  function fechaTexto(iso) {
    if (!iso) return '';
    const p = iso.split('-');
    const m = parseInt(p[1], 10);
    if (!m) return '';
    return C.meses[m - 1] + ' ' + p[0];
  }

  function hoyISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + String(d.getDate()).padStart(2, '0');
  }

  /* ---------- correlativo ---------- */

  function sugerirCodigo() {
    const sector = $('f-sector').value;
    const prefijo = (ajustes.prefijo || 'GQ').toUpperCase();
    const iso = $('f-fecha').value || hoyISO();
    const aa = iso.slice(2, 4);
    return GQ.db.allSamples().then(function (rows) {
      const re = new RegExp('^' + prefijo + '-' + aa + '-' + sector + '-(\\d+)$', 'i');
      let max = 0;
      rows.forEach(function (r) {
        if (estado && r.id === estado.id) return;
        const m = re.exec((r.muestra || '').trim());
        if (m) max = Math.max(max, parseInt(m[1], 10));
      });
      return prefijo + '-' + aa + '-' + sector + '-' + String(max + 1).padStart(3, '0');
    });
  }

  function sugerirPunto() {
    const sector = $('f-sector').value;
    return GQ.db.allSamples().then(function (rows) {
      const re = new RegExp('^' + sector + '-(\\d+)$', 'i');
      let max = 0;
      rows.forEach(function (r) {
        if (estado && r.id === estado.id) return;
        const m = re.exec((r.punto || '').trim());
        if (m) max = Math.max(max, parseInt(m[1], 10));
      });
      return max ? String(max + 1) : '';
    });
  }

  function componerPunto() {
    const s = $('f-sector').value;
    const n = ($('f-punto-num').value || '').trim();
    $('f-punto').value = n ? s + '-' + n : '';
  }

  /* ---------- GPS ---------- */

  function estadoGPS(texto, clase) {
    const el = $('gps-estado');
    el.textContent = texto;
    el.className = 'gps-estado' + (clase ? ' ' + clase : '');
  }

  function tomarGPS() {
    const btn = $('btn-gps');
    btn.disabled = true;
    estadoGPS('Buscando satélites…');
    GQ.geo.locate().then(function (p) {
      $('f-este').value = p.este;
      $('f-norte').value = p.norte;
      $('f-zona').value = p.zonaUTM;
      if (p.altitud !== null && !$('f-altitud').value) $('f-altitud').value = p.altitud;
      estado.lat = p.lat; estado.lon = p.lon;
      estado.precision = p.precision;
      estado.origenCoord = 'GPS del teléfono';

      const umbral = parseInt(ajustes.precisionAviso, 10) || 15;
      const txt = 'Lat ' + p.lat.toFixed(5) + '  Lon ' + p.lon.toFixed(5) +
                  '  ·  ± ' + p.precision + ' m  ·  zona ' + p.zonaUTM;
      if (p.precision && p.precision > umbral) {
        estadoGPS(txt + '  ·  precisión baja, espera unos segundos y repite.', 'avisa');
      } else {
        estadoGPS('✓ ' + txt, 'ok');
      }
      mostrarDistancia();
      guardarBorrador();
    }).catch(function (e) {
      estadoGPS(e.message, 'mal');
    }).then(function () { btn.disabled = false; });
  }

  function mostrarDistancia() {
    const e = parseFloat($('f-este').value), n = parseFloat($('f-norte').value);
    const el = $('dist-anterior');
    if (!ultimaGuardada || !isFinite(e) || !isFinite(n) ||
        !isFinite(ultimaGuardada.este) || !isFinite(ultimaGuardada.norte)) {
      el.textContent = ''; return;
    }
    const d = GQ.geo.distUTM({ este: e, norte: n },
                             { este: ultimaGuardada.este, norte: ultimaGuardada.norte });
    el.textContent = 'A ' + (d >= 1000 ? (d / 1000).toFixed(2) + ' km' : d + ' m') +
                     ' de ' + (ultimaGuardada.muestra || ultimaGuardada.punto) + '.';
  }

  /* ---------- fotos ---------- */

  function pintarFotos() {
    const cont = $('galeria');
    return GQ.db.photosOf(estado.id).then(function (fotos) {
      cont.innerHTML = '';
      $('contador-fotos').textContent = fotos.length ? fotos.length + ' foto' + (fotos.length > 1 ? 's' : '') : '';
      fotos.forEach(function (f) {
        const d = document.createElement('div');
        d.className = 'foto';
        const img = document.createElement('img');
        img.src = GQ.photos.urlDe(f);
        img.alt = 'Foto de la muestra';
        img.loading = 'lazy';
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'quitar'; b.textContent = '×';
        b.setAttribute('aria-label', 'Eliminar foto');
        b.addEventListener('click', function (ev) {
          ev.stopPropagation();
          GQ.db.deletePhoto(f.id).then(pintarFotos).then(function () {
            GQ.app.aviso('Foto eliminada');
          });
        });
        const e = document.createElement('span');
        e.className = 'etq';
        e.textContent = Math.round(f.bytes / 1024) + ' kB';
        d.appendChild(img); d.appendChild(b); d.appendChild(e);
        cont.appendChild(d);
      });
    });
  }

  function recibirArchivos(files) {
    if (!files || !files.length) return;
    const lista = Array.prototype.slice.call(files);
    GQ.app.aviso('Procesando ' + lista.length + ' foto(s)…');
    let cadena = Promise.resolve();
    lista.forEach(function (f) {
      cadena = cadena.then(function () {
        return GQ.photos.agregar(estado.id, f, { maxLado: ajustes.maxLado || 1600 });
      });
    });
    cadena.then(pintarFotos).then(function () {
      GQ.app.aviso('Foto guardada');
    }).catch(function (e) {
      GQ.app.aviso('No se pudo guardar la foto');
      console.error(e);
    });
  }

  /* ---------- borrador ---------- */

  function datosDelFormulario() {
    return {
      id: estado.id,
      proyecto: $('f-proyecto').value.trim(),
      sector: $('f-sector').value,
      puntoNum: $('f-punto-num').value.trim(),
      punto: $('f-punto').value.trim(),
      muestra: $('f-muestra').value.trim(),
      fechaISO: $('f-fecha').value,
      fechaTexto: fechaTexto($('f-fecha').value),
      duplicado: $('f-duplicado').value,
      duplicadoDe: $('f-duplicado-de').value.trim(),
      este: parseFloat($('f-este').value) || null,
      norte: parseFloat($('f-norte').value) || null,
      altitud: isFinite(parseFloat($('f-altitud').value)) ? parseFloat($('f-altitud').value) : null,
      zonaUTM: $('f-zona').value,
      lat: estado.lat != null ? estado.lat : null,
      lon: estado.lon != null ? estado.lon : null,
      precision: estado.precision != null ? estado.precision : null,
      origenCoord: estado.origenCoord || 'Ingreso manual',
      tipoMuestra: $('f-tipo').value,
      escorrentia: $('f-escorrentia').value,
      color: $('f-color').value.trim(),
      granulometria: $('f-granulometria').value,
      materiaOrganica: $('f-materia').value,
      clastos: $('f-clastos').value.trim(),
      factores: $('f-factores').value.trim(),
      otras: $('f-otras').value.trim(),
      operador: $('f-operador').value.trim(),
      hora: estado.hora || null,
      createdAt: estado.createdAt || null,
      updatedAt: Date.now()
    };
  }

  function guardarBorrador() {
    if (!estado) return;
    try {
      const d = datosDelFormulario();
      d._editando = !!estado.editando;
      localStorage.setItem(BORRADOR, JSON.stringify(d));
    } catch (e) { /* almacenamiento lleno o bloqueado: no es crítico */ }
  }

  function limpiarBorrador() {
    try { localStorage.removeItem(BORRADOR); } catch (e) {}
  }

  /* ---------- validación y guardado ---------- */

  function marcar(id, malo) {
    const el = $(id);
    if (el) el.classList.toggle('error', !!malo);
    return !malo;
  }

  function validar(d) {
    const faltan = [];
    if (!marcar('f-proyecto', !d.proyecto)) faltan.push('proyecto');
    if (!marcar('f-punto-num', !d.punto)) faltan.push('punto de muestreo');
    if (!marcar('f-muestra', !d.muestra)) faltan.push('código de muestra');
    if (!marcar('f-fecha', !d.fechaISO)) faltan.push('fecha');
    if (!marcar('f-este', !d.este)) faltan.push('UTM Este');
    if (!marcar('f-norte', !d.norte)) faltan.push('UTM Norte');
    return faltan;
  }

  function guardar(ev) {
    if (ev) ev.preventDefault();
    const d = datosDelFormulario();
    const eraEdicion = !!(estado && estado.editando);
    const faltan = validar(d);
    if (faltan.length) {
      GQ.app.aviso('Falta: ' + faltan.join(', '));
      const primero = document.querySelector('.error');
      if (primero) primero.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (d.duplicado === 'Sí' && d.duplicadoDe &&
        d.duplicadoDe.toUpperCase() === d.muestra.toUpperCase()) {
      GQ.app.aviso('Una muestra no puede ser duplicado de sí misma');
      return;
    }

    GQ.db.allSamples().then(function (rows) {
      const choque = rows.filter(function (r) {
        return r.id !== d.id && r.muestra && d.muestra &&
               r.muestra.toUpperCase() === d.muestra.toUpperCase();
      });
      if (choque.length && !confirm('Ya existe una muestra con el código ' + d.muestra +
                                    '.\n¿Guardar de todas formas?')) return null;

      if (!d.createdAt) d.createdAt = Date.now();
      if (!d.hora) {
        const t = new Date();
        d.hora = String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
      }
      return GQ.db.putSample(d).then(function () { return d; });
    }).then(function (d2) {
      if (!d2) return;
      limpiarBorrador();
      ultimaGuardada = d2;
      if (eraEdicion) {
        /* tras corregir una muestra se vuelve a su ficha, no a un formulario en blanco */
        GQ.app.aviso('✓ Cambios guardados en ' + d2.muestra);
        GQ.app.refrescar();
        nuevo({ heredarDe: d2 });
        GQ.list.detalle(d2.id);
        return;
      }
      GQ.app.aviso('✓ ' + d2.muestra + ' guardada');
      GQ.app.refrescar();
      nuevo({ heredarDe: d2 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }).catch(function (e) {
      console.error(e);
      GQ.app.aviso('Error al guardar');
    });
  }

  /* ---------- carga del formulario ---------- */

  function pintar(d) {
    $('f-proyecto').value = d.proyecto || '';
    $('f-sector').value = d.sector || (C.sectores.indexOf(d.sector) >= 0 ? d.sector : $('f-sector').value);
    $('f-punto-num').value = d.puntoNum || (d.punto ? String(d.punto).split('-').slice(1).join('-') : '');
    componerPunto();
    $('f-muestra').value = d.muestra || '';
    $('f-fecha').value = d.fechaISO || hoyISO();
    $('vista-fecha').textContent = fechaTexto($('f-fecha').value) || 'Mes Año';
    $('f-duplicado').value = d.duplicado || 'No';
    $('f-duplicado-de').value = d.duplicadoDe || '';
    $('caja-duplicado').hidden = $('f-duplicado').value !== 'Sí';
    $('f-este').value = d.este != null ? d.este : '';
    $('f-norte').value = d.norte != null ? d.norte : '';
    $('f-altitud').value = (d.altitud != null && !isNaN(d.altitud)) ? d.altitud : '';
    $('f-zona').value = d.zonaUTM || '19S';
    $('f-tipo').value = d.tipoMuestra || ajustes.tipoMuestra || C.tipoMuestra[0];
    $('f-escorrentia').value = d.escorrentia || 'No';
    $('f-color').value = d.color || '';
    $('f-granulometria').value = d.granulometria || '0,5-0,25 mm, arena media';
    $('f-materia').value = d.materiaOrganica || 'No se observa';
    $('f-clastos').value = d.clastos || '';
    $('f-factores').value = d.factores || '';
    $('f-otras').value = d.otras || '';
    $('f-operador').value = d.operador || ajustes.operador || '';

    if (d.lat != null) {
      estadoGPS('Lat ' + Number(d.lat).toFixed(5) + '  Lon ' + Number(d.lon).toFixed(5) +
                (d.precision ? '  ·  ± ' + d.precision + ' m' : ''), 'ok');
    } else if (d.este) {
      estadoGPS('Coordenadas ingresadas a mano.');
    } else {
      estadoGPS('Sin lectura de GPS. También puedes escribir las coordenadas a mano.');
    }
    document.querySelectorAll('.error').forEach(function (el) { el.classList.remove('error'); });
    mostrarDistancia();
    return pintarFotos();
  }

  /* Nueva muestra. heredarDe: repite proyecto/sector/fecha/operador. */
  function nuevo(opts) {
    opts = opts || {};
    const base = opts.heredarDe || ultimaGuardada || {};
    estado = {
      id: GQ.db.uid('m'),
      editando: false,
      lat: null, lon: null, precision: null, origenCoord: null,
      hora: null, createdAt: null
    };
    $('subtitulo').textContent = 'Nueva muestra';
    $('btn-guardar').textContent = 'Guardar muestra';
    $('aviso-borrador').innerHTML = '';

    const d = {
      proyecto: base.proyecto || ajustes.proyecto || '',
      sector: base.sector || ajustes.sector || C.sectores[0],
      fechaISO: base.fechaISO || hoyISO(),
      operador: base.operador || ajustes.operador || '',
      tipoMuestra: base.tipoMuestra || ajustes.tipoMuestra || C.tipoMuestra[0],
      escorrentia: 'No',
      granulometria: '0,5-0,25 mm, arena media',
      materiaOrganica: 'No se observa',
      duplicado: 'No',
      zonaUTM: '19S'
    };
    return pintar(d).then(function () {
      return Promise.all([sugerirCodigo(), sugerirPunto()]);
    }).then(function (r) {
      $('f-muestra').value = r[0];
      $('f-punto-num').value = r[1];
      componerPunto();
      limpiarBorrador();
    });
  }

  /* Copia íntegra de la descripción de la muestra anterior. */
  function copiarAnterior() {
    GQ.db.allSamples().then(function (rows) {
      if (!rows.length) { GQ.app.aviso('Todavía no hay muestras guardadas'); return; }
      const a = rows[0];
      $('f-tipo').value = a.tipoMuestra || $('f-tipo').value;
      $('f-escorrentia').value = a.escorrentia || $('f-escorrentia').value;
      $('f-color').value = a.color || '';
      $('f-granulometria').value = a.granulometria || $('f-granulometria').value;
      $('f-materia').value = a.materiaOrganica || $('f-materia').value;
      $('f-clastos').value = a.clastos || '';
      $('f-factores').value = a.factores || '';
      $('f-otras').value = a.otras || '';
      if (!$('f-proyecto').value) $('f-proyecto').value = a.proyecto || '';
      guardarBorrador();
      GQ.app.aviso('Descripción copiada de ' + (a.muestra || a.punto));
    });
  }

  function editar(id) {
    return GQ.db.getSample(id).then(function (d) {
      if (!d) return;
      estado = {
        id: d.id, editando: true,
        lat: d.lat, lon: d.lon, precision: d.precision,
        origenCoord: d.origenCoord, hora: d.hora, createdAt: d.createdAt
      };
      $('subtitulo').textContent = 'Editando ' + (d.muestra || d.punto);
      $('btn-guardar').textContent = 'Guardar cambios';
      $('aviso-borrador').innerHTML =
        '<div class="nota">Estás editando una muestra ya guardada.</div>';
      return pintar(d);
    });
  }

  function hayBorrador() {
    try {
      const raw = localStorage.getItem(BORRADOR);
      if (!raw) return null;
      const d = JSON.parse(raw);
      const tieneAlgo = d.color || d.clastos || d.este || d.factores || d.otras;
      return tieneAlgo ? d : null;
    } catch (e) { return null; }
  }

  /* ---------- inicio ---------- */

  function init(_ajustes) {
    ajustes = _ajustes || {};

    opciones($('f-sector'), C.sectores, ajustes.sector);
    opciones($('f-tipo'), C.tipoMuestra);
    opciones($('f-escorrentia'), C.escorrentia);
    opciones($('f-granulometria'), C.granulometria);
    opciones($('f-materia'), C.materiaOrganica);
    datalist($('lista-proyectos'), C.proyectos);
    datalist($('lista-colores'), C.colores);

    chips($('chips-color'), C.coloresFrecuentes, function (v) {
      $('f-color').value = v; guardarBorrador();
    });
    chips($('chips-redondeamiento'), C.redondeamiento, function (v) {
      const t = $('f-clastos');
      if (!t.value.trim()) t.value = 'Clastos ' + v + ' de ';
      else agregarTexto(t, v);
      t.focus();
      t.setSelectionRange(t.value.length, t.value.length);
      guardarBorrador();
    });
    chips($('chips-litologias'), C.litologias, function (v) { agregarTexto($('f-clastos'), v); });
    chips($('chips-factores'), C.factores, function (v) { agregarTexto($('f-factores'), v); });
    chips($('chips-observaciones'), C.observaciones, function (v) { agregarTexto($('f-otras'), v); });

    $('f-sector').addEventListener('change', function () {
      componerPunto();
      sugerirCodigo().then(function (c) { $('f-muestra').value = c; });
      sugerirPunto().then(function (n) { if (!$('f-punto-num').value) { $('f-punto-num').value = n; componerPunto(); } });
    });
    $('f-punto-num').addEventListener('input', componerPunto);
    $('f-fecha').addEventListener('change', function () {
      $('vista-fecha').textContent = fechaTexto(this.value) || 'Mes Año';
      guardarBorrador();
    });
    $('f-duplicado').addEventListener('change', function () {
      $('caja-duplicado').hidden = this.value !== 'Sí';
      guardarBorrador();
    });
    $('btn-correlativo').addEventListener('click', function () {
      sugerirCodigo().then(function (c) {
        $('f-muestra').value = c;
        GQ.app.aviso('Código sugerido: ' + c);
      });
    });
    $('btn-gps').addEventListener('click', tomarGPS);
    $('f-este').addEventListener('input', mostrarDistancia);
    $('f-norte').addEventListener('input', mostrarDistancia);

    $('btn-camara').addEventListener('click', function () { $('input-camara').click(); });
    $('btn-galeria').addEventListener('click', function () { $('input-galeria').click(); });
    $('input-camara').addEventListener('change', function () { recibirArchivos(this.files); this.value = ''; });
    $('input-galeria').addEventListener('change', function () { recibirArchivos(this.files); this.value = ''; });

    $('form-muestra').addEventListener('submit', guardar);
    $('form-muestra').addEventListener('input', guardarBorrador);
    $('btn-copiar-anterior').addEventListener('click', copiarAnterior);
    $('btn-descartar').addEventListener('click', function () {
      if (!confirm('¿Descartar lo escrito en este formulario?')) return;
      const id = estado.id;
      GQ.db.photosOf(id).then(function (fs) {
        return Promise.all(fs.map(function (f) { return GQ.db.deletePhoto(f.id); }));
      }).then(function () {
        limpiarBorrador();
        return nuevo();
      }).then(function () { GQ.app.aviso('Formulario limpio'); });
    });

    /* Muestras guardadas: sirven de sugerencia para "duplicado de". */
    GQ.db.allSamples().then(function (rows) {
      ultimaGuardada = rows[0] || null;
      datalist($('lista-muestras'), rows.map(function (r) { return r.muestra; }).filter(Boolean));
    });

    const b = hayBorrador();
    if (b) {
      estado = {
        id: b.id, editando: !!b._editando,
        lat: b.lat, lon: b.lon, precision: b.precision,
        origenCoord: b.origenCoord, hora: b.hora, createdAt: b.createdAt
      };
      $('aviso-borrador').innerHTML =
        '<div class="nota">Se recuperó lo que estabas escribiendo antes de cerrar la app.</div>';
      return pintar(b);
    }
    return nuevo();
  }

  return {
    init: init,
    nuevo: nuevo,
    editar: editar,
    refrescarFotos: pintarFotos,
    fechaTexto: fechaTexto,
    setAjustes: function (a) { ajustes = a; },
    estaEditando: function () { return !!(estado && estado.editando); },
    actualizarSugerencias: function () {
      return GQ.db.allSamples().then(function (rows) {
        ultimaGuardada = rows[0] || null;
        datalist($('lista-muestras'), rows.map(function (r) { return r.muestra; }).filter(Boolean));
      });
    }
  };
})();
