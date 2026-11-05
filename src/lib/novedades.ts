/* =========================================================================
   v0.107 — ¿Qué hay NUEVO desde la última visita? (medallas, títulos…)

   Sin imports, para probarlo.

   Medallas y títulos se calculan en el servidor a partir de las partidas: no
   hay un momento «se ha ganado» que avise. Así que el navegador guarda la
   lista de lo que ya vio y, al volver, celebra lo que no estaba.

   La PRIMERA vez (sin nada guardado) no se celebra nada: solo se guarda. Si
   no, al estrenar la versión todo el mundo vería cinco fiestas seguidas por
   medallas que tiene desde hace semanas.
   ========================================================================= */

export function nuevosDesde(vistos: string[] | null, actuales: string[]): { nuevos: string[]; guardar: string[] } {
  const guardar = [...new Set(actuales)].sort();
  if (vistos == null) return { nuevos: [], guardar };
  const antes = new Set(vistos);
  return { nuevos: guardar.filter((id) => !antes.has(id)), guardar };
}

/** Lee la lista guardada; cualquier cosa rara cuenta como «nada guardado». */
export function leerVistos(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) && v.every((x) => typeof x === "string") ? v : null;
  } catch {
    return null;
  }
}
