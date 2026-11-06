# Mi Stock – correcciones de mezclas y estadísticas

## Correcciones
- Los selectores de tabaco de las mezclas se actualizan cuando cambia el inventario.
- Al eliminar un tabaco del inventario, deja de estar disponible en las mezclas.
- Al guardar una mezcla nueva, queda vinculada a sus eventos de consumo y sesión.
- Al eliminar una mezcla nueva, también se eliminan sus datos asociados de las estadísticas y su movimiento asociado. **No se devuelven gramos al inventario**, para evitar reponer stock por error.

## Importante sobre mezclas anteriores
Las mezclas creadas antes de esta actualización no tienen un identificador que las vincule de forma inequívoca a los eventos históricos. Por seguridad, al borrar una mezcla antigua se elimina su ficha, pero no se borran consumos históricos que podrían pertenecer a otros registros.

## Instalación
Antes de sustituir archivos en GitHub, exporta una copia de seguridad desde la aplicación. No desinstales la app ni borres los datos de Safari.
Sustituye los archivos de la raíz del repositorio por los de este ZIP y espera a que GitHub Pages publique los cambios.
