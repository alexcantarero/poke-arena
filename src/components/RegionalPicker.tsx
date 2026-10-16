"use client";

import { setPersonalRegional } from "@/actions";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

export function RegionalPicker({
  regionales,
  currentId,
}: {
  regionales: Array<{ id: string; name: string }>;
  currentId?: string;
}) {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea

  return (
    <form action={setPersonalRegional} className="inline-block relative">
      <select
        name="regionalId"
        className="appearance-none bg-transparent hover:bg-surface-2 cursor-pointer outline-none rounded pr-6 truncate max-w-full font-display text-2xl font-extrabold"
        defaultValue={currentId ?? ""}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        {regionales.map((r) => (
          <option key={r.id} value={r.id} className="text-base font-sans font-normal text-ink">
            {r.name}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-1 flex items-center px-1">
        <svg className="size-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      <noscript>
        <button className="btn btn-sm ml-2" type="submit">{tr(lng, "x.82d4e43d")}</button>
      </noscript>
    </form>
  );
}

