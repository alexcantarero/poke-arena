"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/primitives";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.20 — Las gráficas de Recharts, cargadas bajo demanda.

   Recharts pesa ~100 kB comprimido. Importado tal cual, viaja en el paquete
   de la página aunque la gráfica esté al final y nadie llegue a verla. Con
   `next/dynamic` el código se pide después de pintar la página, y mientras
   tanto sale un hueco con la forma de la gráfica (sin saltos).

   `ssr: false` porque son gráficas de cliente (miden el contenedor). Tiene
   que vivir en un componente de cliente: Next no deja usar `ssr: false`
   desde un Server Component, por eso este fichero existe.
   ========================================================================= */

const Hueco = ({ alto = "h-64" }: { alto?: string }) => (
  <div role="status" aria-label="Cargando gráfica">
    <Skeleton className={`${alto} w-full`} />
  </div>
);

export const LadderChartLazy = dynamic(
  () => import("./LadderChart").then((m) => m.LadderChart),
  { ssr: false, loading: () => <Hueco alto="h-72" /> },
);

export const ConversionChartLazy = dynamic(
  () => import("./ConversionChart").then((m) => m.ConversionChart),
  { ssr: false, loading: () => <Hueco /> },
);

/** v0.24: conversión mes a mes por grupo, jugadores y mazos. */
export const ConversionEvolucionLazy = dynamic(
  () => import("./ConversionEvolucion").then((m) => m.ConversionEvolucion),
  { ssr: false, loading: () => <Hueco alto="h-80" /> },
);

/* -------------------------------------------------------------------------
   v0.34 — Las dos que se habían quedado fuera.

   `/estadisticas` y `LigaStats` importaban `TrendLineChart` y `HourlyChart`
   desde `@/components/charts`, que es un barril: reexporta esas dos (que sí
   usan Recharts) junto a `KpiCard` y `SegmentedFilter` (que no). Importar
   cualquier cosa del barril arrastraba Recharts al paquete de la página,
   aunque la gráfica estuviera al final y nadie bajara a verla.

   Medido sobre el build del 13/10: `/estadisticas` pesaba 788 kB de
   JavaScript y `/competiciones/[id]` 737, contra los ~370 del resto. Eran
   las dos únicas rutas con ese problema, y son dos de las más visitadas.

   Arreglo en dos partes: estas dos envueltas en `dynamic`, y `KpiCard` y
   `SegmentedFilter` importados de su fichero, no del barril.
   ------------------------------------------------------------------------- */

export const TrendLineChartLazy = dynamic(
  () => import("@/components/charts/TrendLineChart").then((m) => m.TrendLineChart),
  { ssr: false, loading: () => <Hueco alto="h-56" /> },
);

export const HourlyChartLazy = dynamic(
  () => import("@/components/charts/HourlyChart").then((m) => m.HourlyChart),
  { ssr: false, loading: () => <Hueco alto="h-56" /> },
);

/* v0.50 — el seguimiento de jugadores: Recharts no entra hasta que se ve. */
export const SeguimientoJugadoresLazy = dynamic(
  () => import("@/components/charts/SeguimientoJugadores").then((m) => m.SeguimientoJugadores),
  { ssr: false, loading: () => <Hueco alto="h-96" /> },
);
