import Link from "next/link";

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
export default function SinConexion() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-bold">Sin conexión</h1>
      <p className="text-sm text-muted">
        La app necesita red para enseñarte los datos de la liga: los resultados, el ranking y los
        torneos están en el servidor, no en el teléfono.
      </p>
      <p className="text-sm text-muted">
        En cuanto vuelva la cobertura, recarga.
      </p>
      <Link href="/" className="btn btn-brand">Reintentar</Link>
    </main>
  );
}
