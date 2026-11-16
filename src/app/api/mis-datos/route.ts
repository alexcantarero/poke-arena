import { NextResponse } from "next/server";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { decks, ladderEntries, matches, players, tournamentResults } from "@/db/schema";
import { readSession } from "@/lib/auth";

/* =========================================================================
   GET /api/mis-datos — v0.134.

   Descargar MIS datos (portabilidad): lo que la app guarda de quien tiene la
   sesión, en un JSON. Solo los propios: no acepta el id de nadie. Sin la
   contraseña (ni cifrada) y sin los datos de seguridad de la cuenta.
   ========================================================================= */

export const dynamic = "force-dynamic";

export async function GET() {
  const sesion = await readSession();
  if (!sesion) return new NextResponse("Sin sesión", { status: 401 });
  const id = sesion.playerId;
  const [yo] = await db.select().from(players).where(eq(players.id, id));
  if (!yo) return new NextResponse("No encontrado", { status: 404 });
  const [partidas, resultados, mazos, ladder] = await Promise.all([
    db.select().from(matches).where(or(eq(matches.playerAId, id), eq(matches.playerBId, id))),
    db.select().from(tournamentResults).where(eq(tournamentResults.playerId, id)),
    db.select().from(decks).where(eq(decks.playerId, id)),
    db.select().from(ladderEntries).where(eq(ladderEntries.playerId, id)),
  ]);
  // Fuera lo que no es un dato «tuyo» sino de la seguridad de la cuenta.
  const { passwordHash: _p, loginAttempts: _a, lockedUntil: _l, sessionVersion: _s, ...perfil } = yo;
  void _p; void _a; void _l; void _s;
  const cuerpo = JSON.stringify({ exportado: new Date().toISOString(), perfil, partidas, resultadosDeTorneo: resultados, mazos, ladder }, null, 2);
  return new NextResponse(cuerpo, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="pokearena-mis-datos-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store, max-age=0",
    },
  });
}
