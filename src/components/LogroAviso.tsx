"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LOGROS, urlPokeApi } from "@/lib/logros";
import { spriteUrl } from "@/lib/pokemon";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.65 — El aviso de «logro desbloqueado».
   v0.106 — Ahora es una CELEBRACIÓN: en medio de la pantalla, la tarjeta
   brilla y salen cohetes que estallan en fuegos artificiales.

   Escucha dos eventos de ventana:
     · `arena:logro`     detail = clave del logro (lo lanza `ganarLogro`).
     · `arena:celebrar`  detail = { etiqueta, nombre, img } (subir de Ball…).

   Solo sale la PRIMERA vez (eso ya lo decide quien lanza el evento). Se
   cierra tocando en cualquier sitio, con Escape o solo a los 5,5 s.

   Movimiento: con «reducir movimiento» del sistema (o Animaciones: No en
   Ajustes) no hay cohetes ni brillo, solo la tarjeta. Con Animaciones: Sí,
   siempre los hay. Mismo criterio que el resto de la app (`data-motion`).
   El lienzo es `aria-hidden`; lo que se anuncia es el texto (`role=status`).
   ========================================================================= */

type Celebracion = { etiqueta: string; nombre: string; img: string | null };

function hayMovimiento(): boolean {
  if (typeof window === "undefined") return false;
  const m = document.documentElement.dataset.motion;
  if (m === "on") return true;
  if (m === "off") return false;
  return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const COLORES = ["#f8c54c", "#ff6b6b", "#4dd4ff", "#7ee081", "#c084fc", "#ffffff", "#ff9f43"];

/** Cohetes que suben y estallan. Canvas a pantalla completa, unos 4 s. */
function fuegos(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const ajustar = () => {
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
  };
  ajustar();
  window.addEventListener("resize", ajustar);
  type Cohete = { x: number; y: number; vx: number; vy: number; cumbre: number; color: string };
  type Chispa = { x: number; y: number; vx: number; vy: number; vida: number; color: string };
  const cohetes: Cohete[] = [];
  const chispas: Chispa[] = [];
  const W = () => canvas.width, H = () => canvas.height;
  const lanzar = () => {
    const x = W() * (0.15 + Math.random() * 0.7);
    cohetes.push({
      x, y: H(), vx: (Math.random() - 0.5) * 2 * dpr, vy: -(9 + Math.random() * 4) * dpr,
      cumbre: H() * (0.15 + Math.random() * 0.3), color: COLORES[Math.floor(Math.random() * COLORES.length)],
    });
  };
  const estallar = (c: Cohete) => {
    const n = 46 + Math.floor(Math.random() * 24);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, v = (2 + Math.random() * 4) * dpr;
      chispas.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1, color: Math.random() < 0.25 ? "#ffffff" : c.color });
    }
  };
  let t = 0, raf = 0, vivo = true;
  const paso = () => {
    if (!vivo) return;
    t++;
    if (t < 150 && t % 18 === 1) lanzar();
    if (t === 2) { lanzar(); lanzar(); }
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fillRect(0, 0, W(), H());
    ctx.globalCompositeOperation = "lighter";
    for (let i = cohetes.length - 1; i >= 0; i--) {
      const c = cohetes[i];
      c.x += c.vx; c.y += c.vy; c.vy += 0.12 * dpr;
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.arc(c.x, c.y, 2.4 * dpr, 0, Math.PI * 2); ctx.fill();
      if (c.y <= c.cumbre || c.vy >= 0) { estallar(c); cohetes.splice(i, 1); }
    }
    for (let i = chispas.length - 1; i >= 0; i--) {
      const p = chispas[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.06 * dpr; p.vx *= 0.985; p.vy *= 0.985; p.vida -= 0.013;
      if (p.vida <= 0) { chispas.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.vida);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.9 * dpr, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (t < 330 || cohetes.length || chispas.length) raf = requestAnimationFrame(paso);
  };
  raf = requestAnimationFrame(paso);
  return () => { vivo = false; cancelAnimationFrame(raf); window.removeEventListener("resize", ajustar); };
}

export function LogroAviso() {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  /* v0.107 — en COLA: medallas y títulos nuevos pueden llegar varios a la
     vez; se enseñan de uno en uno. */
  const [cola, setCola] = useState<Celebracion[]>([]);
  const c = cola[0] ?? null;
  const [mov, setMov] = useState(false);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const cerrarRef = useRef<HTMLButtonElement>(null);

  const cerrar = useCallback(() => setCola((q) => q.slice(1)), []);

  useEffect(() => {
    const mostrar = (x: Celebracion) => {
      setMov(hayMovimiento());
      setCola((q) => (q.length >= 8 ? q : [...q, x]));
    };
    const alLogro = (e: Event) => {
      const logro = LOGROS.find((l) => l.clave === (e as CustomEvent<string>).detail);
      if (!logro) return;
      mostrar({
        etiqueta: tr(lng, "logro.desbloqueado"),
        nombre: tr(lng, `logro.${logro.clave}.nombre`),
        img: logro.dex ? urlPokeApi(logro.dex) : spriteUrl(logro.pokemon),
      });
    };
    const alCelebrar = (e: Event) => {
      const d = (e as CustomEvent<Partial<Celebracion>>).detail;
      if (d?.nombre) mostrar({ etiqueta: d.etiqueta ?? "", nombre: d.nombre, img: d.img ?? null });
    };
    window.addEventListener("arena:logro", alLogro);
    window.addEventListener("arena:celebrar", alCelebrar);
    return () => {
      window.removeEventListener("arena:logro", alLogro);
      window.removeEventListener("arena:celebrar", alCelebrar);
    };
  }, [lng]);

  // Cada celebración se cierra sola a los 5,5 s y deja paso a la siguiente.
  useEffect(() => {
    if (!c) return;
    const t = setTimeout(cerrar, 5500);
    return () => clearTimeout(t);
  }, [c, cerrar]);

  // Los fuegos, solo mientras se ve y solo con movimiento.
  useEffect(() => {
    if (!c || !mov || !lienzo.current) return;
    return fuegos(lienzo.current);
  }, [c, mov]);

  useEffect(() => {
    if (!c) return;
    cerrarRef.current?.focus({ preventScroll: true });
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") cerrar(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [c, cerrar]);

  if (!c) return null;
  return (
    <div className="celebra" data-mov={mov} onClick={cerrar} key={`${c.etiqueta}:${c.nombre}:${cola.length}`}>
      <canvas ref={lienzo} className="celebra-lienzo" aria-hidden="true" />
      <div className="celebra-tarjeta" role="status" aria-live="polite">
        <span className="celebra-rayos" aria-hidden="true" />
        {c.img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.img} alt="" className="celebra-img" onError={(e) => { e.currentTarget.style.display = "none"; }} />
        )}
        <span className="celebra-etiqueta">{c.etiqueta}</span>
        <span className="celebra-nombre">{c.nombre}</span>
        {cola.length > 1 && <span className="mt-1 text-[11px] text-muted">{`+${cola.length - 1}`}</span>}
        <button ref={cerrarRef} type="button" className="btn btn-sm mt-3" onClick={cerrar}>{tr(lng, "cel.genial")}</button>
      </div>
    </div>
  );
}
