/* =========================================================================
   v0.124 — La clasificación oficial de Play! Pokémon, PEGADA.

   Sin imports, para probarlo (y porque se ejecuta en el navegador).

   POR QUÉ SE PEGA Y NO SE DESCARGA
   --------------------------------
   championships.pokemon.com prohíbe la extracción automatizada, sea una vez
   por semana o una al año. Así que la regla es la de siempre: un organizador
   abre la clasificación (España, Europa), la selecciona, la copia y la pega.
   Se analiza AQUÍ, en su navegador, y al servidor solo viajan las filas de la
   gente del grupo (jugador y puesto): los otros cientos de nombres no salen
   del navegador ni se guardan en ningún sitio.

   QUÉ ENTIENDE
   ------------
   Las filas de la tabla tal como se copian:
       «82	Ibai Montero (ESP)	108	10»      puesto · nombre (país) · CP · Play Points
   y, de la cabecera, la zona («Spain», «Europe»…) y la línea de «Última
   actualización». Si la zona no sale en lo pegado, se deduce: todo ESP = España.

   CÓMO SE CASA
   ------------
   Por nombre exacto, sin distinguir mayúsculas, acentos ni espacios dobles,
   contra el «nombre en Play! Pokémon» del perfil (y, si no lo ha puesto, su
   nombre en la app). Si un nombre sale dos veces en lo pegado con puestos
   distintos, es ambiguo y NO se asigna: mejor un hueco que un puesto ajeno.
   ========================================================================= */

export type ZonaOficial = "es" | "eu";
export type FilaOficial = { puesto: number; nombre: string; pais: string; cp: number };
export type ClasificacionPegada = { zona: ZonaOficial | null; filas: FilaOficial[]; actualizado: string | null };

const FILA = /^(\d{1,5})\s+(.+?)\s*\(([A-Z]{3})\)\s+(\d{1,5})\s+(\d{1,4})$/;

export function normalizarNombre(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

export function parseClasificacion(texto: string): ClasificacionPegada {
  const lineas = texto.replace(/\r/g, "").split("\n").map((l) => l.replace(/\u00a0/g, " ").trim()).filter(Boolean);
  const filas: FilaOficial[] = [];
  let zona: ZonaOficial | null = null;
  let actualizado: string | null = null;
  for (const l of lineas) {
    const m = FILA.exec(l);
    if (m) { filas.push({ puesto: Number(m[1]), nombre: m[2].trim(), pais: m[3], cp: Number(m[4]) }); continue; }
    if (!filas.length) {
      if (/^(spain|espa[ñn]a)$/i.test(l)) zona = "es";
      else if (/^(europe|europa)$/i.test(l)) zona = "eu";
    }
    const a = /(?:última actualización|last updated)\s*(.+)$/i.exec(l);
    if (a) actualizado = a[1].trim();
  }
  if (!zona && filas.length) zona = filas.every((f) => f.pais === "ESP") ? "es" : "eu";
  return { zona, filas, actualizado };
}

export type JugadorACasar = { id: string; nombre: string; oficial?: string | null };
export type Casado = { id: string; nombre: string; puesto: number; cp: number; como: string };
export type ResultadoCasar = {
  casados: Casado[];
  /** Del grupo que no salen en lo pegado (se quedan como estaban). */
  sinSalir: Array<{ id: string; nombre: string; conOficial: boolean }>;
  /** Su nombre sale más de una vez con puestos distintos: no se asigna. */
  ambiguos: Array<{ id: string; nombre: string }>;
};

export function casarJugadores(filas: readonly FilaOficial[], jugadores: readonly JugadorACasar[]): ResultadoCasar {
  const porNombre = new Map<string, FilaOficial[]>();
  for (const f of filas) {
    const k = normalizarNombre(f.nombre);
    porNombre.set(k, [...(porNombre.get(k) ?? []), f]);
  }
  const r: ResultadoCasar = { casados: [], sinSalir: [], ambiguos: [] };
  for (const j of jugadores) {
    const oficial = (j.oficial ?? "").trim();
    // Con nombre oficial puesto, SOLO ese: el apodo de la app podría coincidir con otra persona.
    const clave = normalizarNombre(oficial || j.nombre);
    const hallados = clave ? porNombre.get(clave) ?? [] : [];
    if (!hallados.length) { r.sinSalir.push({ id: j.id, nombre: j.nombre, conOficial: Boolean(oficial) }); continue; }
    if (new Set(hallados.map((h) => h.puesto)).size > 1) { r.ambiguos.push({ id: j.id, nombre: j.nombre }); continue; }
    r.casados.push({ id: j.id, nombre: j.nombre, puesto: hallados[0].puesto, cp: hallados[0].cp, como: hallados[0].nombre });
  }
  r.casados.sort((a, b) => a.puesto - b.puesto);
  return r;
}
