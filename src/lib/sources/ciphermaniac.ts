import "server-only";

/* =========================================================================
   Cliente de Ciphermaniac (r2.ciphermaniac.com). v0.52.

   Lo que dice su documentación oficial (r2.ciphermaniac.com/index.html):
     · Público por HTTPS. De servidor a servidor no aplica CORS, pero piden
       IDENTIFICARSE, IR DESPACIO, CACHEAR y respetar las fuentes de origen.
     · La entrada es `reports/tournaments.json` (catálogo de eventos
       presenciales). NO se adivinan rutas ni se recorren carpetas.
     · El nombre del evento va en la URL con `encodeURIComponent`.
     · Varios ficheros son opcionales: si faltan, se degrada la función, no se
       rompe la página.
     · ATRIBUCIÓN obligatoria: los datos vienen de LimitlessTCG y Play! Limitless.

   Lo que NO dice: los nombres exactos de los campos de cada JSON (en su
   documentación eran imágenes). Por eso todo se lee de forma defensiva, y hay
   un diagnóstico en Ajustes que enseña qué responde de verdad cada fichero.

   Privacidad: `decks.json` y `players.json` traen nombres de jugadores. NO se
   piden. Se usan los resúmenes por arquetipo, que es lo que su documentación
   recomienda («prefer compact derived indexes»).
   ========================================================================= */

const BASE = "https://r2.ciphermaniac.com";
const CACHE_SECONDS = 6 * 3600;
const TIMEOUT_MS = 8000;
/** Se identifican así, como piden. */
/* v0.63 — con la versión de verdad y sin datos de contacto personales. Si
   Ciphermaniac responde 403 es un bloqueo de su lado (Cloudflare) a lecturas
   automáticas: NO se intenta esquivar haciéndose pasar por un navegador. La
   vía es pedirles acceso por su formulario (ver el diagnóstico). */
const USER_AGENT = `PokeArenaTCG/${process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"} (liga privada de amigos; servidor a servidor; cache 6 h)`;

export type Respuesta<T> = { ok: true; datos: T } | { ok: false; estado: number | "red"; url: string };

async function leer<T>(ruta: string): Promise<Respuesta<T>> {
  const url = `${BASE}/${ruta}`;
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: CACHE_SECONDS },
    } as RequestInit);
    if (!res.ok) return { ok: false, estado: res.status, url };
    return { ok: true, datos: (await res.json()) as T };
  } catch {
    return { ok: false, estado: "red", url };
  }
}

const ruta = (evento: string, fichero: string) => `reports/${encodeURIComponent(evento)}/${fichero}`;

/** El catálogo de eventos presenciales, del más reciente al más antiguo. */
export async function catalogo(): Promise<Respuesta<string[]>> {
  const r = await leer<unknown>("reports/tournaments.json");
  if (!r.ok) return r;
  // Defensivo: puede ser un array de nombres, o de objetos con un nombre dentro.
  const lista = Array.isArray(r.datos) ? r.datos : [];
  const nombres = lista
    .map((x) => (typeof x === "string" ? x : (x as Record<string, unknown>)?.name ?? (x as Record<string, unknown>)?.folder ?? (x as Record<string, unknown>)?.id))
    .filter((x): x is string => typeof x === "string" && x.length > 0);
  return { ok: true, datos: nombres };
}

export type ArquetipoCm = { slug: string; nombre: string; listas: number | null; cuota: number | null };

/** Los arquetipos de un evento (o de su top cut, con `slice = "topcut"`). */
export async function arquetipos(evento: string, slice?: "topcut" | "phase2"): Promise<Respuesta<ArquetipoCm[]>> {
  const r = await leer<unknown>(ruta(evento, slice ? `slices/${slice}/archetypes/index.json` : "archetypes/index.json"));
  if (!r.ok) return r;
  const crudo = r.datos as Record<string, unknown> | unknown[];
  const lista = Array.isArray(crudo) ? crudo : Array.isArray((crudo as Record<string, unknown>)?.archetypes) ? (crudo as { archetypes: unknown[] }).archetypes : [];
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const out = lista.flatMap((x) => {
    const o = x as Record<string, unknown>;
    const slug = typeof o.slug === "string" ? o.slug : typeof o.id === "string" ? o.id : null;
    const nombre = typeof o.label === "string" ? o.label : typeof o.name === "string" ? o.name : slug;
    if (!slug || !nombre) return [];
    return [{ slug, nombre, listas: num(o.deckCount ?? o.count ?? o.decks), cuota: num(o.share ?? o.percent ?? o.pct) }];
  });
  return { ok: true, datos: out };
}

/** Qué campos trae un JSON, para el diagnóstico: las claves de arriba y, si es un array, las del primer elemento. */
function forma(d: unknown): string {
  if (Array.isArray(d)) {
    const p = d[0];
    return `array[${d.length}]` + (p && typeof p === "object" ? ` de { ${Object.keys(p).slice(0, 12).join(", ")} }` : p !== undefined ? ` de ${typeof p}` : "");
  }
  if (d && typeof d === "object") return `{ ${Object.keys(d).slice(0, 16).join(", ")} }`;
  return typeof d;
}

export type LineaDiagnostico = { fichero: string; estado: string; forma: string };

/**
 * El diagnóstico: el catálogo y, del evento más reciente, los ficheros que
 * interesan. Dice qué responde cada uno y con qué campos. NO pide los que
 * traen nombres de jugadores.
 */
export async function diagnostico(): Promise<{ evento: string | null; lineas: LineaDiagnostico[] }> {
  const lineas: LineaDiagnostico[] = [];
  // v0.63 — el puntero de la versión publicada, que su documentación pone
  // como punto de partida. Si este también da 403, el bloqueo es general.
  const canal = await leer<unknown>("build/v1/channels/production.json");
  lineas.push({ fichero: "build/v1/channels/production.json", estado: canal.ok ? "200" : String(canal.estado), forma: canal.ok ? forma(canal.datos) : "—" });
  const cat = await leer<unknown>("reports/tournaments.json");
  lineas.push({ fichero: "reports/tournaments.json", estado: cat.ok ? "200" : String(cat.estado), forma: cat.ok ? forma(cat.datos) : "—" });
  const c = cat.ok ? await catalogo() : null;
  const evento = c && c.ok ? c.datos[0] ?? null : null;
  if (evento) {
    for (const f of ["meta.json", "index.json", "archetypes/index.json", "matchupProfiles.json", "conversion.json", "master.json", "slices/topcut/archetypes/index.json"]) {
      const r = await leer<unknown>(ruta(evento, f));
      lineas.push({ fichero: f, estado: r.ok ? "200" : String(r.estado), forma: r.ok ? forma(r.datos) : "—" });
    }
  }
  const online = await leer<unknown>(`reports/${encodeURIComponent("Online - Last 14 Days")}/archetypes/index.json`);
  lineas.push({ fichero: "Online - Last 14 Days/archetypes/index.json", estado: online.ok ? "200" : String(online.estado), forma: online.ok ? forma(online.datos) : "—" });
  return { evento, lineas };
}
