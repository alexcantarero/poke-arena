# IMPLEMENTAR v0.106.0

Sobre la v0.105.0. **Lleva una migración.**

## 1. Migración (primero `dev`, luego `production`)

Neon → SQL Editor, con la rama correcta elegida arriba:

```sql
CREATE TABLE IF NOT EXISTS asistencias (
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('si', 'quiza', 'no')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, item)
);
```

Idempotente; también en `drizzle/0030_v0_106_0.sql` y en `npm run db:migrar` (solo contra
`.env.local`). Sin ella la app no se cae: el calendario avisa en rojo de que las marcas no se
guardan, y *Ajustes → Uso y límites → Estado de la base* nombra la 0030.

## 2. Copiar y comprobar

Descomprime `arena-v0.106.0-cambios.zip` en la raíz del repo, sobrescribiendo. Sin dependencias
nuevas ni ficheros que borrar.

```bash
npm run verificar   # 694 tests + tsc + codificación + i18n
npm run build
npm run dev
```

## 3. Probar

1. **Calendario → Agenda**: marca un Challenge como «No iré» y otro como «Iré». En la rejilla salen
   con ✕ tachado y ✓. Filtro «Sin los que no voy»: el descartado desaparece, en la rejilla y en la
   agenda. «Descartados»: sale solo ese, para recuperarlo. Pulsa otra vez «No iré»: se quita.
2. **Ranking**: 10 filas y «Ver los N restantes». Ordena por %V: el top 10 es el de %V.
3. **Perfil**: pasa el ratón por la Ball → «i» → la escalera. En el móvil, el «i» siempre está; o
   mantén pulsada la Ball. Escape o tocar fuera cierra.
4. **Barra de progreso**: se llena al cargar el perfil y la recorre un brillo.
5. **Celebración**: en la consola del navegador,
   `dispatchEvent(new CustomEvent("arena:celebrar", { detail: { etiqueta: "Prueba", nombre: "Logro", img: null } }))`.
   O consigue un logro secreto nuevo.
6. **Barra lateral**: nombre y rol a la derecha del avatar, Ball grande, etiqueta debajo. Con la
   barra plegada (mini) solo queda el avatar.

## Deshacer

`git revert`; la tabla puede quedarse (`DROP TABLE IF EXISTS asistencias;` si se quiere quitar).
