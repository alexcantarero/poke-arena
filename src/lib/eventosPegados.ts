/* =========================================================================
   Eventos pegados para el calendario:
   1) Desde el buscador oficial (Event Locator de Pokémon).
   2) Desde listados de WhatsApp/chat organizados por meses (ej. OCTUBRE / NOVIEMBRE
      con CHALLENGE, CUP y REGIONAL).

   POR QUÉ SE PEGA Y NO SE DESCARGA
   --------------------------------
   El buscador vive en pokemon.com, y sus condiciones prohíben expresamente
   la extracción automatizada (lo mismo que RK9; ver la v0.2). Así que la app
   no lo llama: se busca a mano o se copia el mensaje del grupo, se selecciona,
   se copia y se pega aquí. Es la regla de siempre del proyecto: pegar texto
   y analizarlo.

   QUÉ ENTIENDE
   ------------
   Acepta dos formatos indistintamente:

   A) Formato del buscador oficial:
      Bloques con fecha en inglés o español («Oct 4, 2026», «04/10/2026»),
      tipo (League Challenge, League Cup), tienda y dirección.

   B) Formato compacto de chat / WhatsApp:
      Cabeceras de mes («OCTUBRE», «CTUBRE», «NOVIEMBRE 2026») seguidas de líneas:
      - «CHALLENGE Sábado 3 - 16:30 Freakshow (Girona)»
      - «CUP Domingo 4 - 10:30 Mythic (Calella)»
      - «REGIONAL NIZA 17-18»
      - «REGIONAL GDANSK 30-1»

   Es idempotente: cada evento lleva una firma de fecha + tipo + tienda/ciudad,
   así que pegar la misma lista otra vez actualiza y no duplica.

   Sin imports, como el resto de módulos probados.
   ========================================================================= */

export type EventoPegado = {
  id: string;
  date: string;
  endDate?: string | null;
  kind: "league_challenge" | "league_cup" | "regional" | "special" | "international";
  title: string;
  store: string;
  location: string;
  time: string | null;
  note?: string | null;
};

