import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { borrarSuscripcion, enviarA, guardarSuscripcion, vapid } from "@/lib/pushDb";

/* v0.140 — Suscribirse (POST), darse de baja (DELETE) y probar (PUT) las
   notificaciones push de ESTE navegador. Solo con sesión, y solo las propias. */
export const dynamic = "force-dynamic";

type Cuerpo = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
const texto = (x: unknown, max: number) => (typeof x === "string" && x.length > 0 && x.length <= max ? x : null);

export async function POST(req: Request) {
  const s = await readSession();
  if (!s) return new NextResponse("Sin sesión", { status: 401 });
  if (!vapid()) return NextResponse.json({ ok: false, error: "sin-claves" }, { status: 503 });
  const b = (await req.json().catch(() => ({}))) as Cuerpo;
  const endpoint = texto(b.endpoint, 1000), p256dh = texto(b.keys?.p256dh, 200), auth = texto(b.keys?.auth, 100);
  if (!endpoint || !p256dh || !auth || !/^https:\/\//.test(endpoint)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await guardarSuscripcion(s.playerId, { endpoint, p256dh, auth });
  } catch {
    return NextResponse.json({ ok: false, error: "sin-migracion" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await readSession();
  if (!s) return new NextResponse("Sin sesión", { status: 401 });
  const b = (await req.json().catch(() => ({}))) as Cuerpo;
  const endpoint = texto(b.endpoint, 1000);
  if (endpoint) await borrarSuscripcion(s.playerId, endpoint).catch(() => undefined);
  return NextResponse.json({ ok: true });
}

export async function PUT() {
  const s = await readSession();
  if (!s) return new NextResponse("Sin sesión", { status: 401 });
  const n = await enviarA([s.playerId], { titulo: "PokeArena", cuerpo: "Las notificaciones funcionan en este dispositivo.", url: "/avisos", etiqueta: "prueba" });
  return NextResponse.json({ ok: n > 0, enviados: n });
}
