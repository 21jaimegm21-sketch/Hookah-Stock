# Mi Stock · Night Chill Zone

Aplicación web progresiva (PWA) para gestionar el inventario de Night Chill Zone.

## Contenido del paquete
Sube **todos los archivos de este ZIP** a la raíz del repositorio de GitHub Pages, sustituyendo los archivos de la versión anterior:
- `index.html`
- `styles.css`
- `app.js`
- `sw.js`
- `manifest.webmanifest`
- `hookah-bg.svg`
- `icon-192.png`
- `icon-512.png`

## Funciones incluidas
- Diseño oscuro violeta y negro, logo e Instagram @NightChillZone.
- Inventario de tabacos por marca, sabor y gramos; añadir, descontar y eliminar.
- Datos de compra: precio, proveedor, fecha y aviso de stock mínimo.
- Carbones por marca y unidades; añadir, descontar y eliminar.
- Cazoletas por modelo, marca y capacidad en gramos.
- Mezclas con tantas líneas de tabaco como se necesiten, porcentajes que deben sumar 100 %, cálculo según capacidad de la cazoleta y descuento de stock.
- Historial de mezclas y movimientos.
- Estadísticas mensuales y diarias de tabaco, carbones y sesiones.
- Panel principal y avisos de reposición.
- Registro de ingresos, costes orientativos y sesiones con notas.
- Copia de seguridad JSON, restauración y exportación CSV.

## Publicación desde Safari en iPhone
1. Antes de cambiar archivos, abre tu app actual y descarga una copia de seguridad JSON. Guárdala en la app Archivos.
2. En GitHub, abre el repositorio y sustituye los archivos de la raíz por los de este ZIP. No borres el repositorio.
3. Espera a que GitHub Pages termine de publicar los cambios.
4. Abre la dirección de la web en Safari. Si la app instalada tarda en mostrar la versión nueva, cierra la app y vuelve a abrirla con conexión a internet para que cargue los archivos actualizados.
5. Comprueba que aparecen las nuevas secciones y que el inventario sigue ahí.

## Datos importantes
- Los datos de inventario se guardan localmente en el dispositivo mediante `localStorage`.
- Publicar archivos nuevos en GitHub Pages no debería borrar ese almacenamiento local. Aun así, descarga siempre una copia JSON antes de actualizar.
- No desinstales la app, no borres los datos de Safari y no uses “Borrar historial y datos de sitios web” como método de actualización.
- La restauración de una copia JSON sustituye los datos actuales; úsala solo si realmente necesitas recuperar una copia.
- Las estadísticas históricas solo pueden contar consumos que se hayan registrado como movimientos desde que existe el registro de consumo; no se pueden reconstruir consumos antiguos no registrados.
