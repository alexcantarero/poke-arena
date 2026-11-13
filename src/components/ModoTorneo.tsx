"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { subirRondaDeCola } from "@/actions";
import {
  CLAVE_COLA, aFormulario, aplicarRespuesta, encolar, forzar, listaParaGuardar, parseCola, porSubir, quitar, recordCon, siguienteRonda,
  type EspecialCola, type ResultadoCola, type RondaEnCola,
} from "@/lib/colaRondas";
import { tr, trf } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.125 — MODO TORNEO: apuntar la ronda con el pulgar, con o sin cobertura.

   · Tres botones grandes (gané / empate / perdí), el mazo del rival a un toque
     (los más vistos primero, y un buscador) y, si quieres, quién empezó.
   · «Guardar» NO espera a la red: la ronda entra en la cola del teléfono
     (`lib/colaRondas.ts`) y el récord cambia al momento. Sube sola cuando hay
     conexión: al guardar, al volver la red y al volver a la pantalla.
   · Si en el servidor había otra ronda con ese número que este móvil no
     conocía, no se pisa: se pregunta.
   · La pantalla se guarda a sí misma para poder abrirse sin conexión (su HTML
     y los ficheros que usa, en la caché del service worker). Es la única de
     la app que lo hace, y se borra al cerrar sesión.

   Los sprites vienen de otro dominio y sin red no cargan: aquí todo va con
   texto a propósito.
   ========================================================================= */

/** `color`: el de su tipo de energía; `sprite`: URL del Pokémon principal (vacíos si no hay). */
export type OpcionMazo = { valor: string; nombre: string; color: string; sprite: string };
export type RondaVista = { ronda: number; r: "w" | "l" | "t" | null; rival: string; mazoRival: string };

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const LETRA: Record<ResultadoCola, "w" | "l" | "t"> = { a: "w", b: "l", tie: "t" };

