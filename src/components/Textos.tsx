"use client";

import type { ReactNode } from "react";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.108 — Textos traducidos para `ui.tsx`.

   `ui.tsx` lo usan a la vez componentes de servidor y de cliente, así que no
   puede llamar ni a `getLang()` (solo servidor) ni a `useLang()` (un hook).
   Estas piezas son de cliente y leen el idioma del `LangProvider`; un
   componente de servidor puede pintarlas dentro sin problema. Así se traducen
   los últimos textos fijos que quedaban (v0.108, tarea 8).
   ========================================================================= */

/** Un texto suelto. */
export function T({ k }: { k: string }) {
  const lng = useLang();
  return <>{tr(lng, k)}</>;
}

/** Un <span> con `title` (y, si se pide, `aria-label`) traducidos. */
export function SpanT({ k, aria = false, className, children }: { k: string; aria?: boolean; className?: string; children?: ReactNode }) {
  const lng = useLang();
  const t = tr(lng, k);
  return <span className={className} title={t} aria-label={aria ? t : undefined}>{children}</span>;
}
