# IMPLEMENTAR v0.109.0

Actualización sobre la v0.108.0. **Sin migración ni dependencias nuevas.**

## 1. Copiar y comprobar

Actualiza el código y ejecuta:

```bash
npm run verificar
npm run build
npm run dev
```

## 2. Probar

1. **Calendario → Agenda**: pulsa «Iré», «Quizá» o «No iré». El botón seleccionado debe cambiar
   inmediatamente, la página no debe ponerse en negro ni saltar de posición, y la selección debe
   persistir al recargar. Pulsa de nuevo el mismo botón para quitar la marca.
2. Si el guardado falla, la selección vuelve al valor anterior y aparece un aviso.
3. **Mi asistencia**: abre el desplegable y cambia de filtro. Debe conservar el mes, los demás
   filtros y la posición aproximada de la página.

## Deshacer

Vuelve a la versión anterior del código. No hay cambios de esquema que deshacer.
