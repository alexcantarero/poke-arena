import Link from "next/link";

/* El 404 de las URLs que no encajan con ninguna ruta —las de fuera del grupo
   con sesión incluidas—. No lleva barra lateral ni barra inferior porque a
   este punto se llega sin saber todavía si hay alguien dentro; el enlace va a
   la portada y allí ya decide el layout si toca entrar. */
export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <p className="label">Arena</p>
        <h1 className="mt-2 font-display text-6xl font-extrabold leading-none text-muted">404</h1>
        <h2 className="mt-3 text-xl font-bold">Esta dirección no existe</h2>
        <p className="mt-2 text-sm text-muted">
          Puede que el enlace esté mal escrito o que la página se haya movido.
        </p>
        <Link className="btn btn-brand mt-6" href="/">Ir al inicio</Link>
      </div>
    </main>
  );
}
