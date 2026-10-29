# Cómo aplicar la v0.79 — Trainer Hill

Lleva dentro la v0.76, v0.77 y v0.78 (qué probar de aquellas: sus `PASOS`).

**Migración** (solo hace falta para importar; sin ella la app funciona igual). En Neon,
rama `production`, ANTES de importar en producción:

```sql
CREATE TABLE IF NOT EXISTS matchup_imports (
  id text PRIMARY KEY,
  fuente text NOT NULL DEFAULT 'trainerhill',
  nivel text NOT NULL,
  nombre text NOT NULL DEFAULT '',
  filas jsonb NOT NULL,
  partidas integer NOT NULL DEFAULT 0,
  created_by text REFERENCES players(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.79-completa.zip` y `aplicar-v0.79.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.79.ps1"`
   (lanza la migración en tu base de desarrollo).
3. Ajustes → Importar datos → **Emparejamientos de Trainer Hill**: sube
   `trainerhill-meta-matchups-2026-10-29.csv` como **Mezclado (online + Majors)**.
4. Herramientas → Recomendador: abajo dice cuántas partidas de Trainer Hill usa.
5. `-SoloSubir` (con el SQL ya puesto en producción).

**Para sacarle todo el partido**, exporta DOS ficheros por separado en Trainer Hill:
uno solo de Majors y otro solo online, y súbelos cada uno con su tipo. El de Majors es el que
da a los Regionales emparejamientos presenciales de verdad. Repítelo después de cada Regional.
