import Link from "next/link";

/* v0.120 — Una tarjeta-enlace a una sección que ya no está en el menú: el
   Cinturón vive dentro de Torneos y la Liga por divisiones dentro de Liga. */
export function TarjetaAcceso({ href, titulo, texto, accion, estado }: {
  href: string; titulo: string; texto: string; accion: string; estado?: string | null;
}) {
  return (
    <Link href={href} className="card tarjeta-acceso mb-4">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-display text-base font-extrabold text-ink">{titulo}</span>
          {estado && <span className="chip chip-brand text-[10px]">{estado}</span>}
        </span>
        <span className="mt-0.5 block text-sm text-muted">{texto}</span>
      </span>
      <span className="btn btn-sm flex-none">{accion}</span>
    </Link>
  );
}
