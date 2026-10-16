/* =========================================================================
   ¿Cuánto falta por traducir?

       npm run verificar:i18n          el informe: qué ficheros, cuántos textos
       npm run verificar:i18n -- --estricto
                                       falla si una pantalla YA traducida
                                       vuelve a tener texto sin traducir

   v0.48. Sin esto, «el inglés está completo» es una impresión. Busca texto
   visible escrito a mano en los .tsx: lo que va entre etiquetas (>Hola<) y
   los atributos que se leen (placeholder, title, aria-label, label…). Es
   una aproximación: no entiende JSX, así que puede contar de más algún
   nombre propio o de menos un texto armado en una variable. Para medir el
   avance y no retroceder, basta.

   Solo Node, sin dependencias.
   ========================================================================= */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/* Las pantallas que YA están traducidas enteras. Con `--estricto`, cualquier
   texto a mano en estas hace fallar la comprobación: así una pantalla
   traducida no puede volver a medias sin que nadie se entere. Se añaden aquí
   a medida que se traducen. */
const TRADUCIDAS = [
  // v0.49 — todo lo que quedó limpio al traducir la app entera.
  "src/app/(app)/competiciones/[id]/page.tsx",
  "src/app/(app)/competiciones/page.tsx",
  "src/app/(app)/error.tsx",
  "src/app/(app)/estadisticas/loading.tsx",
  "src/app/(app)/estadisticas/page.tsx",
  "src/app/(app)/layout.tsx",
  "src/app/(app)/loading.tsx",
  "src/app/(app)/mas/page.tsx",
  "src/app/(app)/mazos/[id]/page.tsx",
  "src/app/(app)/mazos/nuevo/page.tsx",
  "src/app/(app)/mazos/page.tsx",
  "src/app/(app)/mesa/TableTracker.tsx",
  "src/app/(app)/mesa/page.tsx",
  "src/app/(app)/not-found.tsx",
  "src/app/(app)/page.tsx",
  "src/app/(app)/partidas/[id]/page.tsx",
  "src/app/(app)/partidas/nueva/page.tsx",
  "src/app/(app)/perfil/[id]/page.tsx",
  "src/app/(app)/perfil/editar/page.tsx",
  "src/app/(app)/ranking/loading.tsx",
  "src/app/(app)/resultados/loading.tsx",
  "src/app/(app)/resultados/page.tsx",
  "src/app/(app)/template.tsx",
  "src/app/(app)/topdecks/loading.tsx",
  "src/app/(app)/topdecks/page.tsx",
  "src/app/(app)/torneos/[id]/editar/page.tsx",
  "src/app/(app)/torneos/[id]/page.tsx",
  "src/app/(app)/torneos/loading.tsx",
  "src/app/(app)/torneos/nuevo/page.tsx",
  "src/app/entrar/page.tsx",
  "src/app/global-error.tsx",
  "src/app/layout.tsx",
  "src/app/not-found.tsx",
  "src/app/registro/[token]/page.tsx",
  "src/app/registro/page.tsx",
  "src/app/sin-conexion/page.tsx",
  "src/components/ArchetypeSync.tsx",
  "src/components/AttendanceForm.tsx",
  "src/components/AutoSubmitForm.tsx",
  "src/components/BadgeCase.tsx",
  "src/components/BestFinishes.tsx",
  "src/components/CaminoAlCorte.tsx",
  "src/components/CardSearch.tsx",
  "src/components/CargandoBall.tsx",
  "src/components/CompetitionForm.tsx",
  "src/components/ConfirmButton.tsx",
  "src/components/ConversionTable.tsx",
  "src/components/CpBreakdown.tsx",
  "src/components/DeckForm.tsx",
  "src/components/DeckList.tsx",
  "src/components/DeckPicker.tsx",
  "src/components/Emblems.tsx",
  "src/components/EnlaceArquetipo.tsx",
  "src/components/EventForm.tsx",
  "src/components/FavStar.tsx",
  "src/components/FilterMemory.tsx",
  "src/components/FilterPanel.tsx",
  "src/components/H2HHeatmap.tsx",
  "src/components/InviteManager.tsx",
  "src/components/Ladder.tsx",
  "src/components/LangProvider.tsx",
  "src/components/LangToggle.tsx",
  "src/components/LigaStats.tsx",
  "src/components/LoginForm.tsx",
  "src/components/MatchForm.tsx",
  "src/components/Matrix.tsx",
  "src/components/MetaIrlTable.tsx",
  "src/components/MetaTabs.tsx",
  "src/components/MotionToggle.tsx",
  "src/components/MulliganSim.tsx",
  "src/components/Nav.tsx",
  "src/components/PasswordForm.tsx",
  "src/components/PlayerAdmin.tsx",
  "src/components/PrizePicker.tsx",
  "src/components/ProfileForm.tsx",
  "src/components/RankingTable.tsx",
  "src/components/RankingTodoTable.tsx",
  "src/components/RegionalPicker.tsx",
  "src/components/RegisterForm.tsx",
  "src/components/RondasDelGrupo.tsx",
  "src/components/RoundForm.tsx",
  "src/components/ScopeTabs.tsx",
  "src/components/SeasonFx.tsx",
  "src/components/SeasonPokemonButton.tsx",
  "src/components/SeasonPokemonTrigger.tsx",
  "src/components/SeccionPlegable.tsx",
  "src/components/ServiceWorker.tsx",
  "src/components/ServiceWorkerOff.tsx",
  "src/components/Snackbar.tsx",
  "src/components/ThemeToggle.tsx",
  "src/components/TournamentForm.tsx",
  "src/components/TournamentLifecycle.tsx",
  "src/components/TournamentRankingTable.tsx",
  "src/components/TournamentResultForm.tsx",
  "src/components/UltimoRegional.tsx",
  "src/components/Wordmark.tsx",
  "src/components/charts.tsx",
  "src/components/charts/HourlyChart.tsx",
  "src/components/charts/KpiCard.tsx",
  "src/components/charts/RankingBars.tsx",
  "src/components/charts/SegmentedFilter.tsx",
  "src/components/charts/TrendLineChart.tsx",
  "src/components/icons.tsx",
  "src/components/primitives.tsx",
  "src/components/statistics/Charts.tsx",
  "src/components/statistics/ConversionChart.tsx",
  "src/components/statistics/ConversionEvolucion.tsx",
  "src/components/statistics/GlobalMeta.tsx",
  "src/components/statistics/KPICards.tsx",
  "src/components/statistics/LadderChart.tsx",
  "src/components/statistics/LastEvent.tsx",
  "src/components/statistics/SortToggle.tsx",
  "src/components/statistics/SourceTabs.tsx",
];

