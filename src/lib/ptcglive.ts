/* =========================================================================
   Importar el historial de Pokémon TCG Live.

   LO PRIMERO, PORQUE CAMBIA TODO LO DEMÁS
   ---------------------------------------
   **TCG Live no tiene API, ni exportación, ni nada parecido.** No hay
   endpoint de The Pokémon Company del que bajarse tus partidas, y no lo va a
   haber. Cualquier documento que prometa una integración automática está
   prometiendo algo que no existe.

   Lo que sí hay es lo que apunta cada uno: una hoja de cálculo, una nota del
   móvil, o el registro de batalla que el cliente deja copiar al acabar. Así
   que esto es un importador de **texto pegado**, y está escrito para tragar
   lo que la gente escribe de verdad, no un formato que nadie va a respetar.

   QUÉ TRAGA
   ---------
   Una línea por partida, separada por comas, punto y coma o tabuladores —lo
   que salga de pegar una hoja de cálculo—. Con cabecera o sin ella. Las
   columnas se reconocen por el nombre si hay cabecera, y por el orden si no:

     fecha, mi mazo, mazo del rival, resultado [, rival] [, marcador] [, formato]
     2026-09-14, Dragapult ex, Gardevoir ex, V, Marta, 2-1, Estándar

   El resultado admite V/D/E, W/L/D/T, gana/pierde/empata y 1/0. El marcador
   («2-1») es opcional y, si está, manda sobre la letra: si alguien escribe
   «D» y «2-1», gana el marcador, porque los números se equivocan menos.

   POR QUÉ NO CUENTA PARA EL RANKING
   ---------------------------------
   Estas partidas van a su propia tabla y no se mezclan con `matches`. En una
   liga privada el ranking se construye sobre partidas que las dos personas
   han visto; lo que uno apunta de sus partidas contra desconocidos en el
   cliente no es verificable por nadie. Sirve para saber cómo va tu mazo, que
   es justo para lo que se pidió, y para eso no hace falta mezclarlo.

   LA DEDUPLICACIÓN
   ----------------
   El documento de origen proponía guardar un hash. Aquí se guarda **la clave
   en claro** (`dedupeKey`), que hace exactamente lo mismo —la columna es
   única, así que un duplicado no entra— y además se puede leer cuando algo
   no cuadra. Un hash aquí solo escondería el problema.

   Sin `import` de nada: así las pruebas lo cargan directo.
   ========================================================================= */

export type LiveResult = "w" | "l" | "d";

export type LiveRow = {
  /** ISO "AAAA-MM-DD". */
  date: string;
  myDeck: string;
  opponentDeck: string;
  opponent: string;
  result: LiveResult;
  gamesWon: number | null;
  gamesLost: number | null;
  format: string;
  /** Lo que hace que no entre dos veces. */
  dedupeKey: string;
};

export type ParseProblem = { line: number; text: string; why: string };

export type ParseResult = {
  rows: LiveRow[];
  problems: ParseProblem[];
  /** Filas repetidas dentro del propio texto pegado. */
  duplicatesInPaste: number;
};

/* ----------------------------------------------------------- utilidades -- */

