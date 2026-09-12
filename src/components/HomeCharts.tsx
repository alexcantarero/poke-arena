"use client";

import type { ReactNode } from "react";
import { Tabs } from "./Tabs";
import { CpChart, EloChart, MetaChart, type CpBar, type EloSeries, type MetaRow } from "./charts";

/* =========================================================================
   El panel del inicio.

   Tres cortes de lo mismo, en pestañas y no uno debajo de otro: en el móvil,
   apilarlos deja el tercero a dos pantallas de scroll y nadie llega. Y son
   preguntas distintas —cómo va la liga, qué se juega, cómo van mis CP—, así
   que tampoco quieres las tres a la vez.

   Los datos llegan ya calculados desde el Server Component: aquí no se
   computa nada, solo se dibuja. Es lo que permite que el motor de
   estadísticas siga siendo puro y probable sin arrastrar React.
   ========================================================================= */

export function HomeCharts({
  elo, eloStart, meta, cp, season, sprites,
}: {
  elo: EloSeries[];
  eloStart: number;
  meta: Omit<MetaRow, "sprite">[];
  cp: CpBar[];
  season: number;
  /** Sprites por id de arquetipo, pintados en el servidor. */
  sprites: Record<string, ReactNode>;
}) {
  const metaRows: MetaRow[] = meta.map((r) => ({ ...r, sprite: sprites[r.id] }));

  const tabs = [
    {
      id: "elo",
      label: "Elo",
      badge: elo.length || undefined,
      panel: <EloChart series={elo} start={eloStart} />,
    },
    {
      id: "meta",
      label: "Metajuego",
      badge: meta.length || undefined,
      panel: <MetaChart rows={metaRows} />,
    },
    {
      id: "cp",
      label: "Tus CP",
      badge: cp.reduce((a, b) => a + b.total, 0) || undefined,
      panel: <CpChart bars={cp} season={season} />,
    },
  ];

  return (
    <section className="card mt-4 overflow-hidden">
      <div className="card-head">
        <h2 className="text-lg font-bold">Cómo va la cosa</h2>
      </div>
      <Tabs tabs={tabs} />
    </section>
  );
}
