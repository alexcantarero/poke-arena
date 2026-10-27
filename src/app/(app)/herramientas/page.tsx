import { currentPlayer, loadSnapshot } from "@/lib/data";
import { PageHead } from "@/components/ui";
import { Herramientas, type MazoHerramienta } from "@/components/Herramientas";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* v0.71 — Herramientas: calculadora suiza, consistencia, premios y el
   simulador de manos (antes en la ficha de cada mazo). */

export const metadata = { title: "Herramientas" };

export default async function HerramientasPage({ searchParams }: { searchParams: Promise<{ h?: string; mazo?: string }> }) {
  const lng = await getLang(); // v0.49
  const q = await searchParams;
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  // Para el simulador de manos: tus mazos primero, luego los de la liga; solo los que tienen lista.
  const conLista = snap.decks.filter((d) => d.list.trim() && !d.retired);
  const mazos: MazoHerramienta[] = [
    ...conLista.filter((d) => d.playerId === me?.id),
    ...conLista.filter((d) => d.playerId !== me?.id),
  ].map((d) => ({ id: d.id, name: d.name, list: d.list, listJson: d.listJson }));

  return (
    <>
      <PageHead title={tr(lng, "hr.titulo")} sub={tr(lng, "hr.sub")} />
      <Herramientas mazos={mazos} inicial={q.h} mazoInicial={q.mazo} />
    </>
  );
}
