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

/**
 * Línea que es solo la ETIQUETA del tipo («Copa de Liga», «Desafío de Liga»,
 * «League Challenge - TCG»), no el nombre del torneo. Ojo: «Mythic L. CUP October»
 * o «LORCANOS - TCG League Challenge October» NO son etiquetas: son nombres.
 */
const ETIQUETA_RE = /^\W*(?:(?:pok[eé]mon\s+)?(?:tcg\s+)?(?:league\s+)?(?:cup|challenge)|copa(?:\s+de\s+liga)?|desaf[ií]o(?:\s+de\s+liga)?|liga|torneo\s+amistoso|prerelease|regional(?:\s+championships?)?|campeonato\s+regional|special(?:\s+event)?|evento\s+especial|campeonato\s+internacional|internacional|international(?:\s+championships?)?)(?:\s*[-–·|]\s*(?:tcg|pok[eé]mon|league))?\W*$/i;

function esEtiqueta(linea: string): boolean {
  return ETIQUETA_RE.test(linea.trim());
}

/** ¿La línea parece una dirección? (código postal, país, calle, coma…) */
function esDireccion(linea: string): boolean {
  return /\b\d{5}\b|\bspain\b|\bspai\b|espa[ñn]a|\bcarrer\b|\bcalle\b|\bc\/|\bavda\b|\bavinguda\b|\bplaza\b|\bplaça\b|,/i.test(linea);
}

/**
 * Ciudad y país de una dirección oficial, p. ej.
 * «CARRER DE LA BRUGUERA, 129, 08370 CALELLA, BARCELONA, SPAIN» → Calella · España.
 */
export function datosDeDireccion(direccion: string): { city: string; country: string } {
  const partes = direccion.split(",").map((p) => p.trim()).filter(Boolean);
  const i = partes.findIndex((p) => /^\d{5}\b/.test(p));
  const city = i >= 0 ? capitalizar(partes[i].replace(/^\d{5}\s*/, "")) : "";
  const pais = partes[partes.length - 1] ?? "";
  const country = /spain|spai|espa[ñn]a/i.test(pais) ? "España" : "";
  return { city, country };
}

/** Hora en HH:MM: «10:30 a.m.» → 10:30, «04:30 p.m.» → 16:30, «16:30» → 16:30. */
export function horaDe(texto: string): string | null {
  const ampm = /\b(1[0-2]|0?[1-9]):([0-5]\d)\s*([ap])\.?\s*m\b\.?/i.exec(texto);
  if (ampm) {
    const h = (Number(ampm[1]) % 12) + (ampm[3].toLowerCase() === "p" ? 12 : 0);
    return `${dos(h)}:${ampm[2]}`;
  }
  const h24 = /\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(texto);
  return h24 ? `${dos(+h24[1])}:${h24[2]}` : null;
}

