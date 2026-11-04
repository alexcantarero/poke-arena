# IMPLEMENTAR v0.95.0

Arreglo del resultado rápido, panel de uso con datos reales y layout en paralelo.
**Lleva una migración** y admite variables de entorno **opcionales**.

## 1. Copiar los ficheros

Descomprime `arena-v0.95.0-cambios.zip` en la raíz del repo (rama `development`), aceptando
sobrescribir. Todos los ficheros van en UTF-8 sin BOM y con los finales de línea de antes (CRLF).
No hay ficheros que borrar ni dependencias nuevas.

## 2. Comprobar en local

```bash
npm run verificar   # codificación + acciones + i18n + 676 tests + tsc
npm run build
npm run dev
```

## 3. Migración (rama `dev` de Neon primero)

Revisa y pega en el SQL Editor de Neon, primero en **dev** y, tras probar, en **production**:

```sql
CREATE TABLE IF NOT EXISTS uso_lecturas (
  id text PRIMARY KEY,
  fecha date NOT NULL,
  fuente text NOT NULL,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text REFERENCES players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uso_lecturas_dia_fuente_idx ON uso_lecturas (fecha, fuente);
```

Es idempotente. También está en `drizzle/0029_v0_95_0.sql` y en `npm run db:migrar`, que ahora
incluye la 0028 y la 0029. Sin la migración la app funciona; el panel de uso sale sin historia.

## 4. Variables de entorno (opcionales, Vercel → Settings → Environment Variables, solo Production)

| Variable | Qué activa |
| --- | --- |
| `NEON_API_KEY`, `NEON_PROJECT_ID` | Cómputo, tráfico y almacenamiento reales de Neon y la lectura diaria del cron |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` (+ `VERCEL_TEAM_ID` si es de un equipo) | Despliegues y tiempo de build |

Paso a paso en `docs/15-uso-vercel-neon.md`. Redespliega después de añadirlas.

## 5. Probar

1. **Resultado rápido** (lo que fallaba): en un torneo abierto, una ronda sin resultado → pulsa
   «1–0». Debe salir «Resultado guardado» y la ronda con su marcador. Repite con «Empate por
   tiempo» en otra ronda, y desde Inicio → *Pendientes* con una partida de liga.
2. Pulsa otra vez sobre una ronda ya resuelta desde *Editar*: debe decir «corregido» solo entonces.
3. **Ajustes** (como organizador): la tarjeta grande de *Uso y límites* con los Rotom y el chip en el
   menú de secciones.
4. **Uso y límites**: seis medidores (Vercel y Neon), actividad por día y por hora, tablas en
   barras. Apunta una lectura de Vercel (por ejemplo «12.345» invocaciones) y comprueba que el
   medidor pasa a «real».
5. Con `NEON_API_KEY`: los medidores de Neon dicen «real» y aparece la proyección. La curva del
   periodo necesita dos noches de cron.
6. En el móvil: los gráficos de días se desplazan dentro de su tarjeta, sin mover la página.

## Deshacer

`git revert` del commit. La tabla `uso_lecturas` puede quedarse (nadie más la lee); si se quiere
quitar: `DROP TABLE IF EXISTS uso_lecturas;` tras revisarlo.
