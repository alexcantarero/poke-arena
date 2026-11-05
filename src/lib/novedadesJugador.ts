import "server-only";
import type { Snapshot } from "@/lib/data";
import type { PublicPlayer } from "@/lib/types";
import { badgesOf } from "@/lib/badges";
import { titulosDisponibles } from "@/lib/logros";
import { urlDeObjeto } from "@/lib/objetos";
import { avanceTitulosDeJugador, entradaMedallasDeJugador } from "@/lib/perfilTitulos";
import { tr, type Lang } from "@/lib/i18n";
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

export function novedadesDeJugador(snap: Snapshot, player: Pick<PublicPlayer, "id" | "logros">, lng: Lang): { medallas: Novedad[]; titulos: Novedad[] } {
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
  return { medallas, titulos };
}
