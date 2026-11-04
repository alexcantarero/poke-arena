# IMPLEMENTAR v0.96.0

Acumulativo: lleva la v0.95 (resultado rápido, panel de uso) y la v0.96 (la app aguanta una
migración pendiente). Producción está en la v0.94.

## 0. Primero, levantar producción (no depende de esta versión)

Neon → SQL Editor → **rama production**:

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS profile_title text NOT NULL DEFAULT '';
```

## 1. Migraciones de producción, antes de subir

En la rama **production** de Neon (y en **dev** si no lo están), revisa y pega:

- `drizzle/0028_v0_94_0.sql` — si no lo hiciste en el paso 0.
- `drizzle/0029_v0_95_0.sql` — tabla `uso_lecturas`.

Las dos son idempotentes. **`npm run db:migrar` solo va contra `.env.local` (dev)**: no migra
producción.

## 2. Copiar y comprobar

Descomprime `arena-v0.96.0-cambios.zip` en la raíz del repo (rama `development`), sobrescribiendo.

```bash
npm run verificar   # 682 tests + tsc + codificación + i18n
npm run build
npm run dev
```

## 3. Probar

1. **Resultado rápido** en una ronda de torneo sin resultado: «1–0» → «Resultado guardado».
   En iPhone también (era el mismo fallo en todos los navegadores).
2. **Ajustes → Uso y límites → Estado de la base**: debe decir que no falta nada. Si dice que
   falta algo, el fichero que nombra es el que hay que aplicar en esa rama de Neon.
3. Prueba de la reserva (opcional, solo en una rama de Neon de usar y tirar, nunca en dev ni
   en producción): `ALTER TABLE players DROP COLUMN profile_title;` → la app sigue funcionando
   y el panel avisa de la 0028. Vuelve a añadirla después.

## 4. Variables opcionales

`NEON_API_KEY`, `NEON_PROJECT_ID`, `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` (`VERCEL_TEAM_ID` si es
de un equipo). Ver `docs/15-uso-vercel-neon.md`.

## Deshacer

`git revert` del commit. Sin cambios de esquema propios de la v0.96.
