import Link from "next/link";
import { getLang } from "@/lib/lang";
import { tr } from "@/lib/i18n";
import { PageHead } from "@/components/ui";
import { TERMINOS } from "@/lib/glosario";

/* v0.56 — Glosario: los términos que salen por la app y no todo el mundo conoce. */
export default async function Glosario() {
  const lng = await getLang(); // v0.49
  return (
    <div className="flex flex-col gap-4">
      <PageHead title={tr(lng, "glo.titulo")} sub={tr(lng, "glo.sub")} />
      <dl className="card divide-y divide-line-soft">
        {TERMINOS.map((t) => (
          <div key={t.id} id={t.id} className="scroll-mt-20 p-4 target:bg-brand-soft">
            <dt className="font-display text-lg font-bold">{tr(lng, t.nombre)}</dt>
            <dd className="mt-1 text-sm text-ink-2">{tr(lng, t.def)}</dd>
          </div>
        ))}
      </dl>
      <Link href="/reglas" className="w-fit text-sm text-info underline underline-offset-2">{tr(lng, "reg.titulo")} →</Link>
    </div>
  );
}
