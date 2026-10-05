"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/primitives";

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
