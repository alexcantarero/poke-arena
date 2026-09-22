import { PageSkeleton } from "@/components/primitives";

/* El ranking es una lista, no un tablero: sin KPIs y con filas. */
export default function Loading() {
  return <PageSkeleton kpis={0} cards={0} rows={8} />;
}
