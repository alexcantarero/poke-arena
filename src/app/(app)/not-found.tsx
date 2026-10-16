import Link from "next/link";
import { Icon } from "@/components/icons";
import { tr } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* Un enlace a una partida borrada, un mazo que ya no está, una URL escrita a
   mano. Pasa, y cuando pasa conviene que la app siga pareciendo la app. */
export default async function NotFound() {
  const lng = await getLang(); // v0.49

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl border border-line bg-surface-2 text-muted">
        <Icon name="search" className="size-7" />
      </span>
      <h1 className="font-display text-5xl font-extrabold leading-none text-muted">404</h1>
      <h2 className="text-xl font-bold">{tr(lng, "x.9b0c48d0")}</h2>
      <p className="text-sm text-muted">
        {tr(lng, "x.13bc088f")}
      </p>
      <Link className="btn btn-brand" href="/">{tr(lng, "x.1afb1193")}</Link>
    </div>
  );
}