export function ModoTorneo({
  torneoId, playerId, abierto, dropped, tope, rondas, mazoFijado, arquetipos, misMazos, frecuentes, buildId,
}: {
  torneoId: string; playerId: string; abierto: boolean; dropped: boolean; tope: number | null;
  rondas: RondaVista[]; mazoFijado: string; arquetipos: OpcionMazo[]; misMazos: OpcionMazo[]; frecuentes: string[]; buildId: string;
}) {
  const lng = useLang();
  const router = useRouter();
  const clave = CLAVE_COLA(torneoId, playerId);

  const [cola, setCola] = useState<RondaEnCola[]>([]);
  const [cargada, setCargada] = useState(false);
  const [enLinea, setEnLinea] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [guardadaOffline, setGuardadaOffline] = useState<"no" | "si" | "sinSoporte">("no");
  const colaRef = useRef<RondaEnCola[]>([]);
  const ocupado = useRef(false);
  /** Rondas que ESTE móvil ya ha subido en esta sesión: corregirlas antes de que la página se refresque no es un choque. */
  const subidas = useRef(new Set<number>());

  // --- el formulario de la ronda
  const [editando, setEditando] = useState<number | null>(null);
  const [resultado, setResultado] = useState<ResultadoCola | "">("");
  const [rival, setRival] = useState("");
  const [busca, setBusca] = useState("");
  const [primero, setPrimero] = useState<"" | "a" | "b">("");
  const [oponente, setOponente] = useState("");
  const [especial, setEspecial] = useState<EspecialCola>("");
  const [miMazo, setMiMazo] = useState("");

  const persistir = useCallback((c: RondaEnCola[]) => {
    colaRef.current = c;
    setCola(c);
    try {
      if (c.length) localStorage.setItem(clave, JSON.stringify(c));
      else localStorage.removeItem(clave);
    } catch { /* sin almacenamiento: la cola vive mientras la pantalla esté abierta */ }
  }, [clave]);

  /* Subir lo pendiente, de una en una y en orden. Si no hay red, la llamada
     falla y la ronda se queda en la cola tal cual: se reintenta más tarde. */
  const subir = useCallback(async () => {
    if (ocupado.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    const pendientes = porSubir(colaRef.current);
    if (!pendientes.length) return;
    ocupado.current = true;
    setSubiendo(true);
    let algoSubio = false;
    try {
      for (const r of pendientes) {
        const fd = new FormData();
        for (const [k, v] of Object.entries(aFormulario(r))) fd.set(k, v);
        let resp;
        try { resp = await subirRondaDeCola(fd); } catch { break; } // sin red o servidor caído: más tarde
        if (!resp) break;
        // Entre tanto pudo cambiar la cola (otra ronda apuntada): se aplica sobre la actual.
        const actual = colaRef.current.find((x) => x.ronda === r.ronda);
        if (actual && actual.creado === r.creado) persistir(aplicarRespuesta(colaRef.current, r.ronda, resp));
        if (resp.ok) { algoSubio = true; subidas.current.add(r.ronda); }
      }
    } finally {
      ocupado.current = false;
      setSubiendo(false);
    }
    if (algoSubio) router.refresh();
  }, [persistir, router]);

  // Al abrir: la cola guardada, el estado de la red y el primer intento de subida.
  useEffect(() => {
    let guardada: string | null = null;
    try { guardada = localStorage.getItem(clave); } catch { guardada = null; }
    const c = parseCola(guardada, torneoId);
    colaRef.current = c;
    setCola(c);
    setCargada(true);
    setEnLinea(navigator.onLine !== false);
    const alVolver = () => { setEnLinea(true); void subir(); };
    const alCaer = () => setEnLinea(false);
    const alMirar = () => { if (document.visibilityState === "visible") void subir(); };
    window.addEventListener("online", alVolver);
    window.addEventListener("offline", alCaer);
    document.addEventListener("visibilitychange", alMirar);
    void subir();
    return () => {
      window.removeEventListener("online", alVolver);
      window.removeEventListener("offline", alCaer);
      document.removeEventListener("visibilitychange", alMirar);
    };
  }, [clave, torneoId, subir]);

  /* Guardarse para abrir sin conexión: el HTML de esta pantalla y los ficheros
     con hash que ha cargado, en la caché del service worker de este despliegue. */
  useEffect(() => {
    if (typeof caches === "undefined" || !("serviceWorker" in navigator)) { setGuardadaOffline("sinSoporte"); return; }
    if (navigator.onLine === false) return;
    let vivo = true;
    (async () => {
      try {
        const cache = await caches.open(`pokearena-${buildId || "dev"}`);
        const ruta = window.location.pathname;
        const pagina = await fetch(ruta, { credentials: "same-origin", cache: "no-store" });
        if (!pagina.ok || pagina.redirected) return;
        await cache.put(ruta, pagina.clone());
        const urls = new Set<string>();
        for (const e of performance.getEntriesByType("resource")) urls.add(e.name);
        document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((s) => urls.add(s.src));
        document.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet][href]").forEach((l) => urls.add(l.href));
        await Promise.all([...urls]
          .filter((u) => { try { const x = new URL(u); return x.origin === window.location.origin && x.pathname.startsWith("/_next/static/"); } catch { return false; } })
          .map(async (u) => { if (!(await cache.match(u))) await cache.add(u).catch(() => undefined); }));
        if (vivo) setGuardadaOffline("si");
      } catch { /* sin caché no hay modo sin conexión, pero apuntar con red funciona igual */ }
    })();
    return () => { vivo = false; };
    // `rondas.length`: al subir una ronda la página trae datos nuevos, y esa es la copia que conviene guardar.
  }, [buildId, rondas.length]);

  // --- lo que se enseña
  const servidor = useMemo(() => rondas.map((r) => ({ ronda: r.ronda, r: r.r })), [rondas]);
  const record = recordCon(servidor, cola);
  const toca = siguienteRonda(servidor, cola, tope);
  const rondaForm = editando ?? toca;
  const pendientes = cola.filter((r) => r.estado !== "conflicto").length;
  const nombreDe = useMemo(() => new Map([...arquetipos, ...misMazos].map((o) => [o.valor, o.nombre])), [arquetipos, misMazos]);

  const sugeridos = useMemo(() => {
    const q = sinAcentos(busca);
    if (q) return arquetipos.filter((a) => sinAcentos(a.nombre).includes(q)).slice(0, 12);
    const frec = frecuentes.map((v) => arquetipos.find((a) => a.valor === v)).filter((x): x is OpcionMazo => Boolean(x)).slice(0, 8);
    const lista = frec.length ? frec : arquetipos.slice(0, 8);
    // El elegido siempre a la vista, aunque no esté entre los más vistos.
    const elegido = rival ? arquetipos.find((a) => a.valor === rival) : undefined;
    return elegido && !lista.some((a) => a.valor === rival) ? [elegido, ...lista] : lista;
  }, [busca, arquetipos, frecuentes, rival]);

  const limpiar = () => {
    setEditando(null); setResultado(""); setRival(""); setBusca(""); setPrimero(""); setOponente(""); setEspecial("");
  };

  const puedeGuardar = rondaForm != null && listaParaGuardar({ resultado, rival, especial, miMazo, mazoFijado: Boolean(mazoFijado) });

  const guardar = () => {
    if (rondaForm == null || !puedeGuardar) return;
    const res: ResultadoCola = especial === "bye" || especial === "np-rival" ? "a" : especial === "np-yo" ? "b" : (resultado as ResultadoCola);
    const nueva: RondaEnCola = {
      torneoId, ronda: rondaForm, resultado: res,
      rival: especial ? "" : rival, rivalNombre: especial ? "" : nombreDe.get(rival) ?? "",
      oponente: oponente.trim().slice(0, 60), primero: especial ? "" : primero, especial,
      miMazo: mazoFijado ? "" : miMazo,
      // Corregir una ronda que ya estaba en el servidor no es un choque.
      conocida: rondas.some((r) => r.ronda === rondaForm) || subidas.current.has(rondaForm),
      creado: Date.now(), estado: "pendiente", detalle: "", forzar: false,
    };
    persistir(encolar(colaRef.current, nueva));
    limpiar();
    void subir();
  };

  const editar = (ronda: number) => {
    const enCola = cola.find((r) => r.ronda === ronda);
    setEditando(ronda);
    setResultado(enCola && !enCola.especial ? enCola.resultado : "");
    setRival(enCola?.rival ?? ""); setBusca(""); setPrimero(enCola?.primero ?? ""); setOponente(enCola?.oponente ?? "");
    setEspecial(enCola?.especial ?? "");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Todas las rondas, del servidor y de la cola, en una lista.
  const filas = useMemo(() => {
    const m = new Map<number, { ronda: number; r: "w" | "l" | "t" | null; texto: string; cola: RondaEnCola | null }>();
    for (const r of rondas) m.set(r.ronda, { ronda: r.ronda, r: r.r, texto: [r.mazoRival, r.rival].filter(Boolean).join(" · "), cola: null });
    for (const c of cola) {
      const texto = c.especial === "bye" ? tr(lng, "v125.bye") : c.especial ? tr(lng, c.especial === "np-rival" ? "v125.npRival" : "v125.npYo")
        : [c.rivalNombre, c.oponente].filter(Boolean).join(" · ");
      m.set(c.ronda, { ronda: c.ronda, r: LETRA[c.resultado], texto, cola: c });
    }
    return [...m.values()].sort((a, b) => b.ronda - a.ronda);
  }, [rondas, cola, lng]);

  const RES: Array<{ v: ResultadoCola; clave: string; tono: string; signo: string }> = [
    { v: "a", clave: "v126.victoria", tono: "win", signo: "▲" },
    { v: "tie", clave: "v126.empate", tono: "tie", signo: "◆" },
    { v: "b", clave: "v126.derrota", tono: "loss", signo: "▼" },
  ];

  /* v0.126 — qué falta para poder guardar, dicho con palabras en la barra de abajo. */
  const faltan: string[] = [];
  if (!mazoFijado && !miMazo) faltan.push(tr(lng, "v126.faltaMiMazo"));
  if (!especial && !resultado) faltan.push(tr(lng, "v126.faltaResultado"));
  if (!especial && !rival) faltan.push(tr(lng, "v126.faltaRival"));
  const resumen = especial
    ? tr(lng, especial === "bye" ? "v125.bye" : especial === "np-rival" ? "v125.npRival" : "v125.npYo")
    : [resultado ? tr(lng, RES.find((o) => o.v === resultado)!.clave) : "", nombreDe.get(rival) ?? ""].filter(Boolean).join(" · ");
  let paso = 0;
  const num = () => String(++paso).padStart(2, "0");

  return (
    <>
      {/* ------------------------------------------------ HUD: récord y estado */}
      <section className="mt-hud" aria-label={tr(lng, "dir.tuRecord")}>
        <div>
          <p className="mt-hud-rotulo">{tr(lng, "dir.record")}</p>
          <p className="mt-hud-cifra">
            <span className="text-win">{record.w}</span><i>-</i><span className="text-loss">{record.l}</span><i>-</i><span className="text-tie">{record.t}</span>
          </p>
        </div>
        <div>
          <p className="mt-hud-rotulo">{tr(lng, "dir.puntos")}</p>
          <p className="mt-hud-cifra">{record.puntos}</p>
        </div>
        <div>
          <p className="mt-hud-rotulo">{tr(lng, "dir.toca")}</p>
          <p className="mt-hud-cifra mt-hud-toca">{toca == null ? "—" : `R${toca}`}</p>
        </div>
      </section>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-xs" role="status" aria-live="polite">
        <span className="mt-led" data-on={enLinea}>{tr(lng, enLinea ? "v125.conRed" : "v125.sinRed")}</span>
        {cargada && pendientes > 0 && (
          <span className="chip chip-brand">{subiendo ? tr(lng, "v125.subiendo") : trf(lng, "v125.porSubir", { n: pendientes })}</span>
        )}
        {cargada && cola.length === 0 && rondas.length > 0 && <span className="text-muted">{tr(lng, "v125.todoSubido")}</span>}
        {pendientes > 0 && enLinea && !subiendo && (
          <button type="button" className="btn btn-sm ml-auto" onClick={() => void subir()}>{tr(lng, "v125.subirAhora")}</button>
        )}
      </div>

      {/* ------------------------------------------------ apuntar la ronda */}
      {!abierto || dropped ? (
        <p className="mt-panel mb-4 text-sm text-muted">{tr(lng, dropped ? "v125.dropped" : "v125.cerrado")}</p>
      ) : rondaForm == null ? (
        <p className="mt-panel mb-4 text-sm text-muted">{trf(lng, "v125.completo", { n: tope ?? 0 })}</p>
      ) : (
        <section className="mt-panel mb-4" aria-labelledby="mt-ronda">
          <div className="mb-4 flex items-center gap-2">
            <h2 id="mt-ronda" className="mt-ronda-titulo">
              <span>{tr(lng, editando != null ? "v126.corrigiendo" : "v126.ronda")}</span> <b>{rondaForm}</b>
            </h2>
            {editando != null && <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={limpiar}>{tr(lng, "v125.cancelar")}</button>}
          </div>

          {!mazoFijado && (
            <div className="mt-paso" data-hecho={Boolean(miMazo)}>
              <p className="mt-paso-titulo"><span>{num()}</span>{tr(lng, "v125.miMazo")}</p>
              <select className="input" value={miMazo} onChange={(e) => setMiMazo(e.target.value)} aria-label={tr(lng, "v125.miMazo")}>
                <option value="">{tr(lng, "v125.elige")}</option>
                {misMazos.length > 0 && (
                  <optgroup label={tr(lng, "v125.misMazos")}>
                    {misMazos.map((m) => <option key={m.valor} value={m.valor}>{m.nombre}</option>)}
                  </optgroup>
                )}
                <optgroup label={tr(lng, "v125.arquetipos")}>
                  {arquetipos.map((a) => <option key={a.valor} value={a.valor}>{a.nombre}</option>)}
                </optgroup>
              </select>
              <p className="mt-1.5 text-xs text-muted">{tr(lng, "v125.miMazoAyuda")}</p>
            </div>
          )}
          {mazoFijado && <p className="mb-4 text-xs text-muted">{tr(lng, "v125.juegasCon")} <b className="text-ink-2">{mazoFijado}</b></p>}

          {!especial && (
            <>
              <div className="mt-paso" data-hecho={Boolean(resultado)}>
                <p className="mt-paso-titulo"><span>{num()}</span>{tr(lng, "v125.resultado")}</p>
                <div className="grid grid-cols-3 gap-2">
                  {RES.map((o) => (
                    <button key={o.v} type="button" className="mt-res" data-tono={o.tono} aria-pressed={resultado === o.v}
                      onClick={() => setResultado(o.v)}>
                      <span className="mt-res-signo" aria-hidden="true">{o.signo}</span>
                      {tr(lng, o.clave)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-paso" data-hecho={Boolean(rival)}>
                <p className="mt-paso-titulo"><span>{num()}</span>{tr(lng, "v125.mazoRival")}</p>
                <input className="input mb-2" type="search" inputMode="search" enterKeyHint="search" autoComplete="off"
                  value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={tr(lng, "v125.buscarMazo")} aria-label={tr(lng, "v125.buscarMazo")} />
                <div className="grid grid-cols-2 gap-2">
                  {sugeridos.map((a) => (
                    <button key={a.valor} type="button" className="mt-mazo" aria-pressed={rival === a.valor}
                      style={a.color ? ({ "--tipo": a.color } as CSSProperties) : undefined}
                      onClick={() => { setRival(a.valor); setBusca(""); }}>
                      {a.sprite && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.sprite} alt="" width={40} height={40} loading="lazy" decoding="async"
                          onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      )}
                      <span>{a.nombre}</span>
                    </button>
                  ))}
                </div>
                {sugeridos.length === 0 && <p className="text-sm text-muted">{tr(lng, "v125.sinMazos")}</p>}
                {!busca && <p className="mt-1.5 text-xs text-muted">{tr(lng, "v126.masVistos")}</p>}
              </div>

              <div className="mt-paso" data-hecho={Boolean(primero)} data-opcional="true">
                <p className="mt-paso-titulo"><span>{num()}</span>{tr(lng, "v125.quienEmpezo")}<em>{tr(lng, "v126.opcional")}</em></p>
                <div className="seg w-full">
                  {([["a", "v125.yo"], ["b", "v125.elRival"], ["", "v125.noSe"]] as const).map(([v, k]) => (
                    <button key={v || "ns"} type="button" data-on={primero === v} onClick={() => setPrimero(v)}>{tr(lng, k)}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          <details className="mt-mas" open={Boolean(especial) || undefined}>
            <summary className="tap cursor-pointer justify-start px-3 text-sm font-semibold text-muted">{tr(lng, "v125.mas")}</summary>
            <div className="flex flex-col gap-3 border-t border-line-soft p-3">
              <label className="flex flex-col gap-1.5">
                <span className="label">{tr(lng, "v125.nombreRival")}</span>
                <input className="input" value={oponente} maxLength={60} autoComplete="off" onChange={(e) => setOponente(e.target.value)} />
              </label>
              <div>
                <p className="label mb-1.5">{tr(lng, "v123.rondaEspecial")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {([["bye", "v125.bye"], ["np-rival", "v125.npRival"], ["np-yo", "v125.npYo"]] as const).map(([v, k]) => (
                    <button key={v} type="button" className={`chip mt-chip ${especial === v ? "chip-brand" : ""}`} aria-pressed={especial === v}
                      onClick={() => setEspecial(especial === v ? "" : v)}>{tr(lng, k)}</button>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </section>
      )}

      {/* ------------------------------------------------ mis rondas */}
      {filas.length > 0 && (
        <section className="mt-panel mb-4 !p-0" aria-labelledby="mt-lista">
          <h2 id="mt-lista" className="mt-paso-titulo px-4 pt-4">{tr(lng, "v125.misRondas")}</h2>
          <ol className="divide-y divide-line-soft">
            {filas.map((f) => (
              <li key={f.ronda} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
                <span className="w-9 flex-none font-display text-lg font-black tabular">R{f.ronda}</span>
                <span className="mt-letra" data-r={f.r ?? "n"}>{f.r === "w" ? "V" : f.r === "l" ? "D" : f.r === "t" ? "E" : "—"}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{f.texto || "—"}</span>
                {f.cola == null ? (
                  <span className="text-xs font-semibold text-win">{tr(lng, "v125.subida")}</span>
                ) : f.cola.estado === "pendiente" ? (
                  <span className="chip chip-brand text-[11px]">{tr(lng, "v125.enElMovil")}</span>
                ) : (
                  <span className="chip chip-loss text-[11px]">{tr(lng, f.cola.estado === "conflicto" ? "v125.choca" : "v125.rechazada")}</span>
                )}
                {abierto && !dropped && (f.cola == null || f.cola.estado !== "conflicto") && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => editar(f.ronda)}>{tr(lng, "v125.corregir")}</button>
                )}
                {f.cola && f.cola.estado !== "pendiente" && (
                  <div className="flex w-full flex-wrap items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 text-loss">
                      {f.cola.estado === "conflicto" ? trf(lng, "v125.chocaDetalle", { d: f.cola.detalle }) : f.cola.detalle}
                    </span>
                    {f.cola.estado === "conflicto" && (
                      <button type="button" className="btn btn-sm" onClick={() => { persistir(forzar(colaRef.current, f.ronda)); void subir(); }}>
                        {tr(lng, "v125.usarLaMia")}
                      </button>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => persistir(quitar(colaRef.current, f.ronda))}>
                      {tr(lng, "v125.descartar")}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="mb-3 text-center text-xs text-muted">
        {tr(lng, guardadaOffline === "si" ? "v125.offlineLista" : guardadaOffline === "sinSoporte" ? "v125.offlineNo" : "v125.offlinePreparando")}
      </p>

      {/* ------------------------------------------------ la barra de guardar, SIEMPRE a la vista y al alcance del pulgar */}
      {abierto && !dropped && rondaForm != null && (
        <div className="mt-barra" data-lista={puedeGuardar}>
          <p className="mt-barra-estado" role="status" aria-live="polite">
            {puedeGuardar
              ? <><b>R{rondaForm}</b> · {resumen}</>
              : <>{tr(lng, "v126.falta")} {faltan.join(" · ")}</>}
          </p>
          <button type="button" className="mt-guardar" disabled={!puedeGuardar} onClick={guardar}>
            {trf(lng, "v125.guardar", { n: rondaForm })}
          </button>
          <p className="mt-barra-nota">{tr(lng, enLinea ? "v125.notaConRed" : "v125.notaSinRed")}</p>
        </div>
      )}
    </>
  );
}
