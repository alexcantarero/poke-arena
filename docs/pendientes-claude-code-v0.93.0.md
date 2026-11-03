# Pendientes para Claude Code — revisión v0.93.0

## Estado comprobado

- `npm run verificar`: correcto; 662 pruebas, 0 fallos, codificación correcta y TypeScript sin
  errores.
- `npm run build`: correcto.
- `package.json`, `package-lock.json`, el README y `/api/version` indican v0.93.0.
- En una instancia local de la build, Calendario, Ranking y Editar perfil respondieron HTTP 200
  sin excepciones de página. Las rutas protegidas redirigieron al acceso cuando no había sesión.
- No se ejecutaron migraciones, SQL ni operaciones de escritura sobre la base de datos.
- La limpieza quitó los scripts `aplicar-v0.82..v0.90.ps1` y los ZIP completos correspondientes.
  Se conservaron las guías de implementación históricas.

## Comprobaciones manuales pendientes

Estas pruebas requieren una cuenta de desarrollo y no se realizaron durante esta revisión:

1. **Calendario:** combinar ciudad y tipo; comprobar la rejilla y la agenda; cambiar mes y vista;
   limpiar filtros. Confirmar que las ciudades ofrecidas salen de ubicaciones registradas y que
   los torneos online no se convierten en ciudades.
2. **Limitless:** comprobar con un torneo de desarrollo que el nombre configurado en el perfil
   identifica al jugador esperado. La importación la inicia un organizador desde Ajustes; no basta
   con guardar el nombre en el perfil.
3. **Límite de Limitless (HTTP 429):** los tests cubren el manejo controlado de la respuesta, pero
   queda comprobar visualmente el aviso y que una sincronización limitada no borre ni sustituya
   los datos ya guardados.
4. **Colores de victorias:** revisar «Sus mazos», Rankings y Estadísticas en tema claro y oscuro.
   Los cortes implementados son 0, 15, 30, 45, 60, 75, 90 y 100; las pruebas cubren los límites,
   valores intermedios y extremos.
5. **Autenticación y acciones:** comprobar los formularios interactivos con una cuenta autorizada
   de desarrollo. Durante esta revisión solo se inspeccionó la presentación de las páginas y no
   se enviaron formularios.

Antes de cualquier prueba que lea o escriba datos, verificar que `.env.local` apunta a la rama
`dev` de Neon. No usar producción, no ejecutar `db:push` ni `db:seed` sin autorización expresa.

## Posibles mejoras no bloqueantes

- Añadir una prueba automatizada de navegador que recorra los filtros del calendario y sus enlaces
  de navegación.
- Mantener sincronizados README, paquete y lockfile al publicar cada versión. El resumen reciente
  está actualizado; el changelog sigue siendo la referencia para el historial completo.
- Hacer la prueba visual de la nueva escala con porcentajes reales en ambos temas; los tests
  unitarios verifican asignación de tonos, no capturas visuales.

## Límites de esta revisión

- No se verificó la disponibilidad actual de Limitless ni se hizo una importación real.
- No se probó ningún flujo de escritura contra Neon.
- La revisión del navegador fue una comprobación de rutas, renderizado y errores de página, no una
  certificación funcional exhaustiva ni una prueba en dispositivos físicos.
