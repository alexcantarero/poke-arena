import Link from "next/link";
import { Icon } from "@/components/icons";

/* Un enlace a una partida borrada, un mazo que ya no está, una URL escrita a
   mano. Pasa, y cuando pasa conviene que la app siga pareciendo la app. */
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 text-muted">
        <Icon name="search" className="size-7" />
      </span>
      <h1 className="font-display text-5xl font-extrabold leading-none text-muted">404</h1>
      <h2 className="text-xl font-bold">Aquí no hay nada</h2>
      <p className="text-sm text-muted">
        La página que buscas no existe, o lo que había se ha borrado. Si has llegado desde un
        enlace de dentro de la app, dínoslo: eso sí es un fallo.
      </p>
      <Link className="btn btn-brand" href="/">Volver al inicio</Link>
    </div>
  );
}
