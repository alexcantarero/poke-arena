/* =========================================================================
   v0.96 — Qué columnas y tablas espera el código, y cómo reconocer el error
   de «falta una columna».

   Sin imports, para probarlo.

   POR QUÉ EXISTE
   --------------
   El 4/11/2026 la producción se cayó para TODO el que tenía sesión: el código
   v0.94 pedía `players.profile_title` y la migración 0028 no estaba aplicada en
   la rama de producción de Neon. Ni los tests, ni `tsc`, ni el build lo pueden
   ver: el esquema real solo se conoce en la base.

   Dos defensas:
     1. `ESQUEMA_ESPERADO` + `faltantes()`: el panel de uso compara lo que el
        código espera con lo que hay (information_schema) y dice qué migración
        falta y su fichero.
     2. `esColumnaQueFalta()`: las lecturas del jugador (sesión, entrar, lista
        de jugadores) reconocen el error 42703 y repiten la consulta sin las
        columnas nuevas, en vez de tumbar la app entera.

   CÓMO SE MANTIENE
   ----------------
   Cada migración nueva que añada una columna o tabla que el código LEE añade
   aquí su línea. Si la columna es de `players`, va también en
   `COLUMNAS_NUEVAS_PLAYERS` con el valor que tomaría por defecto.
   ========================================================================= */

export type Requisito = { tabla: string; columna: string; migracion: string; version: string };

/** Lo que el código espera, de las migraciones recientes (las viejas ya están en todas las bases). */
export const ESQUEMA_ESPERADO: readonly Requisito[] = [
  { tabla: "matches", columna: "updated_by", migracion: "drizzle/0020_v0_54_0.sql", version: "0.54" },
  { tabla: "tournaments", columna: "best_of_top", migracion: "drizzle/0021_v0_57_0.sql", version: "0.57" },
  { tabla: "decks", columna: "notes", migracion: "drizzle/0022_v0_59_0.sql", version: "0.59" },
  { tabla: "players", columna: "tutorial_visto_at", migracion: "drizzle/0023_v0_60_0.sql", version: "0.60" },
  { tabla: "players", columna: "tutoriales_vistos", migracion: "drizzle/0024_v0_61_0.sql", version: "0.61" },
  { tabla: "players", columna: "logros", migracion: "drizzle/0025_v0_65_0.sql", version: "0.65" },
  { tabla: "password_resets", columna: "token_hash", migracion: "drizzle/0026_v0_67_0.sql", version: "0.67" },
  { tabla: "matchup_imports", columna: "id", migracion: "drizzle/0027_v0_79_0.sql", version: "0.79" },
  { tabla: "players", columna: "profile_title", migracion: "drizzle/0028_v0_94_0.sql", version: "0.94" },
  { tabla: "uso_lecturas", columna: "id", migracion: "drizzle/0029_v0_95_0.sql", version: "0.95" },
  { tabla: "asistencias", columna: "estado", migracion: "drizzle/0030_v0_106_0.sql", version: "0.106" },
  { tabla: "players", columna: "belt_holder", migracion: "drizzle/0032_v0_113_0.sql", version: "0.113" },
  { tabla: "belt_state", columna: "id", migracion: "drizzle/0032_v0_113_0.sql", version: "0.113" },
  { tabla: "belt_challenges", columna: "id", migracion: "drizzle/0032_v0_113_0.sql", version: "0.113" },
  { tabla: "liga_temporadas", columna: "semilla", migracion: "drizzle/0033_v0_116_0.sql", version: "0.116" },
  { tabla: "liga_inscripciones", columna: "estado", migracion: "drizzle/0033_v0_116_0.sql", version: "0.116" },
  { tabla: "liga_divisiones", columna: "competition_id", migracion: "drizzle/0033_v0_116_0.sql", version: "0.116" },
  { tabla: "liga_divisiones", columna: "orden_final", migracion: "drizzle/0033_v0_116_0.sql", version: "0.116" },
  { tabla: "discord_hilos", columna: "hilo_id", migracion: "drizzle/0034_v0_117_0.sql", version: "0.117" },
];

/**
 * Columnas de `players` que pueden faltar en una base sin migrar, con el valor
 * que se usa mientras tanto. La clave es el nombre en el CÓDIGO (Drizzle).
 */
export const COLUMNAS_NUEVAS_PLAYERS = { profileTitle: "", beltHolder: false } as const;

/**
 * Qué falta. `existentes` son pares «tabla.columna» tal y como los devuelve
 * information_schema. Agrupado por migración, en orden, sin repetir fichero.
 */
export function faltantes(existentes: Iterable<string>, esperado: readonly Requisito[] = ESQUEMA_ESPERADO): Array<{ migracion: string; version: string; que: string[] }> {
  const hay = new Set([...existentes].map((s) => s.toLowerCase()));
  const porMigracion = new Map<string, { migracion: string; version: string; que: string[] }>();
  for (const r of esperado) {
    if (hay.has(`${r.tabla}.${r.columna}`.toLowerCase())) continue;
    const g = porMigracion.get(r.migracion) ?? { migracion: r.migracion, version: r.version, que: [] };
    g.que.push(r.columna === "id" ? `tabla ${r.tabla}` : `${r.tabla}.${r.columna}`);
    porMigracion.set(r.migracion, g);
  }
  return [...porMigracion.values()];
}

/**
 * ¿Es el error de Postgres «la columna no existe» (SQLSTATE 42703)? El driver
 * de Neon lo trae en `code`; según la versión de Drizzle puede venir envuelto
 * en `cause`. Si no hay código, por el texto.
 */
export function esColumnaQueFalta(e: unknown): boolean {
  for (let x: unknown = e, i = 0; x && i < 4; x = (x as { cause?: unknown }).cause, i++) {
    const o = x as { code?: unknown; message?: unknown };
    if (o.code === "42703") return true;
    if (typeof o.message === "string" && /column .+ does not exist/i.test(o.message)) return true;
  }
  return false;
}

/** Copia de un objeto sin ciertas claves (para quitar columnas nuevas de un select). */
export function sinClaves<T extends Record<string, unknown>, K extends string>(obj: T, claves: readonly K[]): Omit<T, K> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (!(claves as readonly string[]).includes(k)) out[k] = v;
  return out as Omit<T, K>;
}
