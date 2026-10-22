# Cómo aplicar la v0.67 — recuperar la contraseña

El zip lleva dentro de la v0.63 a la v0.66: vale vengas de la que vengas desde la v0.62.

## Migraciones de producción — ANTES de subir

En el SQL Editor de Neon de la rama `production`. Las dos son idempotentes (se pueden pegar
aunque alguna ya esté puesta). La primera es la de la v0.65; si ya la aplicaste, no pasa nada.

```sql
ALTER TABLE players ADD COLUMN IF NOT EXISTS logros text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash text PRIMARY KEY,
  player_id text NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_by text REFERENCES players(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS password_resets_player_idx ON password_resets (player_id);
```

En tu `.env.local` (rama `dev`) las lanza el script solo.

## Pasos

1. Descargas: `pokearena-v0.67-completa.zip` y `aplicar-v0.67.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.67.ps1"`
3. Pruébalo en local con dos navegadores (o uno normal y otro en incógnito):
   - En el normal, como organizador: Ajustes → Jugadores → «Enlace para nueva contraseña» en
     una cuenta de prueba. Copia el enlace.
   - En el incógnito, ábrelo, pon contraseña nueva: entras con esa cuenta.
   - Vuelve a abrir el mismo enlace: dice que ya se usó.
   - Si esa cuenta tenía una sesión abierta en otro sitio, al recargar le pide entrar.
4. Aplica el SQL en producción (arriba) y súbelo con `-SoloSubir`.

## Deshacer

`git revert HEAD`. La tabla `password_resets` puede quedarse; no molesta.
