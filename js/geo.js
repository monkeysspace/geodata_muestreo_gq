/* GPS y conversión geodésica.
 * SIRGAS usa el elipsoide GRS80, equivalente a WGS84 a nivel de milímetros,
 * por lo que las coordenadas del GPS del teléfono se pueden expresar
 * directamente como "Sirgas UTM 19S" con la precisión propia del equipo. */
window.GQ = window.GQ || {};

GQ.geo = (function () {
  const A = 6378137.0;            // semieje mayor WGS84 / GRS80
  const F = 1 / 298.257223563;    // achatamiento
  const K0 = 0.9996;
  const E2 = F * (2 - F);
  const EP2 = E2 / (1 - E2);
  const rad = Math.PI / 180;

  /* WGS84 -> UTM (Snyder, serie hasta 6.º orden). */
  function toUTM(lat, lon, forceZone) {
    const zone = forceZone || Math.max(1, Math.min(60, Math.floor((lon + 180) / 6) + 1));
    const lon0 = (zone - 1) * 6 - 180 + 3;
    const phi = lat * rad;
    const lam = (lon - lon0) * rad;

    const N = A / Math.sqrt(1 - E2 * Math.sin(phi) * Math.sin(phi));
    const T = Math.tan(phi) * Math.tan(phi);
    const C = EP2 * Math.cos(phi) * Math.cos(phi);
    const Aa = Math.cos(phi) * lam;

    const M = A * (
      (1 - E2 / 4 - 3 * E2 * E2 / 64 - 5 * E2 * E2 * E2 / 256) * phi -
      (3 * E2 / 8 + 3 * E2 * E2 / 32 + 45 * E2 * E2 * E2 / 1024) * Math.sin(2 * phi) +
      (15 * E2 * E2 / 256 + 45 * E2 * E2 * E2 / 1024) * Math.sin(4 * phi) -
      (35 * E2 * E2 * E2 / 3072) * Math.sin(6 * phi)
    );

    let easting = K0 * N * (
      Aa + (1 - T + C) * Math.pow(Aa, 3) / 6 +
      (5 - 18 * T + T * T + 72 * C - 58 * EP2) * Math.pow(Aa, 5) / 120
    ) + 500000.0;

    let northing = K0 * (M + N * Math.tan(phi) * (
      Aa * Aa / 2 + (5 - T + 9 * C + 4 * C * C) * Math.pow(Aa, 4) / 24 +
      (61 - 58 * T + T * T + 600 * C - 330 * EP2) * Math.pow(Aa, 6) / 720
    ));

    const south = lat < 0;
    if (south) northing += 10000000.0;

    return {
      este: Math.round(easting),
      norte: Math.round(northing),
      zona: zone + (south ? 'S' : 'N'),
      zonaNum: zone,
      hemisferio: south ? 'S' : 'N'
    };
  }

  /* UTM -> WGS84 (para dibujar el croquis y para validar datos tecleados). */
  function fromUTM(este, norte, zonaNum, south) {
    const x = este - 500000.0;
    const y = south ? norte - 10000000.0 : norte;
    const lon0 = (zonaNum - 1) * 6 - 180 + 3;

    const M = y / K0;
    const mu = M / (A * (1 - E2 / 4 - 3 * E2 * E2 / 64 - 5 * E2 * E2 * E2 / 256));
    const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));

    const phi1 = mu +
      (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32) * Math.sin(2 * mu) +
      (21 * e1 * e1 / 16 - 55 * Math.pow(e1, 4) / 32) * Math.sin(4 * mu) +
      (151 * Math.pow(e1, 3) / 96) * Math.sin(6 * mu) +
      (1097 * Math.pow(e1, 4) / 512) * Math.sin(8 * mu);

    const C1 = EP2 * Math.pow(Math.cos(phi1), 2);
    const T1 = Math.pow(Math.tan(phi1), 2);
    const N1 = A / Math.sqrt(1 - E2 * Math.pow(Math.sin(phi1), 2));
    const R1 = A * (1 - E2) / Math.pow(1 - E2 * Math.pow(Math.sin(phi1), 2), 1.5);
    const D = x / (N1 * K0);

    const lat = phi1 - (N1 * Math.tan(phi1) / R1) * (
      D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * Math.pow(D, 4) / 24 +
      (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * Math.pow(D, 6) / 720
    );
    const lon = lon0 + (
      D - (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6 +
      (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * Math.pow(D, 5) / 120
    ) / Math.cos(phi1) / rad;

    return { lat: lat / rad, lon: lon };
  }

  /* Una lectura de GPS. Devuelve además la conversión UTM lista para el formulario. */
  function locate(opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      if (!navigator.geolocation) {
        reject(new Error('Este dispositivo no entrega posición GPS.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(function (pos) {
        const c = pos.coords;
        const utm = toUTM(c.latitude, c.longitude);
        resolve({
          lat: c.latitude,
          lon: c.longitude,
          precision: c.accuracy != null ? Math.round(c.accuracy) : null,
          altitud: c.altitude != null ? Math.round(c.altitude) : null,
          altPrecision: c.altitudeAccuracy != null ? Math.round(c.altitudeAccuracy) : null,
          este: utm.este,
          norte: utm.norte,
          zonaUTM: utm.zona,
          timestamp: pos.timestamp
        });
      }, function (err) {
        const msg = {
          1: 'Permiso de ubicación denegado. Actívalo en los ajustes del navegador.',
          2: 'Sin señal GPS. Sal a cielo abierto y vuelve a intentar.',
          3: 'El GPS tardó demasiado. Intenta de nuevo.'
        }[err.code] || 'No se pudo obtener la posición.';
        reject(new Error(msg));
      }, {
        enableHighAccuracy: opts.highAccuracy !== false,
        timeout: opts.timeout || 20000,
        maximumAge: 0
      });
    });
  }

  /* Distancia aproximada en metros entre dos pares UTM de la misma zona. */
  function distUTM(a, b) {
    const dx = a.este - b.este, dy = a.norte - b.norte;
    return Math.round(Math.sqrt(dx * dx + dy * dy));
  }

  return { toUTM: toUTM, fromUTM: fromUTM, locate: locate, distUTM: distUTM };
})();
