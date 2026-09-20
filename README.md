# Geodata_edición_muestreo_GQ

Aplicación móvil para **registrar muestras de sedimento en terreno** sin papel y
sin tener que traspasar después los datos a Excel a mano.

Funciona **sin conexión**, guarda todo **dentro del teléfono** y permite **adjuntar
fotografías** a cada muestra. Al volver de terreno exporta un `.xlsx` con las
mismas columnas del compilado *Taltal / El Salvador*, listo para pegar bajo la
última fila de la planilla maestra.

---

## Qué registra

Los campos son exactamente los de las columnas **A a R** de la planilla maestra:

| Campo | Cómo se ingresa |
|---|---|
| Proyecto | Lista (Hoja Taltal / Hoja El Salvador) o texto libre |
| Punto de muestreo | Prefijo propio + número → `QDA-478` |
| Muestra | Correlativo sugerido: `GQ-26-QDA-001` |
| Altitud (m s.n.m.) | Del GPS o a mano |
| UTM Este / Norte (Sirgas UTM 19S) | Del GPS o a mano |
| Fecha del muestreo | Calendario; se exporta como «Septiembre 2026» |
| Duplicado de terreno | No / código de la muestra original |
| Tipo de muestra | Los 4 tipos del compilado, más los que agregue el usuario |
| Escorrentía | Sí / No / Sin información |
| Color | Lista de 36 colores + accesos rápidos a los 6 más usados |
| Granulometría principal | Escala de Udden-Wentworth completa |
| Descripción de clastos | Texto + botones de redondeamiento y litologías |
| Materia orgánica húmica | No se observa / Se observa / Sin información |
| Factores antropogénicos | Texto + botones frecuentes |
| Otras observaciones | Texto + botones frecuentes |

Las columnas de química (CTOTAL, SiO2, Cu, Au…) **no** se piden en terreno: se
exportan vacías, a la espera del laboratorio.

## Además de la planilla

- **GPS con conversión a UTM.** Un botón toma la posición y la convierte a
  Sirgas UTM 19S. Avisa si la precisión es peor que el umbral configurado.
- **Prefijos propios.** Los códigos de punto (`QDA`, `RIO`, …) los crea el
  usuario desde el formulario o desde Ajustes; la app no impone ninguno.
- **Tipos de muestra propios**, que se suman a los cuatro del compilado y
  quedan guardados para las próximas fichas.
- **Correlativo automático** de muestra y de punto, por prefijo y por año.
- **«Copiar datos de la muestra anterior»**, para quebradas donde la
  descripción se repite casi igual.
- **Carpetas por jornada.** El listado agrupa las muestras por día de
  muestreo («Hoy», «Ayer», «Viernes 18 de septiembre»), con la cuenta y los
  proyectos de cada jornada; la más reciente viene abierta. El botón
  «Todas» vuelve a la lista corrida, y la elección se recuerda.
- **Croquis** de los puntos, dibujado con los datos del teléfono (sin mapas en
  línea), útil para detectar una coordenada mal tecleada.
- **Distancia a la muestra anterior**, como control de espaciamiento.
- **Aviso de código repetido** antes de guardar.
- **Borrador automático**: si se cierra la app a media ficha, no se pierde nada.
- **Hoja «Metadatos»** en el Excel con lat/lon, precisión del GPS, hora,
  operador y el nombre de los archivos de foto de cada muestra.
- **Exportación a KML** para abrir los puntos en Google Earth o QGIS.
- **Envío directo desde el teléfono.** Cualquier exportación se puede mandar
  por WhatsApp, correo o Drive sin cable ni paso intermedio; en los equipos
  que no ofrecen ese menú, el archivo se descarga como siempre.

## Formas de exportar

Antes de exportar se elige **qué** (todas las muestras o un solo proyecto),
**a dónde va el archivo** (compartir por WhatsApp, correo o Drive con el menú
del propio teléfono, o guardarlo en descargas) y en **qué formato**: solo las columnas de terreno (A–R) o el compilado completo
(A–CD, con las columnas de química presentes y vacías a la espera del
laboratorio).

| Botón | Entrega |
|---|---|
| Excel (.xlsx) | Hoja `Muestras` (A–R, o A–CD en formato completo) + hoja `Metadatos` |
| CSV | Lo mismo separado por punto y coma, con BOM para que Excel respete las tildes |
| Paquete completo (.zip) | Excel + CSV + KML + carpeta `fotos/` con los archivos nombrados `GQ-26-CR-001_01.jpg` |
| KML | Puntos para Google Earth / QGIS |
| Respaldo (.json) | Copia de seguridad de los datos (sin fotos) que se puede volver a cargar |

---

## Instalación en el teléfono

Es una PWA: no necesita tienda de aplicaciones.

1. Publicar la carpeta `geodata_muestreo_gq/` en cualquier servidor **HTTPS**
   (GitHub Pages sirve y es gratis).
2. Abrir esa dirección en el teléfono con Chrome (Android) o Safari (iPhone).
3. Menú del navegador → **«Agregar a pantalla de inicio»**.
4. Abrirla una vez con señal: ahí queda guardada completa y desde entonces
   arranca sin conexión.

### Probarla en un computador

```bash
cd geodata_muestreo_gq
python3 -m http.server 8099
# abrir http://localhost:8099
```

El service worker (lo que permite el uso sin conexión) requiere `https://` o
`localhost`; desde `file://` la app igual funciona, pero sin ese respaldo.

---

## Dónde viven los datos

En el **IndexedDB del navegador del teléfono**: nada sale a internet, no hay
cuentas ni servidores. Como contrapartida, si se desinstala la app o se borran
los datos del navegador, se pierden. Conviene exportar al final de cada jornada.

## Estructura

```
geodata_muestreo_gq/
├── index.html              Pantallas de la app
├── manifest.webmanifest    Datos de instalación (PWA)
├── sw.js                   Service worker: la app sin conexión
├── css/styles.css
├── icons/
└── js/
    ├── catalogs.js   Catálogos tomados del compilado (colores, granulometría…)
    ├── db.js         Almacenamiento local (IndexedDB)
    ├── geo.js        GPS y conversión WGS84 ↔ UTM
    ├── photos.js     Cámara, reducción de tamaño y galería
    ├── form.js       Formulario de muestra
    ├── list.js       Listado, búsqueda y ficha
    ├── map.js        Croquis de puntos
    ├── zip.js        Empaquetador ZIP (sin librerías externas)
    ├── xlsx.js       Generador de Excel (sin librerías externas)
    ├── export.js     Excel, CSV, ZIP, KML y respaldo
    └── app.js        Navegación y ajustes
```

Sin dependencias ni compilación: son archivos estáticos.
