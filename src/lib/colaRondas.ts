/* =========================================================================
   v0.125 — MODO TORNEO: la cola de rondas del móvil.

   Sin imports, para probarlo (y porque corre en el navegador).

   EL PROBLEMA
   -----------
   En la sala de un torneo no hay cobertura, o hay 300 personas en la misma
   antena. Apuntar la ronda no puede depender de eso: se guarda en el teléfono
   al momento y sube sola cuando vuelve la red.

   CÓMO
   ----
   · Cada ronda apuntada en el modo torneo entra en una cola (localStorage,
     una por torneo y jugador). Como mucho hay una entrada por número de ronda:
     volver a apuntar la 3 sustituye la 3 que estaba en cola.
   · Al subir, el servidor responde y `aplicarRespuesta` decide: fuera de la
     cola si entró; marcada «choca» si allí había otra ronda con ese número que
     el móvil no conocía; marcada «error» si la rechazó (con el motivo). Si no
     hay red, no hay respuesta y la entrada se queda como estaba.
   · Reenviar no duplica: el servidor tiene un índice único por torneo,
     jugador y ronda. Por eso se puede reintentar sin miedo.
   · El récord que se enseña mezcla lo del servidor con la cola (la cola manda
     en las rondas que toca), para que se vea al momento aunque no haya subido.

   Solo modo rápido: resultado, mazo del rival y quién empezó. El desglose
   juego a juego sigue en la ficha, con red.
   ========================================================================= */

export type ResultadoCola = "a" | "b" | "tie";
export type EspecialCola = "" | "bye" | "np-rival" | "np-yo";
export type EstadoCola = "pendiente" | "conflicto" | "error";

export type RondaEnCola = {
  torneoId: string;
  ronda: number;
  resultado: ResultadoCola;
  /** Valor del selector del rival: id de mazo o «arch:<id>». Vacío en bye / no presentado. */
  rival: string;
  /** Cómo se llama ese mazo, para enseñarlo sin red. */
  rivalNombre: string;
  /** Nombre del rival (opcional). */
  oponente: string;
  primero: "" | "a" | "b";
  especial: EspecialCola;
  /** Mi mazo, si el torneo aún no lo tenía fijado: id de mazo o «arch:<id>». */
  miMazo: string;
  /** ¿Sabía el móvil que esa ronda ya estaba en el servidor al apuntarla? (corregir ≠ chocar) */
  conocida: boolean;
  /** Cuándo se apuntó (ms). */
  creado: number;
  estado: EstadoCola;
  /** El motivo del error o lo que hay en el servidor, para enseñarlo. */
  detalle: string;
  /** «Usar la mía» tras un choque: la próxima subida pisa lo del servidor. */
  forzar: boolean;
};

export const CLAVE_COLA = (torneoId: string, playerId: string) => `arena-cola-rondas:${torneoId}:${playerId}`;

const esResultado = (x: unknown): x is ResultadoCola => x === "a" || x === "b" || x === "tie";
const esEspecial = (x: unknown): x is EspecialCola => x === "" || x === "bye" || x === "np-rival" || x === "np-yo";
const texto = (x: unknown, max: number) => (typeof x === "string" ? x.slice(0, max) : "");

/** Lee la cola guardada. Lo que no se entienda se descarta: nunca revienta. */
export function parseCola(json: string | null | undefined, torneoId: string): RondaEnCola[] {
  if (!json) return [];
  let bruto: unknown;
  try { bruto = JSON.parse(json); } catch { return []; }
  if (!Array.isArray(bruto)) return [];
  const out: RondaEnCola[] = [];
  for (const x of bruto as Array<Record<string, unknown>>) {
    if (!x || typeof x !== "object") continue;
    const ronda = Number(x.ronda);
    const especial = esEspecial(x.especial) ? x.especial : "";
    const resultado = especial === "bye" || especial === "np-rival" ? "a" : especial === "np-yo" ? "b" : x.resultado;
    if (!Number.isInteger(ronda) || ronda < 1 || ronda > 50 || !esResultado(resultado)) continue;
    out.push({
      torneoId, ronda, resultado,
      rival: especial ? "" : texto(x.rival, 80), rivalNombre: especial ? "" : texto(x.rivalNombre, 80),
      oponente: texto(x.oponente, 60),
      primero: x.primero === "a" || x.primero === "b" ? x.primero : "",
      especial,
      miMazo: texto(x.miMazo, 80),
      conocida: x.conocida === true,
      creado: Number.isFinite(Number(x.creado)) ? Number(x.creado) : 0,
      estado: x.estado === "conflicto" || x.estado === "error" ? x.estado : "pendiente",
      detalle: texto(x.detalle, 200),
      forzar: x.forzar === true,
    });
  }
  return ordenar(out);
}

const ordenar = (c: RondaEnCola[]) => [...c].sort((a, b) => a.ronda - b.ronda);

