"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.70 — Instalar la app.

   · `CapturaInstalacion` va en el layout raíz: Chrome y Edge lanzan
     `beforeinstallprompt` UNA vez al cargar, y si nadie lo escucha en ese
     momento se pierde. Lo guarda en `window` para cuando abras Ajustes.
   · `Instalacion` (Ajustes → Este dispositivo) enseña lo que toca según dónde
     estés: «ya está instalada», el botón «Instalar» (Android y escritorio), o
     los pasos de iPhone/iPad, donde Safari no tiene botón propio.
   ========================================================================= */

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
declare global { interface Window { __arenaInstalar?: EventoInstalar | null } }

export function CapturaInstalacion() {
  useEffect(() => {
    const al = (e: Event) => {
      e.preventDefault(); // que no salga el mini-aviso de Chrome por su cuenta
      window.__arenaInstalar = e as EventoInstalar;
      window.dispatchEvent(new Event("arena:instalable"));
    };
    const hecho = () => { window.__arenaInstalar = null; window.dispatchEvent(new Event("arena:instalable")); };
    window.addEventListener("beforeinstallprompt", al);
    window.addEventListener("appinstalled", hecho);
    return () => { window.removeEventListener("beforeinstallprompt", al); window.removeEventListener("appinstalled", hecho); };
  }, []);
  return null;
}

type Donde = "cargando" | "instalada" | "boton" | "ios" | "iosOtroNavegador" | "otro";

function dondeEstoy(): Donde {
  const standalone = window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (standalone) return "instalada";
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS/.test(ua) ? "iosOtroNavegador" : "ios";
  return window.__arenaInstalar ? "boton" : "otro";
}

export function Instalacion() {
  const lng = useLang(); // v0.49: SIEMPRE la primera línea
  const [donde, setDonde] = useState<Donde>("cargando");

  useEffect(() => {
    const ver = () => setDonde(dondeEstoy());
    ver();
    window.addEventListener("arena:instalable", ver);
    return () => window.removeEventListener("arena:instalable", ver);
  }, []);

  const instalar = async () => {
    const ev = window.__arenaInstalar;
    if (!ev) return;
    await ev.prompt();
    const r = await ev.userChoice.catch(() => ({ outcome: "dismissed" }));
    if (r.outcome === "accepted") window.__arenaInstalar = null;
    setDonde(dondeEstoy());
  };

  if (donde === "cargando") return null;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="label">{tr(lng, "inst.titulo")}</p>
      {donde === "instalada" && <p className="text-win">✓ {tr(lng, "inst.yaInstalada")}</p>}
      {donde === "boton" && (
        <>
          <p className="text-muted">{tr(lng, "inst.explica")}</p>
          <button type="button" className="btn btn-brand w-full sm:w-auto" onClick={instalar}>{tr(lng, "inst.instalar")}</button>
        </>
      )}
      {donde === "ios" && (
        <>
          <p className="text-muted">{tr(lng, "inst.iosIntro")}</p>
          <ol className="ml-5 list-decimal space-y-1 text-ink-2">
            <li>{tr(lng, "inst.ios1")}</li>
            <li>{tr(lng, "inst.ios2")}</li>
            <li>{tr(lng, "inst.ios3")}</li>
          </ol>
        </>
      )}
      {donde === "iosOtroNavegador" && <p className="text-muted">{tr(lng, "inst.iosSafari")}</p>}
      {donde === "otro" && <p className="text-muted">{tr(lng, "inst.otro")}</p>}
    </div>
  );
}
