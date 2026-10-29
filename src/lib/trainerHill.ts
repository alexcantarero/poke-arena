/* =========================================================================
   v0.79 — Importar los emparejamientos exportados de Trainer Hill.

   Sin imports, para probarlo.

   Trainer Hill (trainerhill.com → Meta → Matchups → «Export data (csv)»)
   exporta una fila por pareja ORDENADA de mazos:

     deck1,deck2,wins,losses,ties,total,win_rate
     alakazam-dudunsparce,basic-box-m,647,501,137,1285,53.9

   · Viene en los dos sentidos (A-B y B-A): se queda uno, el otro es espejo.
   · Las filas A-A (el espejo del mismo mazo) no dicen nada: fuera.
   · `win_rate` depende de cómo cuente los empates el que exporta (la opción
     «Count Ties as 1/3 Win»): no se usa; se guardan V-D-E y se calcula aquí.
   · Los nombres son los de Limitless (`dragapult-dusknoir`): el PRIMER
     Pokémon es el líder (la regla del grupo) y el resto, la variante.
   ========================================================================= */

export type FilaTH = {
  deck1: string; deck2: string;
  lider1: string; lider2: string;
  w: number; l: number; t: number;
};

export type ResultadoTH = { filas: FilaTH[]; mazos: string[]; partidas: number; errores: string[] };

/* Pokémon con nombre de varias palabras (en slug), para no partirlos. */
const COMPUESTOS = [
  "iron-hands", "iron-valiant", "iron-thorns", "iron-crown", "iron-boulder", "iron-leaves", "iron-bundle",
  "iron-jugulis", "iron-moth", "iron-treads", "raging-bolt", "roaring-moon", "walking-wake", "gouging-fire",
  "great-tusk", "scream-tail", "brute-bonnet", "flutter-mane", "slither-wing", "sandy-shocks", "chien-pao",
  "chi-yu", "ting-lu", "wo-chien", "mr-mime", "mr-rime", "mime-jr", "type-null", "ho-oh", "porygon-z",
  "jangmo-o", "hakamo-o", "kommo-o", "tapu-koko", "tapu-lele", "tapu-bulu", "tapu-fini", "nidoran-f", "nidoran-m",
];
/* Coletillas que no son Pokémon: tipo de carta, colección o «ex». */
const COLETILLAS = new Set(["ex", "v", "vstar", "vmax", "gx", "scr", "pbl", "m", "box", "lead"]);

/** «dragapult-dusknoir» → { lider: "dragapult", segundo: "dusknoir" }; «mega-excadrill-ex» → excadrill-mega. */
export function liderDeSlug(slug: string): { lider: string; segundo: string } {
  let s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!s) return { lider: "", segundo: "" };
  // Arquetipos con nombre propio que no empiezan por un Pokémon: se quedan tal cual.
  if (/^(basic-box|festival-lead|lost-box|future-box|ancient-box)/.test(s)) return { lider: s.replace(/-(m|scr|pbl)$/, ""), segundo: "" };
  let mega = false;
  if (s.startsWith("mega-")) { mega = true; s = s.slice(5); }
  if (s.startsWith("n-")) s = s.slice(2); // N's Zoroark → zoroark
  const comp = COMPUESTOS.find((c) => s === c || s.startsWith(`${c}-`));
  const lider0 = comp ?? s.split("-")[0];
  const resto = s.slice(lider0.length).replace(/^-/, "").split("-").filter((x) => x && !COLETILLAS.has(x));
  const comp2 = COMPUESTOS.find((c) => resto.join("-").startsWith(c));
  const segundo = comp2 ?? resto[0] ?? "";
  return { lider: mega ? `${lider0}-mega` : lider0, segundo };
}

export function parseTrainerHill(texto: string): ResultadoTH {
  const errores: string[] = [];
  const lineas = texto.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lineas.length) return { filas: [], mazos: [], partidas: 0, errores: ["El fichero está vacío."] };
  const cab = lineas[0].toLowerCase().split(",").map((x) => x.trim());
  const col = (n: string) => cab.indexOf(n);
  const [i1, i2, iw, il, it] = ["deck1", "deck2", "wins", "losses", "ties"].map(col);
  if ([i1, i2, iw, il].some((i) => i < 0)) {
    return { filas: [], mazos: [], partidas: 0, errores: ["No es un CSV de emparejamientos de Trainer Hill (faltan deck1, deck2, wins o losses)."] };
  }
  const vistos = new Set<string>();
  const filas: FilaTH[] = [];
  const mazos = new Set<string>();
  for (let k = 1; k < lineas.length; k++) {
    const c = lineas[k].split(",").map((x) => x.trim());
    const d1 = c[i1], d2 = c[i2];
    const w = Number(c[iw]), l = Number(c[il]), t = it >= 0 ? Number(c[it]) : 0;
    if (!d1 || !d2 || ![w, l, t].every((x) => Number.isFinite(x) && x >= 0)) { errores.push(`Línea ${k + 1}: no se entiende.`); continue; }
    mazos.add(d1); mazos.add(d2);
    if (d1 === d2) continue; // el espejo del mismo mazo no informa
    const clave = d1 < d2 ? `${d1}|${d2}` : `${d2}|${d1}`;
    if (vistos.has(clave)) continue; // ya está en el otro sentido
    vistos.add(clave);
    const a = liderDeSlug(d1), b = liderDeSlug(d2);
    filas.push({ deck1: d1, deck2: d2, lider1: a.lider, lider2: b.lider, w, l, t });
  }
  return { filas, mazos: [...mazos].sort(), partidas: filas.reduce((s, f) => s + f.w + f.l + f.t, 0), errores };
}