/** Mete una ronda en la cola. Si ya había una con ese número, la sustituye. */
export function encolar(cola: readonly RondaEnCola[], nueva: RondaEnCola): RondaEnCola[] {
  return ordenar([...cola.filter((r) => r.ronda !== nueva.ronda), { ...nueva, estado: "pendiente", detalle: "" }]);
}

export function quitar(cola: readonly RondaEnCola[], ronda: number): RondaEnCola[] {
  return cola.filter((r) => r.ronda !== ronda);
}

/** «Usar la mía»: vuelve a pendiente y la próxima subida pisa lo del servidor. */
export function forzar(cola: readonly RondaEnCola[], ronda: number): RondaEnCola[] {
  return cola.map((r) => (r.ronda === ronda ? { ...r, estado: "pendiente" as const, detalle: "", forzar: true } : r));
}

/** Lo que se le manda a la acción del servidor (los mismos campos que el formulario de ronda). */
export function aFormulario(r: RondaEnCola): Record<string, string> {
  const f: Record<string, string> = {
    tournamentId: r.torneoId, round: String(r.ronda), mode: "quick", result: r.resultado,
    conocida: r.conocida ? "1" : "0", forzar: r.forzar ? "1" : "0",
  };
  if (r.oponente) f.opponentName = r.oponente;
  if (r.miMazo) f.deckAId = r.miMazo;
  if (r.especial === "bye") f.bye = "1";
  else if (r.especial === "np-rival") f.np = "rival";
  else if (r.especial === "np-yo") f.np = "yo";
  else {
    f.opponentDeck = r.rival;
    if (r.primero) f.g0_first = r.primero;
  }
  return f;
}

export type RespuestaSubida =
  | { ok: true; yaEstaba?: boolean }
  | { ok: false; error: string; conflicto?: { resultado: string | null; rival: string } };

const RES_TEXTO: Record<string, string> = { a: "victoria", b: "derrota", tie: "empate" };

/** Qué pasa con una ronda de la cola según lo que contestó el servidor. */
export function aplicarRespuesta(cola: readonly RondaEnCola[], ronda: number, resp: RespuestaSubida): RondaEnCola[] {
  if (resp.ok) return quitar(cola, ronda);
  return cola.map((r) => {
    if (r.ronda !== ronda) return r;
    if (resp.conflicto) {
      const res = resp.conflicto.resultado ? RES_TEXTO[resp.conflicto.resultado] ?? "apuntada juego a juego" : "apuntada juego a juego";
      return { ...r, estado: "conflicto" as const, detalle: `${res}${resp.conflicto.rival ? ` contra ${resp.conflicto.rival}` : ""}`, forzar: false };
    }
    return { ...r, estado: "error" as const, detalle: resp.error.slice(0, 200), forzar: false };
  });
}

/** Las que toca intentar subir, en orden de ronda. Las que chocan esperan a que la persona decida. */
export function porSubir(cola: readonly RondaEnCola[]): RondaEnCola[] {
  return ordenar(cola.filter((r) => r.estado !== "conflicto"));
}

export type RondaServidor = { ronda: number; r: "w" | "l" | "t" | null };
const A_LETRA: Record<ResultadoCola, "w" | "l" | "t"> = { a: "w", b: "l", tie: "t" };

/** El récord que se enseña: lo del servidor, con la cola por encima en sus rondas. */
export function recordCon(servidor: readonly RondaServidor[], cola: readonly RondaEnCola[]): { w: number; l: number; t: number; puntos: number; rondas: number } {
  const porRonda = new Map<number, "w" | "l" | "t" | null>();
  for (const s of servidor) porRonda.set(s.ronda, s.r);
  for (const c of cola) porRonda.set(c.ronda, A_LETRA[c.resultado]);
  let w = 0, l = 0, t = 0;
  for (const r of porRonda.values()) { if (r === "w") w++; else if (r === "l") l++; else if (r === "t") t++; }
  return { w, l, t, puntos: 3 * w + t, rondas: porRonda.size };
}

/** La ronda que toca: la siguiente a la más alta apuntada (servidor o cola). null si ya se llegó al tope. */
export function siguienteRonda(servidor: readonly RondaServidor[], cola: readonly RondaEnCola[], tope: number | null): number | null {
  const max = Math.max(0, ...servidor.map((s) => s.ronda), ...cola.map((c) => c.ronda));
  const n = max + 1;
  return tope != null && n > tope ? null : n;
}

/** ¿Se puede guardar lo que hay en el formulario? Una ronda normal pide resultado y mazo del rival. */
export function listaParaGuardar(f: { resultado: string; rival: string; especial: EspecialCola; miMazo: string; mazoFijado: boolean }): boolean {
  if (!f.mazoFijado && !f.miMazo) return false;
  if (f.especial) return true;
  return esResultado(f.resultado) && f.rival.length > 0;
}