/* Lo que no es texto que traducir: nombres de marca, siglas, símbolos. */
const IGNORAR = new Set([
  "PokeArena TCG", "PokeArena", "TCG", "CP", "Elo", "Bo1", "Bo3", "Bo5", "vs", "VS",
  "Top Decks", "Limitless", "Play! Pokémon", "Pokémon", "PTCG Live", "Online", "—", "·",
]);

// Texto entre etiquetas, también si ocupa varias líneas (v0.48: antes se
// escapaban los párrafos partidos, y la cifra salía más baja de lo real).
const TXT = />\s*([^<>{}]*[A-Za-zÁÉÍÓÚáéíóúñÑ¿¡][^<>{}]*?)\s*</g;
// Un trozo de código atrapado entre un > y un <: «t.date», «) : isTop2 ? (».
// Un texto de interfaz no lleva nunca estas cosas.
// Ojo: código es «t.date», con una letra DETRÁS del punto. «Sin partidas.» lo
// lleva al final y es una frase: v0.49, antes se descartaban las frases.
const ES_CODIGO = /^\(?[A-Za-z_]\w*\.[A-Za-z_]/;
const RASGOS_DE_CODIGO = /\) :|\? \(|=>|&&|\|\||;|\bconst |className|\bnull\b|^\)|^:|\?$/;
const ATR = /\b(?:placeholder|title|aria-label|label|sub|emptyLabel|texto|alt)="([^"]*[A-Za-zñáéíóú][^"]*)"/g;

const raiz = process.cwd();
const resultados = [];

function revisa(ruta) {
  let s = readFileSync(ruta, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const encontrados = [];
  for (const m of s.matchAll(TXT)) {
    const t = m[1].replace(/\s+/g, " ").trim();
    if (t.length > 1 && !IGNORAR.has(t) && !ES_CODIGO.test(t) && !/["]|\/\//.test(t) && !RASGOS_DE_CODIGO.test(t)) encontrados.push(t);
  }
  for (const m of s.matchAll(ATR)) {
    const t = m[1].trim();
    if (t && !IGNORAR.has(t)) encontrados.push(t);
  }
  if (encontrados.length) resultados.push({ fichero: relative(raiz, ruta), textos: encontrados });
}

function recorre(dir) {
  for (const n of readdirSync(dir)) {
    const r = join(dir, n);
    if (statSync(r).isDirectory()) recorre(r);
    else if (n.endsWith(".tsx")) revisa(r);
  }
}
recorre(join(raiz, "src", "app"));
recorre(join(raiz, "src", "components"));

const total = resultados.reduce((s, r) => s + r.textos.length, 0);
resultados.sort((a, b) => b.textos.length - a.textos.length);

const estricto = process.argv.includes("--estricto");
const sucias = resultados.filter((r) => TRADUCIDAS.includes(r.fichero.replace(/\\/g, "/")));

console.log(`\nTextos sin traducir: ~${total} en ${resultados.length} ficheros.`);
console.log(`Pantallas ya traducidas: ${TRADUCIDAS.length}.\n`);
// `--todos` lista todos los ficheros; sin él, los quince con más texto.
const lista = process.argv.includes("--todos") ? resultados : resultados.slice(0, 15);
for (const r of lista) console.log(`  ${String(r.textos.length).padStart(4)}  ${r.fichero}`);
if (lista.length < resultados.length) console.log(`  … y ${resultados.length - lista.length} ficheros más (--todos para verlos).`);

if (sucias.length) {
  console.log("\n✗ Pantallas marcadas como traducidas con texto a mano:\n");
  for (const r of sucias) {
    console.log(`  ${r.fichero}`);
    for (const t of r.textos.slice(0, 8)) console.log(`      «${t.slice(0, 70)}»`);
  }
  if (estricto) process.exit(1);
}
console.log("");
