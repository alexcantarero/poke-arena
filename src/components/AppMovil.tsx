"use client";

import { useEffect, useState } from "react";
import { tr } from "@/lib/i18n";
import { useLang } from "@/components/LangProvider";

/* =========================================================================
   v0.140 — LA APP EN EL MÓVIL: instalarla y activar las notificaciones.

   · Instalar: en Android/Chrome sale el diálogo del propio navegador
     (`beforeinstallprompt`); en iPhone no existe, así que se explica el gesto
     (Compartir → «Añadir a pantalla de inicio»). Si ya está instalada, lo dice.
     Al abrirse instalada se deja la cookie `arena-app=1`, que es lo que quita el
     aviso de «instala la app».
   · Notificaciones: opcionales, por dispositivo. Pide permiso, se suscribe al
     servicio push del navegador con la clave pública VAPID y lo guarda en el
     servidor (`/api/push`). En iPhone solo funcionan con la app instalada.
   ========================================================================= */
type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function claveAplicacion(publica: string): ArrayBuffer {
  const pad = "=".repeat((4 - (publica.length % 4)) % 4);
  const raw = atob((publica + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

export function AppMovil({ vapidPublica }: { vapidPublica: string | null }) {
  const lng = useLang();
  const [instalada, setInstalada] = useState(false);
  const [ios, setIos] = useState(false);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [push, setPush] = useState<"sin-soporte" | "no" | "si" | "bloqueado" | "cargando">("cargando");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalada(standalone);
    if (standalone) document.cookie = "arena-app=1; path=/; max-age=31536000; samesite=lax";
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const alPedir = (e: Event) => { e.preventDefault(); setPrompt(e as Prompt); };
    window.addEventListener("beforeinstallprompt", alPedir);
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !vapidPublica) { setPush("sin-soporte"); return; }
      if (Notification.permission === "denied") { setPush("bloqueado"); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setPush(sub ? "si" : "no");
    })().catch(() => setPush("sin-soporte"));
    return () => window.removeEventListener("beforeinstallprompt", alPedir);
  }, [vapidPublica]);

  const instalar = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const r = await prompt.userChoice.catch(() => ({ outcome: "" }));
    if (r.outcome === "accepted") { setInstalada(true); document.cookie = "arena-app=1; path=/; max-age=31536000; samesite=lax"; }
    setPrompt(null);
  };

  const activar = async () => {
    setMsg("");
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { setPush(permiso === "denied" ? "bloqueado" : "no"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveAplicacion(vapidPublica!) });
      const r = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) { await sub.unsubscribe(); setMsg(tr(lng, "v140.pushError")); setPush("no"); return; }
      setPush("si");
      await fetch("/api/push", { method: "PUT" });
    } catch {
      setMsg(tr(lng, "v140.pushError"));
    }
  };
  const desactivar = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
      await sub.unsubscribe().catch(() => undefined);
    }
    setPush("no");
  };
  const probar = async () => {
    const r = await fetch("/api/push", { method: "PUT" }).then((x) => x.json()).catch(() => ({ ok: false }));
    setMsg(tr(lng, r.ok ? "v140.pushPruebaOk" : "v140.pushError"));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="font-semibold">{tr(lng, "v140.instalarTitulo")}</p>
        {instalada ? (
          <p className="text-sm text-win">{tr(lng, "v140.yaInstalada")}</p>
        ) : prompt ? (
          <button type="button" className="btn btn-brand mt-2" onClick={instalar}>{tr(lng, "v140.instalar")}</button>
        ) : ios ? (
          <p className="text-sm text-muted">{tr(lng, "v140.instalarIos")}</p>
        ) : (
          <p className="text-sm text-muted">{tr(lng, "v140.instalarAndroid")}</p>
        )}
      </div>
      <div>
        <p className="font-semibold">{tr(lng, "v140.pushTitulo")}</p>
        <p className="mb-2 text-sm text-muted">{tr(lng, "v140.pushAyuda")}</p>
        {push === "si" ? (
          <div className="flex flex-wrap gap-2">
            <span className="chip chip-win">{tr(lng, "v140.pushActivas")}</span>
            <button type="button" className="btn btn-sm" onClick={probar}>{tr(lng, "v140.pushProbar")}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={desactivar}>{tr(lng, "v140.pushDesactivar")}</button>
          </div>
        ) : push === "no" ? (
          <button type="button" className="btn btn-brand" onClick={activar}>{tr(lng, "v140.pushActivar")}</button>
        ) : push === "bloqueado" ? (
          <p className="text-sm text-loss">{tr(lng, "v140.pushBloqueadas")}</p>
        ) : push === "sin-soporte" ? (
          <p className="text-sm text-muted">{tr(lng, vapidPublica ? (ios && !instalada ? "v140.pushIos" : "v140.pushSinSoporte") : "v140.pushSinClaves")}</p>
        ) : null}
        {msg && <p className="mt-2 text-sm" role="status">{msg}</p>}
      </div>
    </div>
  );
}
