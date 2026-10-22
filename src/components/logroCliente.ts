"use client";

import { desbloquearLogro } from "@/actions";

/* v0.65 — Ganar un logro secreto desde cualquier easter egg.

   Se llama a la acción del servidor una vez por logro y navegador (la marca
   en `sessionStorage` evita repetir la llamada en cada clic), y si era nuevo
   se avisa con un evento que pinta `LogroAviso`. Nunca rompe nada: si falla
   la red, el egg sale igual y el logro se intentará la próxima vez. */
export function ganarLogro(clave: string) {
  try {
    const marca = `arena:logro:${clave}`;
    if (sessionStorage.getItem(marca)) return;
    sessionStorage.setItem(marca, "1");
  } catch { /* almacenamiento capado: se llama igual */ }
  desbloquearLogro(clave)
    .then((nuevo) => {
      if (nuevo) window.dispatchEvent(new CustomEvent("arena:logro", { detail: clave }));
    })
    .catch(() => { /* sin red: otra vez será */ });
}
