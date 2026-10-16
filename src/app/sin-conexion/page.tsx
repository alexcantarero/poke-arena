import Link from "next/link";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

export const metadata = { title: "Sin conexión" };

/**
 * La página que sirve el service worker cuando no hay red.
 *
 * Fuera del grupo `(app)` a propósito: ese layout pide la sesión y la base de
 * datos, y aquí precisamente no hay red con la que pedirlas. Tiene que poder
 * pintarse con lo que haya en el disco del teléfono y nada más.
 *
 * Y no finge: no enseña datos viejos ni dice que todo va bien. Dice que no
 * hay red, y ya.
 */
export default async function SinConexion() {
  const lng = await getLang(); // v0.49

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-bold">{tr(lng, "x.33b7e702")}</h1>
      <p className="text-sm text-muted">
        {tr(lng, "x.d06daf4b")}
      </p>
      <p className="text-sm text-muted">
        {tr(lng, "x.d2c11273")}
      </p>
      <Link href="/" className="btn btn-brand">{tr(lng, "x.adec7b4f")}</Link>
    </main>
  );
}
