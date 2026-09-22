import { PageSkeleton } from "@/components/primitives";

/**
 * Lo que se ve en cualquier pantalla del grupo mientras el servidor contesta.
 *
 * Next lo enseña solo, sin que ninguna pantalla tenga que pedirlo: basta con
 * que el fichero se llame así y esté en la carpeta. Cada sección puede poner
 * el suyo con una forma más parecida a la que le toca —ranking y estadísticas
 * lo hacen—; las que no, caen aquí.
 *
 * Por qué merece la pena: en Vercel y Neon en plan gratuito, la primera
 * consulta después de un rato de silencio despierta la base de datos y puede
 * tardar un par de segundos. Sin esto, esos dos segundos son una pantalla en
 * blanco, que es exactamente como se ve una web rota.
 */
export default function Loading() {
  return <PageSkeleton kpis={4} cards={2} />;
}
