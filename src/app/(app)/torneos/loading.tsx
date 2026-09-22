import { PageSkeleton } from "@/components/primitives";

export default function Loading() {
  return <PageSkeleton kpis={3} cards={0} rows={6} />;
}
