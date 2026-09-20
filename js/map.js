/* Croquis de los puntos en coordenadas UTM, dibujado en el propio teléfono.
 * No descarga cartografía: sirve para ver la distribución del muestreo y
 * detectar de un vistazo un punto mal tecleado. */
window.GQ = window.GQ || {};

GQ.map = (function () {
  let canvas, ctx, puntos = [], vista = null;

  function color(nombre) {
    const s = getComputedStyle(document.documentElement).getPropertyValue(nombre);
    return (s || '').trim() || '#000';
  }

  function ajustarTamano() {
    const dpr = window.devicePixelRatio || 1;
    const r = canvas.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w: r.width, h: r.height };
  }

  function calcularVista(w, h) {
    const es = puntos.map(function (p) { return p.este; });
    const ns = puntos.map(function (p) { return p.norte; });
    let minE = Math.min.apply(null, es), maxE = Math.max.apply(null, es);
    let minN = Math.min.apply(null, ns), maxN = Math.max.apply(null, ns);
    let anchoM = maxE - minE, altoM = maxN - minN;
    if (anchoM < 200) { const c = (minE + maxE) / 2; minE = c - 100; maxE = c + 100; anchoM = 200; }
    if (altoM < 200) { const c = (minN + maxN) / 2; minN = c - 100; maxN = c + 100; altoM = 200; }
    const margen = 34;
    const escala = Math.min((w - margen * 2) / anchoM, (h - margen * 2) / altoM);
    return {
      minE: minE, maxE: maxE, minN: minN, maxN: maxN,
      escala: escala,
      offX: (w - anchoM * escala) / 2,
      offY: (h - altoM * escala) / 2
    };
  }

  function aPantalla(p, v, h) {
    return {
      x: v.offX + (p.este - v.minE) * v.escala,
      y: h - (v.offY + (p.norte - v.minN) * v.escala)
    };
  }

  function dibujar() {
    const dim = ajustarTamano();
    const w = dim.w, h = dim.h;
    ctx.clearRect(0, 0, w, h);

    const cTexto = color('--texto-suave');
    const cVerde = color('--verde');
    const cBorde = color('--borde');

    if (!puntos.length) {
      ctx.fillStyle = cTexto;
      ctx.font = '14px ' + color('--fuente');
      ctx.textAlign = 'center';
      ctx.fillText('Sin puntos con coordenadas todavía.', w / 2, h / 2);
      document.getElementById('mapa-info').textContent = '';
      return;
    }

    vista = calcularVista(w, h);

    /* cuadrícula de referencia */
    ctx.strokeStyle = cBorde;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    for (let i = 0; i <= 4; i++) {
      const y = (h / 4) * i, x = (w / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    ctx.setLineDash([]);

    /* trazo del recorrido en orden cronológico */
    const orden = puntos.slice().sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
    ctx.strokeStyle = cBorde;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    orden.forEach(function (p, i) {
      const s = aPantalla(p, vista, h);
      if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();

    /* puntos */
    puntos.forEach(function (p) {
      const s = aPantalla(p, vista, h);
      p._x = s.x; p._y = s.y;
      ctx.beginPath();
      ctx.arc(s.x, s.y, p._sel ? 9 : 6, 0, Math.PI * 2);
      ctx.fillStyle = p.fotos ? cVerde : color('--ambar');
      ctx.fill();
      ctx.strokeStyle = color('--panel');
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    /* etiqueta del punto seleccionado */
    const sel = puntos.filter(function (p) { return p._sel; })[0];
    if (sel) {
      const etq = sel.muestra || sel.punto;
      ctx.font = '600 12px ' + color('--fuente');
      const an = ctx.measureText(etq).width + 14;
      let ex = Math.min(Math.max(sel._x - an / 2, 4), w - an - 4);
      let ey = sel._y - 30;
      if (ey < 4) ey = sel._y + 12;
      ctx.fillStyle = color('--texto');
      ctx.globalAlpha = .92;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(ex, ey, an, 22, 6); else ctx.rect(ex, ey, an, 22);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = color('--fondo');
      ctx.textAlign = 'center';
      ctx.fillText(etq, ex + an / 2, ey + 15);
    }

    /* escala gráfica */
    const metrosBarra = escalaBonita(80 / vista.escala);
    const pxBarra = metrosBarra * vista.escala;
    ctx.strokeStyle = cTexto; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, h - 14); ctx.lineTo(12 + pxBarra, h - 14);
    ctx.moveTo(12, h - 18); ctx.lineTo(12, h - 10);
    ctx.moveTo(12 + pxBarra, h - 18); ctx.lineTo(12 + pxBarra, h - 10);
    ctx.stroke();
    ctx.fillStyle = cTexto;
    ctx.font = '11px ' + color('--fuente');
    ctx.textAlign = 'left';
    ctx.fillText(metrosBarra >= 1000 ? (metrosBarra / 1000) + ' km' : metrosBarra + ' m', 12, h - 20);

    const ext = Math.round(Math.max(vista.maxE - vista.minE, vista.maxN - vista.minN));
    document.getElementById('mapa-info').innerHTML =
      puntos.length + ' punto(s) · extensión ≈ ' +
      (ext >= 1000 ? (ext / 1000).toFixed(1) + ' km' : ext + ' m') +
      ' · verde = con foto · toca un punto para ver su código.';
  }

  function escalaBonita(m) {
    const pasos = [10, 25, 50, 100, 250, 500, 1000, 2000, 5000, 10000, 20000, 50000];
    for (let i = 0; i < pasos.length; i++) if (m <= pasos[i]) return pasos[i];
    return 100000;
  }

  function alTocar(ev) {
    if (!puntos.length || !vista) return;
    const r = canvas.getBoundingClientRect();
    const t = ev.touches ? ev.touches[0] : ev;
    const x = t.clientX - r.left, y = t.clientY - r.top;
    let mejor = null, dmin = 1e9;
    puntos.forEach(function (p) {
      const d = Math.hypot(p._x - x, p._y - y);
      if (d < dmin) { dmin = d; mejor = p; }
    });
    puntos.forEach(function (p) { p._sel = false; });
    if (mejor && dmin < 28) {
      mejor._sel = true;
      canvas.dataset.sel = mejor.id;
    } else {
      delete canvas.dataset.sel;
    }
    dibujar();
  }

  function init() {
    canvas = document.getElementById('croquis');
    ctx = canvas.getContext('2d');
    canvas.addEventListener('click', alTocar);
    canvas.addEventListener('dblclick', function () {
      const id = canvas.dataset.sel;
      if (id) GQ.list.detalle(id);
    });
    window.addEventListener('resize', function () { if (!document.getElementById('vista-mapa').hidden) dibujar(); });
  }

  function refrescar() {
    return GQ.list.refrescar().then(function (rows) {
      puntos = rows.filter(function (s) {
        return isFinite(s.este) && isFinite(s.norte) && s.este && s.norte;
      }).map(function (s) {
        return {
          id: s.id, este: s.este, norte: s.norte,
          muestra: s.muestra, punto: s.punto,
          fotos: s._fotos, createdAt: s.createdAt
        };
      });
      dibujar();
    });
  }

  return { init: init, refrescar: refrescar, dibujar: dibujar };
})();