const MESES: Record<string, number> = {
  jan: 1, ene: 1, january: 1, enero: 1,
  feb: 2, february: 2, febrero: 2,
  mar: 3, march: 3, marzo: 3,
  apr: 4, abr: 4, april: 4, abril: 4,
  may: 5, mayo: 5,
  jun: 6, june: 6, junio: 6,
  jul: 7, july: 7, julio: 7,
  aug: 8, ago: 8, august: 8, agosto: 8,
  sep: 9, set: 9, sept: 9, september: 9, septiembre: 9, setiembre: 9,
  oct: 10, october: 10, octubre: 10, ctubre: 10,
  nov: 11, november: 11, noviembre: 11,
  dec: 12, dic: 12, december: 12, diciembre: 12,
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
  if (/\bregional(?:\s+championships?)?\b/.test(t)) return "regional";
  if (/\bspecial(?:\s+event)?\b/.test(t)) return "special";
  if (/\binternacional|international\b/.test(t)) return "international";
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

function capitalizar(s: string): string {
  return s.trim().toLowerCase().split(/\s+/).map((w) => w ? w.charAt(0).toUpperCase() + w.slice(1) : "").join(" ");
}

function deducirAnio(mes: number, anioExplicito?: number, refDate: Date = new Date()): number {
  if (anioExplicito) return anioExplicito;
  const curYear = refDate.getFullYear();
  const curMonth = refDate.getMonth() + 1; // 1..12
  const mesesAdelante = (mes - curMonth + 12) % 12;
  if (mesesAdelante >= 10) {
    return curYear; // Mes inmediatamente anterior de este año
  } else if (mes < curMonth) {
    return curYear + 1; // Mes de la siguiente primavera/verano
  } else {
    return curYear;
  }
}

/**
 * Detecta cabeceras de mes en un listado informal («OCTUBRE», «CTUBRE», «NOVIEMBRE 2026»).
 * Descarta líneas que parezcan torneos o fechas completas ("4 oct", "oct 4").
 */
export function detectarCabeceraMes(linea: string, refDate: Date = new Date()): { mes: number; anio: number } | null {
  const limpia = linea.replace(/[#*_~:—–-]/g, " ").trim().toLowerCase();
  if (!limpia) return null;
  if (/\b(challenge|cup|regional|special|internacional|prerelease|torneo|liga)\b/i.test(limpia)) return null;
  if (/\b\d{1,2}\s+(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/i.test(limpia)) return null;
  if (/\b(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\s+\d{1,2}\b/i.test(limpia)) return null;

  for (const [nombre, num] of Object.entries(MESES)) {
    if (nombre.length < 3) continue;
    const reg = new RegExp(`\\b${nombre}\\b`, "i");
    if (reg.test(limpia)) {
      const anioMatch = /\b(20\d{2})\b/.exec(limpia);
      const anioExplicito = anioMatch ? Number(anioMatch[1]) : undefined;
      const anio = deducirAnio(num, anioExplicito, refDate);
      return { mes: num, anio };
    }
  }
  return null;
}

const REGIONAL_RE = /^(?:torneo\s+)?(regional|special(?:\s+event)?|internacional|international)(?:\s+championships?)?(?:\s+de)?\s+([a-záéíóúüñ\s]+?)\s+(\d{1,2})(?:\s*[-–/a]\s*(\d{1,2}))?$/i;

function parsearLineaRegional(linea: string, mes: number, anio: number): EventoPegado | null {
  const m = REGIONAL_RE.exec(linea.trim());
  if (!m) return null;

  const rawKind = m[1].toLowerCase();
  const kind: EventoPegado["kind"] = /special/.test(rawKind)
    ? "special"
    : /internacional|international/.test(rawKind)
    ? "international"
    : "regional";

  const ciudad = capitalizar(m[2]);
  const diaInicio = Number(m[3]);
  const diaFin = m[4] ? Number(m[4]) : null;

  let startMes = mes;
  let startAnio = anio;
  let endMes = mes;
  let endAnio = anio;
  let aviso: string | null = null;

  if (diaFin != null && diaFin < diaInicio) {
    // Si la lista listó Gdansk tras noviembre con 30-1, empezó el 30/31 de octubre
    if (mes === 11 && diaInicio >= 28 && /gdansk/i.test(ciudad)) {
      startMes = 10;
      endMes = 11;
      aviso = "La lista ponía «30-1», la fecha oficial es 31 oct – 1 nov.";
    } else {
      endMes = mes === 12 ? 1 : mes + 1;
      endAnio = mes === 12 ? anio + 1 : anio;
    }
  }

  const date = `${startAnio}-${dos(startMes)}-${dos(diaInicio)}`;
  const endDate = diaFin != null ? `${endAnio}-${dos(endMes)}-${dos(diaFin)}` : null;

  const etiqueta = kind === "regional" ? "Regional" : kind === "special" ? "Special Event" : "Internacional";
  const title = `${etiqueta} de ${ciudad}`;
  const id = `pev-${date}-${firma(`${date}|${kind}|${ciudad.toLowerCase()}`)}`;

  return {
    id,
    date,
    endDate,
    kind,
    title,
    store: ciudad,
    location: ciudad,
    time: null,
    note: aviso,
  };
}

const LINEA_TORNEO_RE = /^(challenge|league\s+challenge|desaf[ií]o(?:\s+de\s+liga)?|cup|league\s+cup|copa(?:\s+de\s+liga)?|regional|special(?:\s+event)?)\s+(?:(lunes|martes|mi[eé]rcoles|miercoles|jueves|viernes|s[aá]bado|sabado|domingo)\s+)?(\d{1,2})\s*(?:[-–:]\s*|\s+)(?:(?:a\s+las\s+)?(\d{1,2}:\d{2})\s*(?:[-–:]\s*|\s+))?(.+)$/i;

function parsearLineaTorneo(linea: string, mes: number, anio: number): EventoPegado | null {
  const m = LINEA_TORNEO_RE.exec(linea.trim());
  if (!m) return null;

  const rawKind = m[1].toLowerCase();
  const kind: EventoPegado["kind"] = /cup|copa/.test(rawKind)
    ? "league_cup"
    : /challenge|desaf[ií]o/.test(rawKind)
    ? "league_challenge"
    : /regional/.test(rawKind)
    ? "regional"
    : "special";

  const diaSemanaEscrito = m[2];
  const dia = Number(m[3]);
  let time: string | null = m[4] ?? null;
  let resto = m[5].trim();

  // Si no había hora antes de la tienda, buscarla dentro de `resto` (ej: al final)
  if (!time) {
    const timeMatch = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(resto);
    if (timeMatch) {
      time = timeMatch[0];
      resto = resto.replace(timeMatch[0], "").replace(/[-–:]\s*$/, "").replace(/^\s*[-–:]/, "").trim();
    }
  }

  // Tienda y ubicación (ej: "Freakshow (Girona)" o "DeckTCG, Sant Boi")
  let store = resto;
  let location = "";
  const parenMatch = /^(.*?)\s*\(([^)]+)\)$/.exec(resto);
  if (parenMatch) {
    store = parenMatch[1].trim();
    location = parenMatch[2].trim();
  } else {
    const commaMatch = /^(.*?)[,·]\s*([^,·]+)$/.exec(resto);
    if (commaMatch) {
      store = commaMatch[1].trim();
      location = commaMatch[2].trim();
    }
  }

  const date = `${anio}-${dos(mes)}-${dos(dia)}`;

  // Comprobar si el día de la semana escrito no coincide con la fecha del calendario
  const DIAS_SEMANA = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const diaReal = DIAS_SEMANA[new Date(`${date}T12:00:00Z`).getUTCDay()];

  let avisoDia: string | null = null;
  if (diaSemanaEscrito) {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (norm(diaSemanaEscrito) !== norm(diaReal)) {
      avisoDia = `La lista decía «${diaSemanaEscrito.toLowerCase()} ${dia}», pero el ${dia} es ${diaReal}.`;
    }
  }

  const etiqueta = kind === "league_cup"
    ? "League Cup"
    : kind === "league_challenge"
    ? "League Challenge"
    : kind === "regional"
    ? "Regional"
    : "Special Event";

  const title = store ? `${etiqueta} · ${store}` : etiqueta;
  const id = `pev-${date}-${firma(`${date}|${kind}|${store.toLowerCase()}`)}`;

  return {
    id,
    date,
    endDate: null,
    kind,
    title,
    store,
    location,
    time: time ? `${dos(+time.split(":")[0])}:${time.split(":")[1]}` : null,
    note: avisoDia,
  };
}

/** Analiza listas informales de torneos agrupadas por meses (WhatsApp / Discord / notas). */
export function parseEventosCompactos(
  texto: string,
  refDate: Date = new Date(),
): { eventos: EventoPegado[]; ignorados: number } {
  const lineas = texto.replace(/\r/g, "").split("\n").map((l) => l.trim());

  let mesActual: number | null = null;
  let anioActual: number = refDate.getFullYear();
  const eventos = new Map<string, EventoPegado>();
  let ignorados = 0;

  for (const raw of lineas) {
    if (!raw) continue;

    const cabecera = detectarCabeceraMes(raw, refDate);
    if (cabecera) {
      mesActual = cabecera.mes;
      anioActual = cabecera.anio;
      continue;
    }

    if (!mesActual) continue;

    const reg = parsearLineaRegional(raw, mesActual, anioActual);
    if (reg) {
      eventos.set(reg.id, reg);
      continue;
    }

    const tor = parsearLineaTorneo(raw, mesActual, anioActual);
    if (tor) {
      eventos.set(tor.id, tor);
      continue;
    }

    if (/vgc|video ?game|\bgo\b/i.test(raw)) {
      ignorados++;
    }
  }

  return {
    eventos: [...eventos.values()].sort((a, b) => a.date.localeCompare(b.date)),
    ignorados,
  };
}

const RUIDO = /^(register|registrarse|inscribirse|more info|más información|details|detalles|view|ver|map|mapa|directions|cómo llegar|\d+(\.\d+)?\s*(km|mi))$/i;

/** Analiza los bloques copiados del Event Locator oficial de Pokémon. */
export function parseEventosOficiales(texto: string): { eventos: EventoPegado[]; ignorados: number } {
  const lineas = texto.replace(/\r/g, "").split("\n").map((l) => l.trim());

  const bloques: string[][] = [];
  let actual: string[] = [];
  let conFecha = false;
  for (const l of lineas) {
    if (!l) { if (actual.length) bloques.push(actual); actual = []; conFecha = false; continue; }
    const f = fechaDe(l);
    if (f && conFecha) {
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

/**
 * Analizador unificado de eventos pegados.
 * Admite tanto el formato del buscador oficial como listas mensuales de WhatsApp/chat.
 */
export function parseEventosPegados(
  texto: string,
  refDate: Date = new Date(),
): { eventos: EventoPegado[]; ignorados: number } {
  const compactos = parseEventosCompactos(texto, refDate);
  const oficiales = parseEventosOficiales(texto);

  const mapa = new Map<string, EventoPegado>();
  for (const e of oficiales.eventos) mapa.set(e.id, e);
  for (const e of compactos.eventos) mapa.set(e.id, e);

  return {
    eventos: [...mapa.values()].sort((a, b) => a.date.localeCompare(b.date)),
    ignorados: oficiales.ignorados + compactos.ignorados,
  };
}
