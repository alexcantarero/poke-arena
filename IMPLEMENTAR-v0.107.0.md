# IMPLEMENTAR v0.107.0

Acumulativo sobre la **v0.105.0**: lleva la v0.106 y la v0.107. Si ya subiste la v0.106, aplica
este zip encima igualmente.

## 1. Migración (si no la aplicaste con la v0.106)

Neon → SQL Editor, primero `dev` y luego `production`: `drizzle/0030_v0_106_0.sql` (tabla
`asistencias`). El SQL está también en `IMPLEMENTAR-v0.106.0.md`.

## 2. Copiar y comprobar

Descomprime `arena-v0.107.0-cambios.zip` en la raíz del repo, sobrescribiendo.

```bash
npm run verificar   # 701 tests + tsc + codificación + i18n
npm run build
npm run dev
```

## 3. Probar

1. **Celebración de medallas y títulos**. La primera visita al Inicio solo guarda lo que tienes.
   Para forzar una prueba, en la consola del navegador:
   `localStorage.setItem("arena:vistos:medallas:<tu id>", "[]")` y recarga: saldrán todas tus
   medallas en cola, una detrás de otra (con «+N»). Después ya no vuelven a salir.
2. **Ranking → Evolución del Elo**: con Rol, Niccolo, Cristina e Ibai marcados, cuatro colores
   distintos; al final de cada línea su nombre y Elo; al pasar por un chip, el resto se apaga.
3. Todo lo de la v0.106 (asistencia, top 10, Ball, barra lateral): ver `IMPLEMENTAR-v0.106.0.md`.
