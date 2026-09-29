/* =========================================================================
   Eventos pegados desde el buscador oficial (Event Locator de Pokémon).

   POR QUÉ SE PEGA Y NO SE DESCARGA
   --------------------------------
   El buscador vive en pokemon.com, y sus condiciones prohíben expresamente
   la extracción automatizada (lo mismo que RK9; ver la v0.2). Así que la app
   no lo llama: se busca «Barcelona» a mano, se selecciona la lista de
   resultados, se copia y se pega aquí. Es la regla de siempre del proyecto:
   pegar texto y analizarlo.

   QUÉ ENTIENDE
   ------------
   No depende de un formato exacto, porque el buscador lo cambia sin avisar.
   Parte el texto en bloques —uno por evento— y en cada bloque busca:

   · una **fecha**: «Oct 4, 2026», «4 oct 2026», «04/10/2026», «2026-10-04»;
   · el **tipo**: League Cup / Pokémon Cup → Cup; League Challenge /
     Pokémon Challenge → Challenge. Lo que no sea ninguno de los dos se ignora;
   · el **juego**: si el bloque es de VGC o de GO y no dice TCG, se ignora;
   · la **hora** si la hay, y el resto de líneas como tienda y dirección.

   Un bloque termina en una línea vacía o cuando empieza otra fecha. El id de
   cada evento es una firma de fecha + tipo + tienda, así que pegar la misma
   lista otra vez actualiza y no duplica.

   Sin imports, como el resto de módulos probados.
   ========================================================================= */

export type EventoPegado = {
  id: string;
  date: string;
  kind: "league_challenge" | "league_cup";
  title: string;
  store: string;
  location: string;
  time: string | null;
};

const MESES: Record<string, number> = {
  jan: 1, ene: 1, feb: 2, mar: 3, apr: 4, abr: 4, may: 5, jun: 6, jul: 7,
  aug: 8, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dec: 12, dic: 12,
};

const dos = (n: number) => String(n).padStart(2, "0");

/** La fecha ISO de una línea, o nulo. */
export function fechaDe(linea: string): string | null {
  const l = linea.toLowerCase();
  let m = /(\d{4})-(\d{2})-(\d{2})/.exec(l);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /\b(\d{1,2})[/.](\d{1,2})[/.](\d{4})\b/.exec(l);
  if (m) return `${m[3]}-${dos(+m[2])}-${dos(+m[1])}`; // dd/mm/aaaa, como en España
  m = /\b([a-zé]{3})[a-zé]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/.exec(l); // Oct 4, 2026
  if (m && MESES[m[1].slice(0, 3)]) return `${m[3]}-${dos(MESES[m[1].slice(0, 3)])}-${dos(+m[2])}`;
  m = /\b(\d{1,2})\s+(?:de\s+)?([a-zé]{3})[a-zé]*\.?\s+(?:de\s+)?(\d{4})\b/.exec(l); // 4 oct 2026
  if (m && MESES[m[2].slice(0, 3)]) return `${m[3]}-${dos(MESES[m[2].slice(0, 3)])}-${dos(+m[1])}`;
  return null;
}

export function tipoDe(texto: string): EventoPegado["kind"] | null {
  const t = texto.toLowerCase();
  if (/\b(league|pok[eé]mon)?\s*cup\b|copa de liga/.test(t)) return "league_cup";
  if (/\b(league|pok[eé]mon)?\s*challenge\b|desaf[ií]o de liga/.test(t)) return "league_challenge";
  return null;
}

/** ¿Es de otro juego? VGC o GO sin mención de TCG. */
function deOtroJuego(texto: string): boolean {
  const t = texto.toLowerCase();
  if (/\btcg\b|trading card|juego de cartas|cartas coleccionables/.test(t)) return false;
  return /\bvgc\b|video ?game|videojuego|\bpok[eé]mon go\b|\bgo\b/.test(t);
}

function firma(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

const RUIDO = /^(register|registrarse|inscribirse|more info|más información|details|detalles|view|ver|map|mapa|directions|cómo llegar|\d+(\.\d+)?\s*(km|mi))$/i;

export function parseEventosPegados(texto: string): { eventos: EventoPegado[]; ignorados: number } {
  const lineas = texto.replace(/\r/g, "").split("\n").map((l) => l.trim());

  // Bloques: se corta en líneas vacías y, además, cuando aparece una fecha en
  // un bloque que ya tenía una.
  const bloques: string[][] = [];
  let actual: string[] = [];
  let conFecha = false;
  for (const l of lineas) {
    if (!l) { if (actual.length) bloques.push(actual); actual = []; conFecha = false; continue; }
    const f = fechaDe(l);
    if (f && conFecha) {
      // Si la línea de justo antes es el tipo («League Cup»), es la cabecera
      // del evento nuevo y se va con él.
      const ultima = actual[actual.length - 1];
      const arrastra = ultima && tipoDe(ultima) && !fechaDe(ultima) ? actual.pop()! : null;
      bloques.push(actual);
      actual = arrastra ? [arrastra] : [];
      conFecha = false;
    }
    if (f) conFecha = true;
    actual.push(l);
  }
  if (actual.length) bloques.push(actual);

  // Un evento puede quedar partido en dos bloques (el tipo en uno, la fecha en
  // el siguiente) si el copiado mete líneas vacías dentro: se unen los que no
  // tienen fecha con el siguiente.
  const unidos: string[][] = [];
  for (const b of bloques) {
    const prev = unidos[unidos.length - 1];
    if (prev && !prev.some((l) => fechaDe(l))) prev.push(...b);
    else unidos.push([...b]);
  }

  const eventos = new Map<string, EventoPegado>();
  let ignorados = 0;
  for (const b of unidos) {
    const todo = b.join(" · ");
    const date = b.map(fechaDe).find(Boolean) ?? null;
    const kind = tipoDe(todo);
    if (!date || !kind || deOtroJuego(todo)) { if (date || kind) ignorados++; continue; }

    const time = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(todo);
    const utiles = b.filter((l) => !fechaDe(l) && !tipoDe(l) && !RUIDO.test(l) && l.length > 2);
    const store = (utiles[0] ?? "").slice(0, 80);
    const location = (utiles.slice(1).find((l) => /\d|barcelona|calle|carrer|c\/|avda|avinguda|plaza|plaça/i.test(l)) ?? utiles[1] ?? "").slice(0, 120);
    const etiqueta = kind === "league_cup" ? "League Cup" : "League Challenge";
    const id = `pev-${date}-${firma(`${date}|${kind}|${store.toLowerCase()}`)}`;
    eventos.set(id, {
      id, date, kind, store, location,
      title: store ? `${etiqueta} · ${store}` : etiqueta,
      time: time ? `${dos(+time[1])}:${time[2]}` : null,
    });
  }
  return { eventos: [...eventos.values()].sort((a, b) => a.date.localeCompare(b.date)), ignorados };
}
