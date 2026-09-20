/* Exportación: Excel con el formato del compilado, CSV, paquete con fotos,
 * KML y respaldo. Todo se genera dentro del teléfono. */
window.GQ = window.GQ || {};

GQ.exportar = (function () {
  const C = GQ.catalogs;

  function descargar(blob, nombre) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  /* Lee los dos selectores de la pantalla Exportar. */
  function opcionesExport() {
    const sp = document.getElementById('exp-proyecto');
    const sf = document.getElementById('exp-completo');
    return {
      proyecto: sp ? sp.value : '',
      completo: sf ? sf.value === 'completo' : false
    };
  }

  /* Trozo de nombre de archivo con el proyecto, si se filtró por uno. */
  function etiquetaProyecto(proyecto) {
    if (!proyecto) return '';
    return '_' + proyecto.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]+/g, '_')
                         .replace(/^_+|_+$/g, '');
  }

  function marca() {
    const d = new Date();
    return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') +
           String(d.getDate()).padStart(2, '0') + '_' +
           String(d.getHours()).padStart(2, '0') + String(d.getMinutes()).padStart(2, '0');
  }

  /* En la planilla original la columna "Duplicado de terreno" trae "No"
     o el código de la muestra de la que se duplicó. */
  function valorDuplicado(s) {
    if (s.duplicado !== 'Sí') return 'No';
    return s.duplicadoDe || 'Sí';
  }

  function valorCelda(s, col) {
    if (!col.key) return null;
    if (col.key === 'duplicado') return valorDuplicado(s);
    let v = s[col.key];
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'number' && !isFinite(v)) return null;
    if (col.num) {
      const n = Number(v);
      return isFinite(n) ? n : String(v);
    }
    return String(v);
  }

  function ordenarParaExportar(rows) {
    return rows.slice().sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
  }

  /* ---------- Excel ---------- */

  function hojas(rows, conteoFotos, nombresFotos, completo) {
    /* Formato completo: las columnas S a CD del compilado quedan presentes
       y vacías, a la espera de los resultados del laboratorio. */
    const quimica = completo ? C.columnasQuimica : [];
    const muestras = {
      name: 'Muestras',
      headers: C.columnas.map(function (c) { return c.header; })
                         .concat(quimica),
      widths: [17, 15, 11, 13, 14, 14, 3, 17, 16, 26, 16, 17, 20, 3, 44, 18, 34, 40]
                .concat(quimica.map(function () { return 10; })),
      rows: rows.map(function (s) {
        return C.columnas.map(function (c) { return valorCelda(s, c); })
                         .concat(quimica.map(function () { return null; }));
      })
    };
    const meta = {
      name: 'Metadatos',
      headers: C.columnasMeta.map(function (c) { return c.header; }),
      widths: [17, 14, 12, 8, 16, 13, 13, 13, 9, 18, 9, 30, 17, 22],
      rows: rows.map(function (s) {
        const extra = {
          nFotos: conteoFotos[s.id] || 0,
          fotos: (nombresFotos[s.id] || []).join(', ')
        };
        return C.columnasMeta.map(function (c) {
          const v = (c.key in extra) ? extra[c.key] : s[c.key];
          if (v === undefined || v === null || v === '') return null;
          if (typeof v === 'number' && !isFinite(v)) return null;
          if (c.num) { const n = Number(v); return isFinite(n) ? n : String(v); }
          return String(v);
        });
      })
    };
    return [muestras, meta];
  }

  function datosCompletos() {
    const op = opcionesExport();
    return Promise.all([GQ.db.allSamples(), GQ.db.allPhotos()]).then(function (r) {
      let rows = ordenarParaExportar(r[0]);
      if (op.proyecto) {
        rows = rows.filter(function (s) { return s.proyecto === op.proyecto; });
      }
      const fotos = r[1];
      const porMuestra = {};
      fotos.slice().sort(function (a, b) { return a.createdAt - b.createdAt; })
        .forEach(function (f) {
          (porMuestra[f.sampleId] = porMuestra[f.sampleId] || []).push(f);
        });
      const conteo = {}, nombres = {};
      rows.forEach(function (s) {
        const fs = porMuestra[s.id] || [];
        conteo[s.id] = fs.length;
        nombres[s.id] = fs.map(function (f, i) { return GQ.photos.nombreArchivo(s, i); });
      });
      return { rows: rows, porMuestra: porMuestra, conteo: conteo, nombres: nombres,
               proyecto: op.proyecto, completo: op.completo };
    });
  }

  function aExcel() {
    return datosCompletos().then(function (d) {
      if (!d.rows.length) { GQ.app.aviso('No hay muestras que exportar'); return; }
      const blob = GQ.xlsx.build(hojas(d.rows, d.conteo, d.nombres, d.completo));
      descargar(blob, 'Muestreo_GQ' + etiquetaProyecto(d.proyecto) + '_' + marca() + '.xlsx');
      GQ.app.aviso('Excel generado: ' + d.rows.length + ' muestras' +
                   (d.proyecto ? ' de ' + d.proyecto : ''));
    });
  }

  /* ---------- CSV ---------- */

  function csvTexto(rows, conteo, nombres) {
    const sep = ';';
    function celda(v) {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    const cols = C.columnas.concat([
      { key: 'lat', header: 'Latitud (WGS84)' },
      { key: 'lon', header: 'Longitud (WGS84)' },
      { key: 'precision', header: 'Precisión GPS (m)' },
      { key: 'operador', header: 'Operador' },
      { key: '_fotos', header: 'Archivos de foto' }
    ]);
    const lineas = [cols.map(function (c) { return celda(c.header); }).join(sep)];
    rows.forEach(function (s) {
      lineas.push(cols.map(function (c) {
        if (c.key === '_fotos') return celda((nombres[s.id] || []).join(' | '));
        return celda(valorCelda(s, c));
      }).join(sep));
    });
    return '﻿' + lineas.join('\r\n');
  }

  function aCSV() {
    return datosCompletos().then(function (d) {
      if (!d.rows.length) { GQ.app.aviso('No hay muestras que exportar'); return; }
      const blob = new Blob([csvTexto(d.rows, d.conteo, d.nombres)],
                            { type: 'text/csv;charset=utf-8' });
      descargar(blob, 'Muestreo_GQ' + etiquetaProyecto(d.proyecto) + '_' + marca() + '.csv');
      GQ.app.aviso('CSV generado');
    });
  }

  /* ---------- Paquete: Excel + fotos ---------- */

  function aZIP() {
    GQ.app.aviso('Armando el paquete…');
    return datosCompletos().then(function (d) {
      if (!d.rows.length) { GQ.app.aviso('No hay muestras que exportar'); return; }
      const archivos = [];
      const base = 'Muestreo_GQ' + etiquetaProyecto(d.proyecto) + '_' + marca();
      const xlsxBlob = GQ.xlsx.build(hojas(d.rows, d.conteo, d.nombres, d.completo));

      return xlsxBlob.arrayBuffer().then(function (ab) {
        archivos.push({ name: base + '.xlsx', data: new Uint8Array(ab) });
        archivos.push({ name: base + '.csv',
                        data: csvTexto(d.rows, d.conteo, d.nombres) });
        archivos.push({ name: 'puntos.kml', data: kmlTexto(d.rows) });
        archivos.push({ name: 'LEEME.txt', data: leeme(d.rows.length, d.proyecto, d.completo) });

        let cadena = Promise.resolve();
        d.rows.forEach(function (s) {
          (d.porMuestra[s.id] || []).forEach(function (f, i) {
            cadena = cadena.then(function () {
              return f.blob.arrayBuffer().then(function (buf) {
                archivos.push({
                  name: 'fotos/' + GQ.photos.nombreArchivo(s, i),
                  data: new Uint8Array(buf)
                });
              });
            });
          });
        });
        return cadena;
      }).then(function () {
        descargar(GQ.zip.build(archivos), base + '.zip');
        GQ.app.aviso('Paquete listo: ' + d.rows.length + ' muestras');
      });
    });
  }

  function leeme(n, proyecto, completo) {
    return 'Geodata_edición_muestreo_GQ\r\n' +
      '===========================\r\n\r\n' +
      'Exportado el ' + new Date().toLocaleString('es-CL') + '\r\n' +
      'Proyecto: ' + (proyecto || 'todos') + '\r\n' +
      'Muestras incluidas: ' + n + '\r\n' +
      'Formato: ' + (completo ? 'compilado completo (A-CD, química vacía)'
                              : 'columnas de terreno (A-R)') + '\r\n\r\n' +
      'Contenido del paquete\r\n' +
      '  .xlsx      Hoja "Muestras" con las columnas A-R del compilado\r\n' +
      '             (Proyecto ... OTRAS OBSERVACIONES) y hoja "Metadatos"\r\n' +
      '             con la trazabilidad de terreno (lat/lon, precisión GPS,\r\n' +
      '             hora, operador y nombres de las fotos).\r\n' +
      '  .csv       Los mismos datos separados por punto y coma.\r\n' +
      '  puntos.kml Para abrir los puntos en Google Earth o QGIS.\r\n' +
      '  fotos/     Una carpeta por todas las fotos, nombradas con el\r\n' +
      '             código de la muestra (p. ej. GQ-25-CR-001_01.jpg).\r\n\r\n' +
      'Para sumar estos datos al compilado maestro, copie las filas de la\r\n' +
      'hoja "Muestras" bajo la última fila existente: el orden y los\r\n' +
      'encabezados de las columnas A a R son los mismos. Las columnas de\r\n' +
      'química (CTOTAL en adelante) quedan vacías a la espera del laboratorio.\r\n';
  }

  /* ---------- KML ---------- */

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function kmlTexto(rows) {
    const marcas = rows.map(function (s) {
      let lat = s.lat, lon = s.lon;
      if ((lat === null || lat === undefined) && s.este && s.norte) {
        const zona = parseInt((s.zonaUTM || '19S'), 10) || 19;
        const sur = /S$/i.test(s.zonaUTM || 'S');
        const ll = GQ.geo.fromUTM(s.este, s.norte, zona, sur);
        lat = ll.lat; lon = ll.lon;
      }
      if (lat === null || lat === undefined) return '';
      const desc = [
        ['Proyecto', s.proyecto], ['Punto', s.punto], ['Fecha', s.fechaTexto],
        ['Tipo', s.tipoMuestra], ['Color', s.color], ['Granulometría', s.granulometria],
        ['Clastos', s.clastos], ['Factores antropogénicos', s.factores],
        ['Otras observaciones', s.otras], ['Altitud', s.altitud]
      ].filter(function (p) { return p[1]; })
       .map(function (p) { return '<b>' + esc(p[0]) + ':</b> ' + esc(p[1]); }).join('<br/>');
      return '<Placemark><name>' + esc(s.muestra || s.punto) + '</name>' +
             '<description><![CDATA[' + desc + ']]></description>' +
             '<Point><coordinates>' + lon.toFixed(6) + ',' + lat.toFixed(6) + ',' +
             (isFinite(s.altitud) ? s.altitud : 0) + '</coordinates></Point></Placemark>';
    }).join('');

    return '<?xml version="1.0" encoding="UTF-8"?>' +
      '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>' +
      '<name>Muestreo GQ</name>' + marcas + '</Document></kml>';
  }

  function aKML() {
    return datosCompletos().then(function (d) {
      if (!d.rows.length) { GQ.app.aviso('No hay muestras que exportar'); return; }
      descargar(new Blob([kmlTexto(d.rows)],
                { type: 'application/vnd.google-earth.kml+xml' }),
                'Muestreo_GQ' + etiquetaProyecto(d.proyecto) + '_' + marca() + '.kml');
      GQ.app.aviso('KML generado');
    });
  }

  /* ---------- Respaldo ---------- */

  function respaldar() {
    return Promise.all([GQ.db.allSamples(), GQ.db.allSettings()]).then(function (r) {
      if (!r[0].length) { GQ.app.aviso('No hay muestras que respaldar'); return; }
      const obj = {
        app: 'Geodata_edición_muestreo_GQ',
        version: 1,
        exportado: new Date().toISOString(),
        ajustes: r[1],
        muestras: r[0]
      };
      descargar(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }),
                'Respaldo_GQ_' + marca() + '.json');
      GQ.app.aviso('Respaldo guardado');
    });
  }

  function restaurar(file) {
    return file.text().then(function (txt) {
      const obj = JSON.parse(txt);
      if (!obj || !Array.isArray(obj.muestras)) throw new Error('formato');
      if (!confirm('El respaldo trae ' + obj.muestras.length +
                   ' muestra(s).\nSe agregarán a las que ya tienes. ¿Continuar?')) return;
      return GQ.db.allSamples().then(function (actuales) {
        const ids = {};
        actuales.forEach(function (a) { ids[a.id] = 1; });
        let nuevas = 0;
        let cadena = Promise.resolve();
        obj.muestras.forEach(function (m) {
          if (ids[m.id]) return;
          nuevas++;
          cadena = cadena.then(function () { return GQ.db.putSample(m); });
        });
        return cadena.then(function () {
          GQ.app.aviso(nuevas + ' muestra(s) restauradas');
          GQ.app.refrescar();
        });
      });
    }).catch(function (e) {
      console.error(e);
      GQ.app.aviso('El archivo no es un respaldo válido');
    });
  }

  return {
    aExcel: aExcel, aCSV: aCSV, aZIP: aZIP, aKML: aKML,
    respaldar: respaldar, restaurar: restaurar,
    csvTexto: csvTexto, kmlTexto: kmlTexto, hojas: hojas, descargar: descargar
  };
})();
