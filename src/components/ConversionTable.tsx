import Link from "next/link";
import type { ReactNode } from "react";
import type { ConvStats } from "@/lib/tournamentStats";
import { pct, wrColor } from "@/lib/format";
import { tr, trf } from "@/lib/i18n";
import { getLang } from "@/lib/lang";

/* =========================================================================
   La tabla de conversión.

   Contesta la pregunta que el ranking normal no contesta: **de cada diez
   veces que vas a un torneo, cuántas llegas**. Sirve igual para gente y para
   mazos, así que es una sola tabla con filas genéricas.

   Por qué un guion y no un cero cuando falta el dato: la conversión al corte
   solo se puede calcular sobre torneos que TENÍAN corte. Si alguien solo ha
   ido a Challenges sin top cut, su conversión no es 0% — es que no hay nada
   que medir. Pintar un cero ahí sería decir algo falso de alguien.

   En móvil no hay tabla: seis columnas de porcentajes en 375px no se leen.
   Hay tarjetas con las mismas cifras.
   ========================================================================= */

export type ConvRow = ConvStats & {
  id: string;
  label: string;
  /** Avatar o sprite, ya pintado desde el servidor. */
  icon?: ReactNode;
  href?: string;
  /** % de victorias en partidas, que viene de otro sitio (las rondas). */
  matchWinRate?: number | null;
  matchWins?: number;
};

type Col = { key: keyof ConvRow; short: string; label: string };

const COLS: Col[] = [
  { key: "entries", short: "T", label: "Torneos con puesto apuntado" },
  { key: "cutRate", short: "%Cut", label: "Conversión al top cut" },
  { key: "top8Rate", short: "%T8", label: "Porcentaje de top 8" },
  { key: "top4Rate", short: "%T4", label: "Porcentaje de top 4" },
  { key: "winRate", short: "%1.º", label: "Porcentaje de torneos ganados" },
];

const esTasa = (k: keyof ConvRow) => String(k).endsWith("Rate");

export async function ConversionTable({
  rows, empty, matchColumns = false, visibles,
}: {
  rows: ConvRow[];
  empty: ReactNode;
  /** v0.80 — enseña solo los primeros N y el resto tras «Ver más» (sin JS: una casilla y `:has`). */
  visibles?: number;
  /** Añade %V y victorias de partidas, que solo tienen sentido para personas. */
  matchColumns?: boolean;
}) {
  const lng = await getLang(); // v0.49

  if (!rows.length) return <div className="px-4 py-8 text-center text-sm text-muted">{empty}</div>;

  const extra = (i: number) => (visibles != null && i >= visibles ? "fila-extra" : "");
  const sobran = visibles != null ? Math.max(0, rows.length - visibles) : 0;
  return (
    <div className="ver-mas-css">
      {sobran > 0 && <input type="checkbox" id={`vm-${rows[0].id}`} className="sr-only" />}
      {/* -------- móvil -------- */}
      <ul className="divide-y divide-line-soft md:hidden">
        {rows.map((r, i) => (
          <li key={r.id} className={`px-4 py-3 ${extra(i)}`}>
            <Cabecera row={r} />
            <div className="mt-2 grid grid-cols-2 gap-2 text-center xs:grid-cols-4">
              <Mini label={tr(lng, "x.5b766ead")} value={pct(r.cutRate, 0)} tone={r.cutRate} />
              <Mini label={tr(lng, "x.55d0b1f1")} value={pct(r.top8Rate, 0)} tone={r.top8Rate} />
              <Mini label={tr(lng, "x.045b64f6")} value={pct(r.top4Rate, 0)} tone={r.top4Rate} />
              <Mini label="1.º" value={pct(r.winRate, 0)} tone={r.winRate} />
            </div>
            {matchColumns && (
              <p className="mt-1.5 text-[11px] text-muted tabular">
                {pct(r.matchWinRate, 0)} de partidas ganadas · {r.matchWins ?? 0} victorias
              </p>
            )}
          </li>
        ))}
      </ul>

      {/* -------- escritorio --------
          `overscroll-x-contain`: sin él, al llegar al final del
          desplazamiento lateral el gesto se lo queda el navegador y se va a
          la página anterior. Con siete columnas pasa constantemente. */}
      <div className="hidden overflow-x-auto overscroll-x-contain md:block">
        <table className="tbl">
          <thead>
            <tr>
              <th>{matchColumns ? "Jugador" : tr(lng, "x.6606a664")}</th>
              {COLS.map((c) => (
                <th key={String(c.key)} className="text-right" title={c.label}>{c.short}</th>
              ))}
              {matchColumns && (
                <>
                  <th className="text-right" title={tr(lng, "x.fe938de3")}>{tr(lng, "x.39683ef7")}</th>
                  <th className="text-right" title={tr(lng, "x.a8c59de9")}>V</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`hover:bg-surface-2 ${extra(i)}`}>
                <td><Cabecera row={r} /></td>
                {COLS.map((c) => {
                  const v = r[c.key] as number | null;
                  return (
                    <td key={String(c.key)} className="text-right font-semibold tabular"
                      style={esTasa(c.key) ? { color: wrColor(v) } : undefined}>
                      {esTasa(c.key) ? pct(v, 0) : (v ?? 0)}
                    </td>
                  );
                })}
                {matchColumns && (
                  <>
                    <td className="text-right tabular" style={{ color: wrColor(r.matchWinRate ?? null) }}>
                      {pct(r.matchWinRate, 0)}
                    </td>
                    <td className="text-right tabular">{r.matchWins ?? 0}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sobran > 0 && (
        <label htmlFor={`vm-${rows[0].id}`} className="ver-mas-boton flex min-h-11 cursor-pointer items-center justify-center gap-2 border-t border-line-soft text-sm font-semibold text-info hover:bg-surface-2">
          <span className="vm-cerrado">{trf(lng, "vm.mas", { n: sobran })} ▾</span>
          <span className="vm-abierto">{tr(lng, "vm.menos")} ▴</span>
        </label>
      )}
    </div>
  );
}

function Cabecera({ row }: { row: ConvRow }) {
  const dentro = (
    <span className="inline-flex min-w-0 items-center gap-2">
      {row.icon}
      <span className="min-w-0 truncate font-semibold">{row.label}</span>
    </span>
  );
  return row.href
    ? <Link href={row.href} className="min-w-0 hover:text-info">{dentro}</Link>
    : dentro;
}

function Mini({ label, value, tone }: { label: string; value: string; tone: number | null }) {
  return (
    <span className="block">
      <span className="block font-display text-lg font-extrabold tabular leading-none"
        style={{ color: tone == null ? "var(--muted)" : wrColor(tone) }}>
        {value}
      </span>
      <span className="block text-[10px] uppercase tracking-wide text-muted">{label}</span>
    </span>
  );
}
