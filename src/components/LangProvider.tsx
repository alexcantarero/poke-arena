"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";

/* =========================================================================
   El idioma, para los componentes de cliente.

   v0.49. Los componentes de servidor leen el idioma de la cookie con
   `getLang()`. Los de cliente no pueden: no tienen acceso a la cookie
   durante el renderizado. Antes había que pasárselo por props, componente a
   componente; con esto, cualquier componente de cliente lo pide con
   `useLang()`.

   REGLA para quien lo use: `const L = useLang();` va SIEMPRE en la primera
   línea del componente, antes de cualquier `return` anticipado. Un hook
   detrás de un `return` condicional rompe React en el navegador, y eso no lo
   detectan ni `tsc` ni los tests.
   ========================================================================= */

const Contexto = createContext<Lang>("es");

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <Contexto.Provider value={lang}>{children}</Contexto.Provider>;
}

/** El idioma de la pantalla. Español si no hay proveedor por encima. */
export const useLang = (): Lang => useContext(Contexto);
