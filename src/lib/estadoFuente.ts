/* =========================================================================
   v0.63 — Qué significa la respuesta de una fuente externa.

   Sin imports. El diagnóstico de Ciphermaniac enseñaba «403» a secas y eso
   se leía como «la app está rota». No lo está: cada código quiere decir una
   cosa distinta, y en el caso del 403 la solución no está en nuestro lado.
   ========================================================================= */

export type TipoEstado = "ok" | "bloqueado" | "noExiste" | "red" | "limite" | "servidor" | "otro";

export function tipoDeEstado(estado: string | number): TipoEstado {
  const s = String(estado);
  if (s === "200") return "ok";
  if (s === "red") return "red";
  if (s === "401" || s === "403") return "bloqueado";
  if (s === "404" || s === "410") return "noExiste";
  if (s === "429") return "limite";
  if (/^5\d\d$/.test(s)) return "servidor";
  return "otro";
}

/** El peor estado de una lista manda: si algo está bloqueado, eso es lo que hay que contar. */
export function resumenEstados(estados: Array<string | number>): TipoEstado {
  const orden: TipoEstado[] = ["bloqueado", "red", "limite", "servidor", "otro", "noExiste", "ok"];
  const tipos = new Set(estados.map(tipoDeEstado));
  return orden.find((t) => tipos.has(t)) ?? "ok";
}
