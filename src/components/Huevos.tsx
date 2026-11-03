"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { avanzaKonami, urlPokeApi, urlPokeApiShiny } from "@/lib/logros";
import { urlDeObjeto } from "@/lib/objetos";
import { ganarLogro } from "@/components/logroCliente";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.90 — Los easter eggs nuevos. Cada uno con su logro (`lib/logros.ts`).
   Sprites oficiales de PokéAPI por número de Pokédex, enlazados, no dibujados.
   Nada de esto guarda datos salvo el logro, y nada estorba: todo se cierra
   solo o con un toque.
   ========================================================================= */

/** Una aparición a pantalla completa: sprites y un texto, unos segundos. */
function Aparicion({ dexes, texto, shiny = false, onFin, ms = 3200 }: {
  dexes: number[]; texto: string; shiny?: boolean; onFin: () => void; ms?: number;
}) {
  useEffect(() => { const t = setTimeout(onFin, ms); return () => clearTimeout(t); }, [onFin, ms]);
  return createPortal(
    <div className="huevo-aparicion" role="status" onClick={onFin}>
      <div className="huevo-sprites">
        {dexes.map((d, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={`${d}-${i}`} src={shiny ? urlPokeApiShiny(d) : urlPokeApi(d)} alt="" style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
      </div>
      <p className="huevo-texto">{texto}</p>
    </div>,
    document.body,
  );
}

/** En el layout: código Konami (Mew), Snorlax de madrugada y Eevee (tema e idioma 8 veces). */
export function HuevosGlobales() {
  const lng = useLang(); // v0.49
  const [mew, setMew] = useState(false);
  const [eevee, setEevee] = useState(false);
  const [snorlax, setSnorlax] = useState(false);
  const pos = useRef(0);

  useEffect(() => {
    // Konami: ↑↑↓↓←→←→BA (sin estar escribiendo en un campo).
    const tecla = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      pos.current = avanzaKonami(pos.current, e.key);
      if (pos.current === 10) { pos.current = 0; setMew(true); ganarLogro("mew"); }
    };
    // Eevee: cada cambio de tema o idioma (botones con data-huevo="eevee"); a los 8, sus evoluciones.
    const clic = (e: MouseEvent) => {
      if (!(e.target as HTMLElement | null)?.closest?.('[data-huevo="eevee"]')) return;
      try {
        const n = Number(sessionStorage.getItem("arena:eevee") ?? "0") + 1;
        sessionStorage.setItem("arena:eevee", String(n));
        if (n === 8) { setEevee(true); ganarLogro("eevee"); }
      } catch { /* sin almacenamiento: sin huevo */ }
    };
    // Snorlax: de 3 a 5 de la madrugada, una vez por noche.
    const h = new Date().getHours();
    if (h >= 3 && h < 5) {
      try {
        const noche = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem("arena:snorlax") !== noche) setSnorlax(true);
      } catch { setSnorlax(true); }
    }
    window.addEventListener("keydown", tecla);
    document.addEventListener("click", clic, true);
    return () => { window.removeEventListener("keydown", tecla); document.removeEventListener("click", clic, true); };
  }, []);

  const despertar = () => {
    setSnorlax(false);
    try { localStorage.setItem("arena:snorlax", new Date().toISOString().slice(0, 10)); } catch { /* da igual */ }
    ganarLogro("snorlax");
  };

  return (
    <>
      {mew && <Aparicion dexes={[151]} texto={tr(lng, "huevo.mew")} onFin={() => setMew(false)} />}
      {eevee && <Aparicion dexes={[133, 134, 135, 136, 196, 197, 470, 471, 700]} texto={tr(lng, "huevo.eevee")} onFin={() => setEevee(false)} ms={5200} />}
      {snorlax && createPortal(
        <div className="huevo-snorlax" role="dialog" aria-label={tr(lng, "huevo.snorlax")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlPokeApi(143)} alt="" className="huevo-snorlax-img" />
          <span className="min-w-0 flex-1 text-sm font-semibold">{tr(lng, "huevo.snorlax")}</span>
          <button type="button" className="btn btn-brand btn-sm" onClick={despertar}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urlDeObjeto("poke-flute")} alt="" className="size-5 [image-rendering:pixelated]" onError={(e) => { e.currentTarget.style.display = "none"; }} />
            {tr(lng, "huevo.flauta")}
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}

/** El 404 «glitcheado»: MissingNo. */
export function MissingNo() {
  useEffect(() => { ganarLogro("missingno"); }, []);
  return <div className="missingno" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>;
}

/** Tu avatar, que 1 de cada 4.096 veces sale shiny (con `?variocolor=1`, siempre: para probarlo). */
export function Variocolor({ children }: { children: ReactNode }) {
  const [shiny, setShiny] = useState(false);
  useEffect(() => {
    const forzar = new URLSearchParams(location.search).get("variocolor") === "1";
    if (forzar || Math.random() < 1 / 4096) { setShiny(true); ganarLogro("variocolor"); }
  }, []);
  return <span className={`relative inline-flex ${shiny ? "variocolor" : ""}`} title={shiny ? "¡Variocolor!" : undefined}>{children}</span>;
}

/** Mantener pulsado tu avatar del panel de enfrentamiento: Ditto copia al rival. */
export function DittoAvatar({ yo, rival }: { yo: ReactNode; rival: ReactNode }) {
  const [ditto, setDitto] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const empezar = () => {
    t.current = setTimeout(() => {
      setDitto(true); ganarLogro("ditto");
      setTimeout(() => setDitto(false), 2600);
    }, 650);
  };
  const soltar = () => { if (t.current) clearTimeout(t.current); };
  return (
    <span className={`inline-flex select-none ${ditto ? "ditto" : ""}`} onPointerDown={empezar} onPointerUp={soltar} onPointerLeave={soltar}
      onContextMenu={(e) => e.preventDefault()}>
      {ditto ? rival : yo}
    </span>
  );
}

/** En Inicio: cinco derrotas seguidas → Magikarp de consolación (una vez por racha). */
export function Salpicadura({ racha, clave }: { racha: number; clave: string }) {
  const lng = useLang(); // v0.49
  const [ver, setVer] = useState(false);
  useEffect(() => {
    if (racha < 5) return;
    try {
      if (localStorage.getItem("arena:salpicadura") === clave) return;
      localStorage.setItem("arena:salpicadura", clave);
    } catch { /* se enseña igual */ }
    setVer(true); ganarLogro("salpicadura");
  }, [racha, clave]);
  if (!ver) return null;
  return <Aparicion dexes={[129]} texto={tr(lng, "huevo.salpicadura")} onFin={() => setVer(false)} ms={4200} />;
}
