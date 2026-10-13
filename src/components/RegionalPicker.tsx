"use client";

import { setPersonalRegional } from "@/actions";

export function RegionalPicker({
  regionales,
  currentId,
}: {
  regionales: Array<{ id: string; name: string }>;
  currentId?: string;
}) {
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
        <button className="btn btn-sm ml-2" type="submit">Cambiar</button>
      </noscript>
    </form>
  );
}

