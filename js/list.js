/* Listado, búsqueda y ficha de detalle de las muestras guardadas. */
window.GQ = window.GQ || {};

GQ.list = (function () {
  const $ = function (id) { return document.getElementById(id); };
  let cache = [];
  let modo = 'dias';           // 'dias' (carpetas por jornada) o 'todas'
  const abiertos = {};         // qué carpetas dejó abiertas el usuario

  function texto(v) { return (v === null || v === undefined || v === '') ? '—' : String(v); }

  function isoDe(fecha) {
    return fecha.getFullYear() + '-' +
           String(fecha.getMonth() + 1).padStart(2, '0') + '-' +
           String(fecha.getDate()).padStart(2, '0');
  }

  /* Día al que pertenece una muestra: la fecha del muestreo si la tiene,
     y si no, el día en que se registró. */
  function diaDe(s) {
    if (s.fechaISO) return s.fechaISO;
    if (s.createdAt) return isoDe(new Date(s.createdAt));
    return 'sin-fecha';
  }

  function etiquetaDia(iso) {
    if (iso === 'sin-fecha') return 'Sin fecha';
    const hoy = new Date();
    const ayer = new Date(hoy.getTime() - 86400000);
    if (iso === isoDe(hoy)) return 'Hoy';
    if (iso === isoDe(ayer)) return 'Ayer';
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d.getTime())) return iso;
    const mismoAno = d.getFullYear() === hoy.getFullYear();
    const opts = { weekday: 'long', day: 'numeric', month: 'long' };
    if (!mismoAno) opts.year = 'numeric';
    const txt = d.toLocaleDateString('es-CL', opts).replace(',', '');
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  /* Segunda línea de la carpeta: cuántas, cuántas con foto y de qué proyectos. */
  function resumenDia(rows) {
    const conFoto = rows.filter(function (r) { return r._fotos > 0; }).length;
    const proyectos = [];
    rows.forEach(function (r) {
      if (r.proyecto && proyectos.indexOf(r.proyecto) < 0) proyectos.push(r.proyecto);
    });
    const partes = [rows.length + ' muestra' + (rows.length === 1 ? '' : 's')];
    if (conFoto) partes.push(conFoto + ' con foto');
    if (proyectos.length === 1) partes.push(proyectos[0]);
    else if (proyectos.length > 1) partes.push(proyectos.length + ' proyectos');
    return partes.join(' · ');
  }

  /* Agrupa por día, del más reciente al más antiguo. */
  function porDia(rows) {
    const mapa = {};
    rows.forEach(function (s) {
      const k = diaDe(s);
      (mapa[k] = mapa[k] || []).push(s);
    });
    return Object.keys(mapa).sort(function (a, b) {
      if (a === 'sin-fecha') return 1;
      if (b === 'sin-fecha') return -1;
      return a < b ? 1 : -1;
    }).map(function (k) {
      return { dia: k, rows: mapa[k] };
    });
  }

  function resumen(rows, destino) {
    const conFoto = rows.filter(function (r) { return r._fotos > 0; }).length;
    const proyectos = {};
    rows.forEach(function (r) { if (r.proyecto) proyectos[r.proyecto] = 1; });
    const hoy = new Date().toDateString();
    const deHoy = rows.filter(function (r) {
      return r.createdAt && new Date(r.createdAt).toDateString() === hoy;
    }).length;
    destino.innerHTML =
      tarjeta(rows.length, 'muestras') +
      tarjeta(deHoy, 'hoy') +
      tarjeta(conFoto, 'con foto') +
      tarjeta(Object.keys(proyectos).length, 'proyectos');
  }

  function tarjeta(valor, rotulo) {
    return '<div class="tarjeta-dato"><div class="valor">' + valor +
           '</div><div class="rotulo">' + rotulo + '</div></div>';
  }

  function cargar() {
    return Promise.all([GQ.db.allSamples(), GQ.db.allPhotos()]).then(function (r) {
      const samples = r[0], photos = r[1];
      const conteo = {};
      photos.forEach(function (p) { conteo[p.sampleId] = (conteo[p.sampleId] || 0) + 1; });
      const primera = {};
      photos.slice().sort(function (a, b) { return a.createdAt - b.createdAt; })
        .forEach(function (p) { if (!primera[p.sampleId]) primera[p.sampleId] = p; });
      samples.forEach(function (s) {
        s._fotos = conteo[s.id] || 0;
        s._miniatura = primera[s.id] || null;
      });
      cache = samples;
      return samples;
    });
  }

  function filtrar() {
    const q = ($('buscar').value || '').trim().toLowerCase();
    const proy = $('filtro-proyecto').value;
    const sec = $('filtro-sector').value;
    return cache.filter(function (s) {
      if (proy && s.proyecto !== proy) return false;
      if (sec && s.sector !== sec) return false;
      if (!q) return true;
      return ['muestra', 'punto', 'proyecto', 'color', 'clastos', 'granulometria',
              'factores', 'otras', 'operador', 'tipoMuestra'].some(function (k) {
        return (s[k] || '').toString().toLowerCase().indexOf(q) >= 0;
      });
    });
  }

  /* Una fila de muestra. Se usa igual en la lista plana y dentro de un día. */
  function crearItem(s) {
    const div = document.createElement('div');
    div.className = 'item';
    div.setAttribute('role', 'button');
    div.tabIndex = 0;

    if (s._miniatura) {
      const img = document.createElement('img');
      img.className = 'mini';
      img.src = GQ.photos.urlDe(s._miniatura);
      img.alt = '';
      img.loading = 'lazy';
      div.appendChild(img);
    } else {
      const d = document.createElement('div');
      d.className = 'mini mini-vacia';
      d.textContent = '🪨';
      div.appendChild(d);
    }

    const datos = document.createElement('div');
    datos.className = 'datos';
    const cod = document.createElement('div');
    cod.className = 'cod';
    cod.textContent = s.muestra || '(sin código)';
    const m1 = document.createElement('div');
    m1.className = 'meta';
    m1.textContent = [s.punto, s.proyecto].filter(Boolean).join(' · ');
    const m2 = document.createElement('div');
    m2.className = 'meta';
    /* Dentro de una carpeta la fecha sobra: la dice el encabezado. */
    m2.textContent = [modo === 'dias' ? s.hora : s.fechaTexto, s.color,
                      s._fotos ? s._fotos + ' 📷' : '']
      .filter(Boolean).join(' · ');
    datos.appendChild(cod); datos.appendChild(m1); datos.appendChild(m2);
    div.appendChild(datos);

    const flecha = document.createElement('span');
    flecha.textContent = '›';
    flecha.style.cssText = 'color:var(--texto-suave);font-size:22px';
    div.appendChild(flecha);

    div.addEventListener('click', function () { detalle(s.id); });
    div.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); detalle(s.id); }
    });
    return div;
  }

  /* Carpeta de una jornada. */
  function crearCarpeta(grupo, abrir) {
    const det = document.createElement('details');
    det.className = 'dia' + (grupo.dia === isoDe(new Date()) ? ' hoy' : '');
    det.open = abrir;

    const sum = document.createElement('summary');
    sum.innerHTML =
      '<span class="carpeta">' + (det.open ? '📂' : '📁') + '</span>' +
      '<span class="rot"><span class="fecha"></span>' +
      '<span class="cuenta"></span></span>' +
      '<span class="insignia"></span><span class="flecha">▾</span>';
    sum.querySelector('.fecha').textContent = etiquetaDia(grupo.dia);
    sum.querySelector('.cuenta').textContent = resumenDia(grupo.rows);
    sum.querySelector('.insignia').textContent = grupo.rows.length;
    det.appendChild(sum);

    const cuerpo = document.createElement('div');
    cuerpo.className = 'contenido';
    grupo.rows.forEach(function (s) { cuerpo.appendChild(crearItem(s)); });
    det.appendChild(cuerpo);

    det.addEventListener('toggle', function () {
      abiertos[grupo.dia] = det.open;
      sum.querySelector('.carpeta').textContent = det.open ? '📂' : '📁';
    });
    return det;
  }

  function pintar() {
    const rows = filtrar();
    const cont = $('listado');
    resumen(cache, $('resumen'));

    document.querySelectorAll('#modo-lista button').forEach(function (b) {
      b.classList.toggle('activo', b.dataset.modo === modo);
    });

    if (!cache.length) {
      cont.innerHTML = '<div class="vacio"><span class="icono">🪨</span>' +
        'Todavía no hay muestras.<br>Toca <b>Nueva</b> para registrar la primera.</div>';
      return;
    }
    if (!rows.length) {
      cont.innerHTML = '<div class="vacio"><span class="icono">🔍</span>' +
        'Ninguna muestra coincide con la búsqueda.</div>';
      return;
    }

    cont.innerHTML = '';

    if (modo !== 'dias') {
      rows.forEach(function (s) { cont.appendChild(crearItem(s)); });
      return;
    }

    const grupos = porDia(rows);
    const buscando = !!($('buscar').value || '').trim();
    grupos.forEach(function (g, i) {
      /* Al buscar se abre todo, para no obligar a ir carpeta por carpeta.
         Si no, se abre la jornada más reciente y se respeta lo que el
         usuario haya abierto o cerrado. */
      const abrir = buscando ? true
        : (abiertos[g.dia] !== undefined ? abiertos[g.dia] : i === 0);
      cont.appendChild(crearCarpeta(g, abrir));
    });
  }

  function fila(rotulo, valor) {
    return '<dt>' + rotulo + '</dt><dd>' + texto(valor).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/\n/g, '<br>') + '</dd>';
  }

  function detalle(id) {
    Promise.all([GQ.db.getSample(id), GQ.db.photosOf(id)]).then(function (r) {
      const s = r[0], fotos = r[1];
      if (!s) return;
      const v = $('vista-detalle');

      let html = '<button type="button" class="btn btn-sec btn-chico" id="volver-lista">‹ Muestras</button>' +
        '<h2 class="titulo" style="margin-top:12px">' + texto(s.muestra) + '</h2>';

      if (fotos.length) {
        html += '<div class="galeria" id="galeria-detalle"></div>';
      }

      html += '<div class="seccion"><div class="cuerpo"><dl class="detalle" style="margin:0">' +
        fila('Proyecto', s.proyecto) +
        fila('Punto de muestreo', s.punto) +
        fila('Fecha del muestreo', s.fechaTexto + (s.hora ? ' · ' + s.hora : '')) +
        fila('Coordenadas', 'E ' + texto(s.este) + '  N ' + texto(s.norte) + '  (' + texto(s.zonaUTM) + ')') +
        fila('Altitud', s.altitud != null && !isNaN(s.altitud) ? s.altitud + ' m s.n.m.' : '—') +
        (s.lat != null ? fila('Lat / Lon (WGS84)', Number(s.lat).toFixed(6) + ', ' + Number(s.lon).toFixed(6) +
          (s.precision ? '  ± ' + s.precision + ' m' : '')) : '') +
        fila('Duplicado de terreno', s.duplicado === 'Sí' ? (s.duplicadoDe || 'Sí') : 'No') +
        fila('Tipo de muestra', s.tipoMuestra) +
        fila('Escorrentía', s.escorrentia) +
        fila('Color', s.color) +
        fila('Granulometría', s.granulometria) +
        fila('Materia orgánica húmica', s.materiaOrganica) +
        fila('Descripción de clastos', s.clastos) +
        fila('Factores antropogénicos', s.factores) +
        fila('Otras observaciones', s.otras) +
        fila('Operador', s.operador) +
        '</dl></div></div>' +
        '<div class="acciones">' +
        '<button type="button" class="btn btn-bloque" id="editar-muestra">Editar</button>' +
        '<button type="button" class="btn btn-peligro btn-bloque" id="borrar-muestra">Eliminar muestra</button>' +
        '</div>';

      v.innerHTML = html;

      if (fotos.length) {
        const g = $('galeria-detalle');
        fotos.forEach(function (f) {
          const d = document.createElement('div');
          d.className = 'foto';
          const img = document.createElement('img');
          img.src = GQ.photos.urlDe(f);
          img.alt = 'Foto de ' + texto(s.muestra);
          d.appendChild(img);
          d.addEventListener('click', function () { window.open(img.src, '_blank'); });
          g.appendChild(d);
        });
      }

      $('volver-lista').addEventListener('click', function () { GQ.app.ir('lista'); });
      $('editar-muestra').addEventListener('click', function () {
        GQ.form.editar(id).then(function () { GQ.app.ir('form'); });
      });
      $('borrar-muestra').addEventListener('click', function () {
        if (!confirm('¿Eliminar ' + texto(s.muestra) + ' y sus fotos?\nEsta acción no se puede deshacer.')) return;
        GQ.db.deleteSample(id).then(function () {
          GQ.app.aviso('Muestra eliminada');
          GQ.app.refrescar();
          GQ.app.ir('lista');
        });
      });

      GQ.app.ir('detalle');
    });
  }

  function poblarFiltros() {
    const proyectos = {}, sectores = {};
    cache.forEach(function (s) {
      if (s.proyecto) proyectos[s.proyecto] = 1;
      if (s.sector) sectores[s.sector] = 1;
    });
    const fp = $('filtro-proyecto'), fs = $('filtro-sector');
    const vp = fp.value, vs = fs.value;
    fp.innerHTML = '<option value="">Todos los proyectos</option>';
    Object.keys(proyectos).sort().forEach(function (p) {
      fp.insertAdjacentHTML('beforeend', '<option>' + p + '</option>');
    });
    fs.innerHTML = '<option value="">Todos los prefijos</option>';
    Object.keys(sectores).sort().forEach(function (p) {
      fs.insertAdjacentHTML('beforeend', '<option>' + p + '</option>');
    });
    fp.value = vp; fs.value = vs;
  }

  function init() {
    document.querySelectorAll('#modo-lista button').forEach(function (b) {
      b.addEventListener('click', function () {
        if (modo === b.dataset.modo) return;
        modo = b.dataset.modo;
        GQ.db.setSetting('modoLista', modo);
        pintar();
      });
    });
    $('buscar').addEventListener('input', pintar);
    $('filtro-proyecto').addEventListener('change', pintar);
    $('filtro-sector').addEventListener('change', pintar);
    return GQ.db.getSetting('modoLista', 'dias').then(function (m) {
      modo = (m === 'todas') ? 'todas' : 'dias';
      return refrescar();
    });
  }

  function refrescar() {
    return cargar().then(function () { poblarFiltros(); pintar(); return cache; });
  }

  return { init: init, refrescar: refrescar, detalle: detalle, datos: function () { return cache; } };
})();
