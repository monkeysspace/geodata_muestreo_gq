/* Geodata_edición_muestreo_GQ
 * Catálogos de terreno. Los valores provienen del compilado
 * "Taltal / El Salvador" (1.463 muestras) para que lo anotado en terreno
 * sea idéntico a lo que ya existe en la planilla maestra.
 */
window.GQ = window.GQ || {};

GQ.catalogs = {

  proyectos: ['Hoja Taltal', 'Hoja El Salvador'],

  /* Los prefijos del punto de muestreo los crea el usuario y quedan
     guardados en los ajustes. La app no impone ninguno. */
  sectoresPorOmision: [],

  tipoMuestra: [
    'Compósito de sedimento de corriente',
    'Compósito de sedimento de pampa',
    'Compósito de sedimento de planicie aluvial (pampa)',
    'Compósito de sedimento de lago'
  ],

  escorrentia: ['No', 'Sí', 'Sin información'],

  materiaOrganica: ['No se observa', 'Se observa', 'Sin información'],

  duplicado: ['No', 'Sí'],

  /* Escala de Udden-Wentworth, tal como se usa en la planilla */
  granulometria: [
    '64-16 mm, grava',
    '16-4 mm, gravilla',
    '4-2 mm, sábula',
    '2-1 mm, arena muy gruesa',
    '1-0,5 mm, arena gruesa',
    '0,5-0,25 mm, arena media',
    '0,25-0,125 mm, arena fina',
    '0,125-0,0625 mm, arena muy fina',
    '0,0625-0,004 mm, limo',
    '< 0,004 mm, arcilla',
    'Sin información'
  ],

  /* Los 6 colores más frecuentes se muestran como accesos rápidos */
  coloresFrecuentes: ['Pardo', 'Blanco amarillento', 'Gris', 'Blanco parduzco', 'Pardo anaranjado', 'Pardo amarillento'],

  colores: [
    'Pardo', 'Pardo claro', 'Pardo amarillento', 'Pardo anaranjado', 'Pardo rojizo',
    'Pardo grisáceo', 'Pardo blanquecino', 'Pardo rosáceo', 'Pardo violáceo',
    'Blanco', 'Blanco amarillento', 'Blanco parduzco', 'Blanco rojizo', 'Blanco verdoso',
    'Blanco violáceo', 'Blanco grisáceo',
    'Gris', 'Gris claro', 'Gris parduzco', 'Gris blanquecino', 'Gris violáceo',
    'Gris rojizo', 'Gris amarillento', 'Gris verdoso', 'Gris anaranjado', 'Gris oscuro',
    'Amarillo', 'Amarillo parduzco', 'Amarillo blanquecino', 'Amarillo grisáceo',
    'Violeta parduzco', 'Anaranjado', 'Rojo', 'Verde', 'Negro',
    'Sin información'
  ],

  /* Chips de apoyo para redactar la descripción de clastos sin teclear todo */
  litologias: [
    'granito', 'granodiorita', 'diorita', 'andesita', 'dacita', 'riolita', 'basalto',
    'tobas', 'brecha volcánica', 'arenisca', 'lutita', 'limolita', 'caliza',
    'conglomerado', 'metapelita', 'filita', 'esquisto', 'pizarra', 'cuarcita',
    'cuarzo', 'feldespato', 'biotita', 'hornblenda', 'plagioclasa', 'magnetita',
    'epidota', 'clorita', 'hematita', 'óxidos de Fe', 'vetillas de cuarzo'
  ],

  redondeamiento: ['angulosos', 'subangulosos', 'subredondeados', 'redondeados'],

  /* Chips para factores antropogénicos */
  factores: [
    'Sin observaciones', 'Camino', 'Huella vehicular', 'Vertedero de residuos domiciliarios',
    'Restos de desechos domiciliarios', 'Faena minera', 'Relave', 'Piques / labores antiguas',
    'Escombrera', 'Línea férrea', 'Tendido eléctrico', 'Canal / captación de agua',
    'Viviendas', 'Ganado', 'Cultivos', 'Campamento'
  ],

  /* Chips para otras observaciones */
  observaciones: [
    'Sin observaciones', 'Sedimento seco', 'Sedimento húmedo', 'Quebrada encajonada',
    'Quebrada amplia', 'Cauce activo', 'Afloramiento en las paredes', 'Cobertura eólica',
    'Costra salina', 'Alteración hidrotermal', 'Vetillas de cuarzo', 'Presencia de vegetación'
  ],

  meses: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],

  /* Orden y encabezados EXACTOS de la planilla maestra (columnas A a R).
   * key === null  => columna separadora vacía (G y N en el original). */
  columnas: [
    { key: 'proyecto',        header: 'Proyecto' },
    { key: 'punto',           header: 'Punto de muestreo' },
    { key: 'altitud',         header: 'Altitud   (m s.n.m.)',            num: true },
    { key: 'este',            header: 'UTM_ESTE (Sirgas UTM 19S)',       num: true },
    { key: 'norte',           header: 'UTM_NORTE (Sirgas UTM 19S)',      num: true },
    { key: 'fechaTexto',      header: 'Fecha del muestreo' },
    { key: null,              header: '' },
    { key: 'muestra',         header: 'Muestra' },
    { key: 'duplicado',       header: 'Duplicado de terreno' },
    { key: 'tipoMuestra',     header: 'Tipo de muestra' },
    { key: 'escorrentia',     header: 'Escorrentía en el momento del muestreo' },
    { key: 'color',           header: 'Color' },
    { key: 'granulometria',   header: 'Estimación de granulometria principal' },
    { key: null,              header: '' },
    { key: 'clastos',         header: 'Descripción de clastos' },
    { key: 'materiaOrganica', header: 'Presencia de materia orgánica húmica' },
    { key: 'factores',        header: 'FACTORES ANTROPOGÉNICOS QUE PODRÍAN ALTERAR LA MUESTRA' },
    { key: 'otras',           header: 'OTRAS OBSERVACIONES ' }
  ],

  /* Columnas S a CD del compilado: química de laboratorio. La app no las
     pide en terreno, pero puede dejarlas presentes y vacías para que el
     archivo exportado tenga exactamente la misma forma que el compilado. */
  columnasQuimica: [
    "",
    "CTOTAL \n%",
    " STOTAL\n%",
    "SiO2",
    "Al2O3",
    "Fe2O3",
    "MgO",
    "CaO",
    "Na2O",
    "K2O",
    "TiO2",
    "P2O5",
    "MnO",
    "Cr2O3",
    "LOI",
    "Suma",
    "Sc",
    "Ba",
    "Be",
    "Co",
    "Cs",
    "Ga",
    "Hf",
    "Nb",
    "Rb",
    "Sn",
    "Sr",
    "Ta",
    "V",
    "W",
    "Zr",
    "Y",
    "La",
    "Ce",
    "Pr",
    "Nd",
    "Sm",
    "Eu",
    "Gd",
    "Tb",
    "Dy",
    "Ho",
    "Er",
    "Tm",
    "Yb",
    "Lu",
    "Th",
    "U",
    "Mo",
    "Cu",
    "Pb",
    "Zn",
    "Ni",
    "As",
    "Cd",
    "Sb",
    "Bi",
    "Ag",
    "Au",
    "Hg",
    "Tl",
    "Se",
    "Te ppm",
    "B ppm"
  ],

  /* Segunda hoja: trazabilidad que la planilla original no tiene */
  columnasMeta: [
    { key: 'muestra',    header: 'Muestra' },
    { key: 'punto',      header: 'Punto de muestreo' },
    { key: 'fechaISO',   header: 'Fecha (ISO)' },
    { key: 'hora',       header: 'Hora' },
    { key: 'operador',   header: 'Operador' },
    { key: 'lat',        header: 'Latitud (WGS84)',   num: true },
    { key: 'lon',        header: 'Longitud (WGS84)',  num: true },
    { key: 'precision',  header: 'Precisión GPS (m)', num: true },
    { key: 'zonaUTM',    header: 'Zona UTM' },
    { key: 'origenCoord',header: 'Origen de coordenadas' },
    { key: 'nFotos',     header: 'N° de fotos',       num: true },
    { key: 'fotos',      header: 'Archivos de foto' },
    { key: 'duplicadoDe',header: 'Duplicado de la muestra' },
    { key: 'id',         header: 'ID interno' }
  ]
};