/** Analiza los bloques copiados del Event Locator oficial de Pokémon. */
export function parseEventosOficiales(texto: string): { eventos: EventoPegado[]; ignorados: number } {
  const lineas = texto.replace(/\r/g, "").split("\n").map((l) => l.trim());

  // Un bloque es un torneo. Se corta en una línea vacía, y también cuando ya hay
  // fecha y aparece otra fecha o una etiqueta nueva (listas pegadas sin líneas vacías).
  const bloques: string[][] = [];
  let actual: string[] = [];
  let conFecha = false;
  const cerrar = () => { if (actual.length) bloques.push(actual); actual = []; conFecha = false; };
  for (const l of lineas) {
    if (!l) { cerrar(); continue; }
    const f = fechaDe(l);
    if (conFecha && (f || esEtiqueta(l))) {
      // Si la fecha nueva va precedida de una etiqueta, esa etiqueta es suya.
      const ultima = actual[actual.length - 1];
      const arrastra = f && ultima && esEtiqueta(ultima) ? actual.pop()! : null;
      cerrar();
      if (arrastra) actual = [arrastra];
    }
    if (f) conFecha = true;
    actual.push(l);
  }
  cerrar();

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
    // El tipo sale de la etiqueta, no del nombre: «Desafío de Liga / Mythic L. CUP» es un Challenge.
    const kind = b.filter(esEtiqueta).map(tipoDe).find(Boolean) ?? tipoDe(todo);
    if (!date || !kind || deOtroJuego(todo)) { if (date || kind) ignorados++; continue; }

    const time = horaDe(todo);
    const utiles = b.filter((l) => !fechaDe(l) && !esEtiqueta(l) && !RUIDO.test(l) && l.length > 2);
    // El nombre es la primera línea que no es dirección; la dirección, la que sí lo es.
    const nombre = (utiles.find((l) => !esDireccion(l)) ?? utiles[0] ?? "").slice(0, 80);
    const direccion = utiles.find((l) => esDireccion(l) && l !== nombre);
    const location = (direccion ?? utiles.find((l) => l !== nombre) ?? "").slice(0, 120);
    const etiqueta = kind === "league_cup" ? "League Cup"
      : kind === "league_challenge" ? "League Challenge"
      : kind === "regional" ? "Regional"
      : kind === "special" ? "Special Event"
      : "Internacional";
    const id = `pev-${date}-${firma(`${date}|${kind}|${nombre.toLowerCase()}`)}`;
    eventos.set(id, {
      id, date, kind, store: nombre, location,
      title: nombre ? `${etiqueta} · ${nombre}` : etiqueta,
      time,
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

/* =========================================================================
   v0.120 — Los detalles de un torneo pegado del localizador oficial, para
   crear la ficha del torneo bien rellena:

     «12/11 Porygon's Cup - Pokémon TCG League Challenge»
     «RONDA FREDERIC MISTRAL, 26, 08304 MATARÓ, BARCELONA, SPAIN»
   →  nombre «Porygon's Cup» · dirección «Ronda Frederic Mistral, 26»
      · CP 08304 · ciudad «Mataró» · provincia «Barcelona» · España

   El localizador no dice el nombre de la tienda: el nombre del torneo es lo
   más parecido (muchas tiendas lo ponen ahí) y la dirección va completa.
   ========================================================================= */

const MENORES = new Set(["de", "del", "la", "las", "les", "el", "els", "los", "i", "y", "d'", "l'"]);

/** «CARRER DE LES TORRES» → «Carrer de les Torres» (las partículas, en minúscula). */
export function tituloDireccion(s: string): string {
  return s.trim().toLowerCase().split(/\s+/).map((w, i) => {
    if (!w) return "";
    if (i > 0 && MENORES.has(w)) return w;
    const conApostrofo = /^([dl]')(.+)$/.exec(w);
    if (conApostrofo) return conApostrofo[1] + conApostrofo[2].charAt(0).toUpperCase() + conApostrofo[2].slice(1);
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}

/** El nombre limpio: sin la fecha delante ni la coletilla «- Pokémon TCG League Challenge». */
export function nombreLimpio(titulo: string): string {
  let n = titulo.trim()
    .replace(/^\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\s*[-–·:]?\s*/, "")
    .replace(/\s*[-–·|]\s*(pok[eé]mon\s+)?(tcg\s+)?(league\s+(challenge|cup)|liga|desaf[ií]o de liga|copa de liga)\s*$/i, "")
    .trim();
  if (!n) n = titulo.trim();
  return n;
}

export type DetallesEvento = {
  nombre: string;
  /** v0.123 — la tienda u organizador, cuando el nombre lo trae («… - Mythic Games»). */
  tienda: string;
  /** Calle y número, en formato legible. */
  direccion: string;
  cp: string;
  ciudad: string;
  provincia: string;
  pais: string;
  /** Lo que va en el campo «Tienda o sede» del torneo. */
  sede: string;
};

export function detallesEvento(e: Pick<EventoPegado, "store" | "title" | "location">): DetallesEvento {
  const partes = e.location.split(",").map((p) => p.trim()).filter(Boolean);
  const i = partes.findIndex((p) => /^\d{5}\b/.test(p));
  const calle = (i > 0 ? partes.slice(0, i) : i === 0 ? [] : partes.slice(0, Math.max(1, partes.length - 2))).join(", ");
  const cp = i >= 0 ? partes[i].slice(0, 5) : "";
  const ciudad = i >= 0 ? tituloDireccion(partes[i].replace(/^\d{5}\s*/, "")) : "";
  // v0.123 — el último trozo es el PAÍS si es uno conocido (no solo España);
  // la provincia es lo que queda entre la ciudad y el país.
  const ultimo = partes[partes.length - 1] ?? "";
  const pais = paisDe(ultimo);
  const provincia = i >= 0 && partes[i + 1] && i + 1 < partes.length && !(pais && i + 1 === partes.length - 1)
    ? tituloDireccion(partes[i + 1]) : "";
  const direccion = tituloDireccion(calle);
  const sede = [direccion, [cp, ciudad].filter(Boolean).join(" "), provincia && provincia !== ciudad ? `(${provincia})` : ""]
    .filter(Boolean).join(", ").replace(", (", " (");
  const bruto = e.store || e.title;
  const tienda = tiendaDe(bruto);
  const sinTienda = tienda ? bruto.slice(0, bruto.lastIndexOf(tienda)).replace(/\s[-–|]\s*$/, "").trim() : bruto;
  return { nombre: nombreLimpio(sinTienda || bruto), tienda, direccion, cp, ciudad, provincia, pais, sede };
}

/** Para no duplicar: misma dirección (calle y número) normalizada. */
export function claveDireccion(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").slice(0, 40);
}

/* v0.123 — Países de Europa que salen en el localizador, en inglés → español. */
const PAISES: Record<string, string> = {
  spain: "España", "españa": "España", portugal: "Portugal", france: "Francia", germany: "Alemania",
  italy: "Italia", "united kingdom": "Reino Unido", uk: "Reino Unido", netherlands: "Países Bajos",
  belgium: "Bélgica", poland: "Polonia", "czech republic": "Chequia", czechia: "Chequia", austria: "Austria",
  switzerland: "Suiza", denmark: "Dinamarca", sweden: "Suecia", norway: "Noruega", finland: "Finlandia",
  ireland: "Irlanda", andorra: "Andorra", "united states": "Estados Unidos", mexico: "México",
};

/** El país de un trozo de dirección, en español; vacío si no es un país conocido. */
export function paisDe(trozo: string): string {
  return PAISES[trozo.trim().toLowerCase().replace(/\s+/g, " ")] ?? "";
}

/**
 * v0.123 — La tienda, si el nombre la trae detrás de un guion y no es la
 * coletilla genérica: «League Cup Noviembre - Mythic Games» → «Mythic Games»;
 * «12/11 Porygon's Cup - Pokémon TCG League Challenge» → «» (es la coletilla).
 */
export function tiendaDe(titulo: string): string {
  const m = /\s[-–|]\s+([^-–|]+)$/.exec(titulo.trim());
  if (!m) return "";
  const t = m[1].trim();
  if (/^(pok[eé]mon\s+)?(tcg\s+)?(league\s+(challenge|cup)|liga|desaf[ií]o de liga|copa de liga)$/i.test(t)) return "";
  return t.length >= 3 ? t : "";
}

/* =========================================================================
   v0.124 — Qué va en cada campo del torneo, tal cual lo pidió Ibai con el
   ejemplo de Lorcanos:

     «LORCANOS - TCG League Cup Season 1»
     «CARRER D'IGNASI IGLESIAS, 10, 08912 BADALONA, BARCELONA, SPAIN»

     Nombre          LORCANOS - TCG League Cup Season 1   (entero, sin recortar)
     Tienda o sede   Lorcanos                             (el trozo que no es el evento)
     Dirección       Carrer d'Ignasi Iglesias, 10, 08912 Badalona, Barcelona, España
     Ciudad          Barcelona (Badalona)                 (la provincia y, entre paréntesis, el municipio)

   Lo usan la importación del calendario y «Pegar del localizador» del
   formulario de crear torneo, para que salga lo mismo por los dos caminos.
   ========================================================================= */

export type CamposTorneo = { nombre: string; tienda: string; direccion: string; ciudad: string; pais: string };

/** Un trozo del nombre que habla del evento y no de la tienda. */
const ES_EVENTO = /(^|[^a-záéíóúüñ])(cup|challenge|league|liga|copa|desaf[ií]o|tcg|torneo|tournament|season|temporada|pok[eé]mon|regional|championships?|campeonato|special|evento|internacional|international)(?![a-záéíóúüñ])/i;

/** «LORCANOS» → «Lorcanos»; lo que ya trae minúsculas se respeta («Mythic Games»). */
function legible(s: string): string {
  return /[a-záéíóúüñ]/.test(s) ? s.trim() : tituloDireccion(s);
}

/**
 * La tienda, cuando el nombre la trae separada por un guion, vaya delante o
 * detrás: «LORCANOS - TCG League Cup Season 1» → «Lorcanos»; «League Cup
 * Noviembre - Mythic Games» → «Mythic Games». Si todos los trozos hablan del
 * evento («Porygon's Cup - Pokémon TCG League Challenge») no se inventa: vacío.
 */
export function tiendaDelNombre(nombre: string): string {
  const trozos = nombre.split(/\s[-–|]\s/).map((t) => t.trim()).filter(Boolean);
  if (trozos.length < 2) return "";
  const tienda = trozos.find((t) => t.length >= 3 && !ES_EVENTO.test(t));
  return tienda ? legible(tienda) : "";
}

const sinTildes = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function camposTorneo(e: Pick<EventoPegado, "store" | "title" | "location" | "kind">): CamposTorneo {
  const grande = e.kind === "regional" || e.kind === "special" || e.kind === "international";
  const det = detallesEvento(e);
  // Lista de chat («CUP Domingo 4 - 10:30 Mythic (Calella)»): no hay dirección,
  // `store` es la tienda (o la ciudad, en un Regional) y `location` la ciudad.
  if (!det.cp && !e.location.includes(",")) {
    return { nombre: e.title, tienda: grande ? "" : e.store, direccion: "", ciudad: e.location.trim(), pais: "" };
  }
  const nombre = (e.store || e.title).trim().replace(/^\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\s*[-–·:]?\s*/, "") || e.title;
  const ciudad = det.provincia && det.ciudad && sinTildes(det.provincia) !== sinTildes(det.ciudad)
    ? `${det.provincia} (${det.ciudad})`
    : det.ciudad || det.provincia;
  const direccion = det.cp
    ? [det.direccion, [det.cp, det.ciudad].filter(Boolean).join(" "), det.provincia, det.pais].filter(Boolean).join(", ")
    : tituloDireccion(e.location);
  return { nombre, tienda: grande ? "" : tiendaDelNombre(nombre), direccion, ciudad, pais: det.pais };
}
