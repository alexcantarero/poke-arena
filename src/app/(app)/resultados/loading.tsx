import { PageSkeleton } from "@/components/primitives";

export default function Loading() {
  return <PageSkeleton kpis={0} cards={0} rows={10} />;
}
