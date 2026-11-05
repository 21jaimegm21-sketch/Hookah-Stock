# Night Chill Zone · Mi Stock

Aplicación web progresiva (PWA) para gestionar tabaco, carbones, cazoletas y mezclas.

## Publicar en GitHub Pages
1. Crea un repositorio en GitHub.
2. Sube **todos los archivos y carpetas** de este ZIP a la raíz del repositorio.
3. Entra en **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Selecciona la rama `main` y la carpeta `/ (root)`, y guarda.
6. Cuando GitHub Pages publique la web, abre la URL desde Safari en el iPhone. Pulsa **Compartir → Añadir a pantalla de inicio**.

## Funciones
- Añadir tabacos con marca, sabor y cantidad en gramos.
- Eliminar productos del inventario.
- Añadir y descontar carbones.
- Registrar cazoletas por marca y capacidad en gramos.
- Crear mezclas con dos tabacos y porcentajes que sumen 100%.
- Calcular los gramos exactos según la capacidad de la cazoleta y descontarlos del stock al confirmar.
- Consultar y eliminar registros de mezclas.
- Historial de movimientos.
- Fondo temático y acceso a Instagram **@NightChillZone**.

## Datos
Los datos se guardan localmente en el navegador del dispositivo mediante `localStorage`. No se sincronizan automáticamente entre dispositivos; publicar una nueva versión en GitHub no borra el stock guardado en el iPhone.