const limpia = (s: string) => s.trim().replace(/^["']|["']$/g, "").trim();

/** Aparta acentos y mayúsculas para comparar cabeceras y resultados. */
const plano = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Con qué está separada la línea.
 *
 * Se mira el tabulador primero porque pegar desde una hoja de cálculo es el
 * caso más común y sus columnas vienen con tabulador; y el punto y coma
 * antes que la coma porque un Excel en español exporta con punto y coma y
 * usa la coma para los decimales.
 */
export function detectDelimiter(text: string): string {
  const linea = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  if (linea.includes("\t")) return "\t";
  if (linea.includes(";")) return ";";
  return ",";
}

/**
 * Fecha en cualquiera de las formas que escribe la gente.
 *
 * Admite AAAA-MM-DD, DD/MM/AAAA y DD-MM-AAAA. El día primero y no el mes:
 * esto lo usa gente que escribe en español, y «03/09» aquí es 3 de
 * septiembre. Lo que no se entiende devuelve null y la fila se rechaza en
 * vez de colarse con una fecha inventada.
 */
export function parseDate(raw: string): string | null {
  const s = limpia(raw);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  const dia = Number(m[1]);
  const mes = Number(m[2]);
  let anio = Number(m[3]);
  if (anio < 100) anio += 2000;
  if (dia < 1 || dia > 31 || mes < 1 || mes > 12) return null;
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const GANA = ["v", "w", "win", "gana", "ganada", "victoria", "1"];
const PIERDE = ["d", "l", "loss", "lose", "pierde", "perdida", "derrota", "0"];
const EMPATA = ["e", "t", "tie", "draw", "empate", "empata", "empatada", "x"];

/**
 * Resultado a partir de la letra.
 *
 * Cuidado con la trampa: la **D** es «derrota» en español y «draw» en
 * inglés. Se resuelve a derrota porque quien importa esto escribe en
 * español, y los empates en TCG Live son rarísimos —hay reloj y hay muerte
 * súbita—. Quien quiera marcar un empate tiene «E» y «empate».
 */
export function parseResult(raw: string): LiveResult | null {
  const s = plano(limpia(raw));
  if (!s) return null;
  if (GANA.includes(s)) return "w";
  if (PIERDE.includes(s)) return "l";
  if (EMPATA.includes(s)) return "d";
  return null;
}

/** "2-1" → [2, 1]. Devuelve null si no es un marcador. */
export function parseScore(raw: string): [number, number] | null {
  const m = limpia(raw).match(/^(\d)\s*[-–/]\s*(\d)$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (a > 3 || b > 3) return null;
  return [a, b];
}

/** La clave que impide meter dos veces la misma partida. */
export function dedupeKeyOf(playerId: string, r: Omit<LiveRow, "dedupeKey">): string {
  return [
    playerId, r.date, plano(r.myDeck), plano(r.opponentDeck), plano(r.opponent),
    r.result, r.gamesWon ?? "", r.gamesLost ?? "",
  ].join("|");
}

/* ------------------------------------------------------------- cabecera -- */

type Campo = "date" | "myDeck" | "opponentDeck" | "opponent" | "result" | "score" | "format";

const ALIAS: Record<Campo, string[]> = {
  date: ["fecha", "date", "dia", "cuando"],
  myDeck: ["mi mazo", "mazo", "mi deck", "deck", "my deck", "mazo propio", "arquetipo"],
  opponentDeck: ["mazo rival", "rival mazo", "mazo del rival", "opponent deck", "deck rival", "vs"],
  opponent: ["rival", "oponente", "opponent", "contra", "nombre"],
  result: ["resultado", "result", "r", "vd", "w/l"],
  score: ["marcador", "score", "juegos", "games"],
  format: ["formato", "format", "modo"],
};

/** El orden por defecto cuando el texto pegado no trae cabecera. */
const ORDEN_POR_DEFECTO: Campo[] = ["date", "myDeck", "opponentDeck", "result", "opponent", "score", "format"];

function mapaDeCabecera(celdas: string[]): Partial<Record<Campo, number>> | null {
  const mapa: Partial<Record<Campo, number>> = {};
  let aciertos = 0;
  celdas.forEach((celda, i) => {
    const c = plano(limpia(celda));
    for (const [campo, nombres] of Object.entries(ALIAS) as Array<[Campo, string[]]>) {
      if (mapa[campo] === undefined && nombres.includes(c)) {
        mapa[campo] = i;
        aciertos++;
        return;
      }
    }
  });
  // Con menos de dos columnas reconocidas no es una cabecera: es una fila de
  // datos cuyo primer valor se parece a un nombre de columna.
  return aciertos >= 2 ? mapa : null;
}

/* ------------------------------------------------------------- el parser -- */

export function parseLiveHistory(text: string, playerId: string): ParseResult {
  const rows: LiveRow[] = [];
  const problems: ParseProblem[] = [];
  const vistas = new Set<string>();
  let duplicatesInPaste = 0;

  const delim = detectDelimiter(text);
  const lineas = text.split(/\r?\n/);

  let mapa: Partial<Record<Campo, number>> | null = null;
  let primera = true;

  lineas.forEach((linea, i) => {
    const bruto = linea.trim();
    if (!bruto || bruto.startsWith("#")) return;

    const celdas = bruto.split(delim).map(limpia);

    if (primera) {
      primera = false;
      const detectada = mapaDeCabecera(celdas);
      if (detectada) {
        mapa = detectada;
        return; // la cabecera no es una partida
      }
      mapa = Object.fromEntries(ORDEN_POR_DEFECTO.map((c, k) => [c, k]));
    }

    const en = (campo: Campo) => {
      const idx = mapa?.[campo];
      return idx === undefined ? "" : celdas[idx] ?? "";
    };

    const date = parseDate(en("date"));
    if (!date) {
      problems.push({ line: i + 1, text: bruto, why: "no se entiende la fecha" });
      return;
    }

    const myDeck = en("myDeck");
    if (!myDeck) {
      problems.push({ line: i + 1, text: bruto, why: "falta tu mazo" });
      return;
    }

    const marcador = parseScore(en("score"));
    const letra = parseResult(en("result"));

    /* El marcador manda sobre la letra: los números se equivocan menos que
       las abreviaturas, y la «D» es ambigua entre derrota y draw. */
    let result: LiveResult | null = letra;
    if (marcador) {
      result = marcador[0] > marcador[1] ? "w" : marcador[0] < marcador[1] ? "l" : "d";
    }
    if (!result) {
      problems.push({ line: i + 1, text: bruto, why: "no se entiende el resultado" });
      return;
    }

    const sinClave = {
      date,
      myDeck,
      opponentDeck: en("opponentDeck"),
      opponent: en("opponent"),
      result,
      gamesWon: marcador ? marcador[0] : null,
      gamesLost: marcador ? marcador[1] : null,
      format: en("format"),
    };
    const dedupeKey = dedupeKeyOf(playerId, sinClave);

    if (vistas.has(dedupeKey)) {
      duplicatesInPaste++;
      return;
    }
    vistas.add(dedupeKey);
    rows.push({ ...sinClave, dedupeKey });
  });

  return { rows, problems, duplicatesInPaste };
}

/* --------------------------------------------------------- estadísticas -- */

export type LiveDeckStat = {
  deck: string;
  played: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number | null;
};

/** El % de victorias contando el empate como media victoria, igual que la liga. */
export function winRateOf(wins: number, losses: number, ties: number): number | null {
  const n = wins + losses + ties;
  return n ? (wins + ties / 2) / n : null;
}

/** Cómo va cada mazo tuyo. Ordenado por uso, que es como se mira. */
export function statsByDeck(rows: Array<Pick<LiveRow, "myDeck" | "result">>): LiveDeckStat[] {
  const map = new Map<string, LiveDeckStat>();
  for (const r of rows) {
    const clave = r.myDeck || "Sin mazo";
    const cur = map.get(clave) ?? { deck: clave, played: 0, wins: 0, losses: 0, ties: 0, winRate: null };
    cur.played++;
    if (r.result === "w") cur.wins++;
    else if (r.result === "l") cur.losses++;
    else cur.ties++;
    map.set(clave, cur);
  }
  return [...map.values()]
    .map((d) => ({ ...d, winRate: winRateOf(d.wins, d.losses, d.ties) }))
    .sort((a, b) => b.played - a.played || a.deck.localeCompare(b.deck));
}

export type LiveMatchup = LiveDeckStat & { against: string };

/**
 * Cómo te va con un mazo contra cada rival.
 *
 * `minPlayed` existe porque un 100% de una partida no es información, y en
 * una lista de emparejamientos ese ruido tapa lo que sí lo es.
 */
export function matchupsOf(
  rows: Array<Pick<LiveRow, "myDeck" | "opponentDeck" | "result">>,
  deck: string,
  minPlayed = 1,
): LiveMatchup[] {
  const map = new Map<string, LiveMatchup>();
  for (const r of rows) {
    if (r.myDeck !== deck) continue;
    const contra = r.opponentDeck || "Sin identificar";
    const cur = map.get(contra)
      ?? { deck, against: contra, played: 0, wins: 0, losses: 0, ties: 0, winRate: null };
    cur.played++;
    if (r.result === "w") cur.wins++;
    else if (r.result === "l") cur.losses++;
    else cur.ties++;
    map.set(contra, cur);
  }
  return [...map.values()]
    .filter((m) => m.played >= minPlayed)
    .map((m) => ({ ...m, winRate: winRateOf(m.wins, m.losses, m.ties) }))
    .sort((a, b) => b.played - a.played || a.against.localeCompare(b.against));
}
