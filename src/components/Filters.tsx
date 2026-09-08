"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

/** Filtros que escriben en la URL: se pueden compartir y volver atrás. */
export function Filters({
  basePath, fields,
}: {
  basePath: string;
  fields: Array<{ name: string; label: string; placeholder: string; options: Option[] }>;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const active = fields.filter((f) => params.get(f.name)).length;

  function change(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    const qs = next.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <details className="card mb-4" open={active > 0}>
      <summary className="tap cursor-pointer justify-start px-4 text-sm font-semibold">
        Filtros {active > 0 && <span className="chip chip-brand">{active}</span>}
      </summary>
      <div className="grid gap-3 border-t border-line-soft p-4 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <div className="flex flex-col gap-1.5" key={f.name}>
            <label className="label" htmlFor={`f-${f.name}`}>{f.label}</label>
            <select
              id={`f-${f.name}`} className="input"
              value={params.get(f.name) ?? ""}
              onChange={(e) => change(f.name, e.target.value)}
            >
              <option value="">{f.placeholder}</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        ))}
      </div>
    </details>
  );
}
