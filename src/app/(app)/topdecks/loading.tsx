import { PageSkeleton } from "@/components/primitives";

/* Esta tarda de verdad: son varias llamadas encadenadas a Limitless. Es la
   pantalla donde el esqueleto más se agradece. */
export default function Loading() {
  return <PageSkeleton kpis={4} cards={0} rows={10} />;
}
