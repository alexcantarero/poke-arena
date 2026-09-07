"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Option = { value: string; label: string };

/** Selectores que escriben en la query string y recargan la página en el servidor. */
export function Filters({
  basePath, fields,
}: {
  basePath: string;
  fields: Array<{ name: string; label: string; placeholder: string; options: Option[] }>;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function change(name: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(name, value);
    else next.delete(name);
    const qs = next.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="grid g-4">
        {fields.map((f) => (
          <div className="field" key={f.name}>
            <label htmlFor={`f-${f.name}`}>{f.label}</label>
            <select
              id={`f-${f.name}`}
              className="inp"
              value={params.get(f.name) ?? ""}
              onChange={(e) => change(f.name, e.target.value)}
            >
              <option value="">{f.placeholder}</option>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
