import { CargandoBall } from "@/components/CargandoBall";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/**
 * Torneos.
 *
 * v0.46 — una Ball en el centro con un círculo blanco girando, en lugar del
 * esqueleto gris de antes. Next la enseña sola mientras el servidor contesta,
 * también al cambiar de pestaña. En Vercel y Neon en plan gratuito, la
 * primera consulta tras un rato despierta la base de datos y tarda un par de
 * segundos: sin esto, esos segundos son una pantalla en blanco, que es como
 * se ve una web rota.
 */
export default async function Loading() {
  const lng = await getLang(); // v0.49

  return <CargandoBall texto={tr(lng, "x.a0ffb3fc")} />;
}
