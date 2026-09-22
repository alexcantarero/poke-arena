import { PageSkeleton } from "@/components/primitives";

/* Estadísticas es la pantalla más pesada: calcula la matriz, los arquetipos y
   la actividad por mes sobre todas las partidas. Merece su propio hueco, con
   más tarjetas que el genérico. */
export default function Loading() {
  return <PageSkeleton kpis={4} cards={4} />;
}
