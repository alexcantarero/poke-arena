import "server-only";
import type { Snapshot } from "@/lib/data";
import type { PublicPlayer } from "@/lib/types";
import { badgesOf } from "@/lib/badges";
import { titulosDisponibles } from "@/lib/logros";
import { urlDeObjeto } from "@/lib/objetos";
import { avanceTitulosDeJugador, entradaMedallasDeJugador } from "@/lib/perfilTitulos";
import { tr, type Lang } from "@/lib/i18n";
import { divisionDeElo, divisionesAlcanzadas } from "@/lib/divisionElo";
import type { Novedad } from "@/components/CelebrarNuevos";

/* =========================================================================
   v0.107 — Las medallas y títulos que tiene AHORA un jugador, listos para
   `CelebrarNuevos`. Lo usan el perfil propio y el Inicio (mismas claves de
   `localStorage`, así que nada se celebra dos veces).

   Se calcula sobre el snapshot, que esas dos pantallas ya cargan: no añade
   consultas. Los títulos de logros secretos no entran: esos ya se celebran al
   encontrarlos (`arena:logro`).
   ========================================================================= */

const IMG_TIER = { bronze: "star-piece", silver: "bottle-cap", gold: "gold-bottle-cap" } as const;

export function novedadesDeJugador(snap: Snapshot, player: Pick<PublicPlayer, "id" | "logros" | "beltHolder">, lng: Lang): { medallas: Novedad[]; titulos: Novedad[]; divisiones: Novedad[] } {
  const entrada = entradaMedallasDeJugador(snap, player.id);
  const avance = avanceTitulosDeJugador(snap, player.id, entrada);
  const medallas = badgesOf(entrada).filter((b) => b.tier !== "none").map((b) => ({
    id: `${b.id}:${b.tier}`,
    etiqueta: tr(lng, `cel.medalla.${b.tier}`),
    nombre: b.name,
    img: urlDeObjeto(IMG_TIER[b.tier as keyof typeof IMG_TIER]),
  }));
  const titulos = titulosDisponibles(player.logros, avance)
    .filter((t) => t.grupo !== "inicio" && !t.id.startsWith("logro:"))
    .map((t) => ({ id: `${t.id}:${t.clave}`, etiqueta: tr(lng, "cel.titulo"), nombre: tr(lng, t.clave), img: urlDeObjeto("rare-candy") }));
  /* v0.117 — la división de Elo: al subir, celebración (ver `divisionesAlcanzadas`). */
  const forma = snap.forma[player.id];
  const actual = forma
    ? divisionDeElo(forma.forma, { challenger: Boolean(player.beltHolder), partidas: snap.elo.jugadas[player.id] ?? 0 }).id
    : "novato";
  const divisiones = divisionesAlcanzadas(actual).map((d) => ({
    id: `division:${d}`, etiqueta: tr(lng, "v117.celDivision"), nombre: tr(lng, `v115.div.${d}`), img: urlDeObjeto("exp-share"),
  }));
  return { medallas, titulos, divisiones };
}
