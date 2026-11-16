import { currentPlayer, loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { Herramientas, type MazoHerramienta } from "@/components/Herramientas";
import { cargarDatosRecomendador } from "@/lib/recomendadorDatos";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* v0.71 — Herramientas: calculadora suiza, consistencia, premios y el
   simulador de manos (antes en la ficha de cada mazo). */

export const metadata = { title: "Herramientas" };

export default async function HerramientasPage({ searchParams }: { searchParams: Promise<{ h?: string; mazo?: string; tipo?: string; jug?: string; v?: string; d?: string; e?: string; t?: string }> }) {
  const lng = await getLang(); // v0.49
  const q = await searchParams;
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  // Para el simulador de manos: tus mazos primero, luego los de la liga; solo los que tienen lista.
  const conLista = snap.decks.filter((d) => d.list.trim() && !d.retired);
  const mazos: MazoHerramienta[] = [
    ...conLista.filter((d) => d.playerId === me?.id),
    ...conLista.filter((d) => d.playerId !== me?.id),
  ].map((d) => ({ id: d.id, name: d.name, list: d.list, listJson: d.listJson }));
  // v0.74 — el recomendador: todo agregado por Pokémon líder. Si algo falla, la pestaña lo dice.
  const datos = await cargarDatosRecomendador(snap, me?.id).catch(() => null);

  return (
    <>
      <PageHead title={tr(lng, "hr.titulo")} sub={tr(lng, "hr.sub")} />
      <Herramientas mazos={mazos} inicial={q.h} mazoInicial={q.mazo} datos={datos}
        /* v0.133 — desde un torneo: la calculadora suiza ya rellena. */
        suiza={q.jug && Number(q.jug) > 0 ? {
          tipo: (q.tipo ?? "").slice(0, 30), jugadores: Math.min(5000, Math.round(Number(q.jug))),
          v: Math.max(0, Math.round(Number(q.v) || 0)), d: Math.max(0, Math.round(Number(q.d) || 0)), e: Math.max(0, Math.round(Number(q.e) || 0)),
          temporada: Number(q.t) > 2000 ? Number(q.t) : undefined,
        } : undefined} />
    </>
  );
}
