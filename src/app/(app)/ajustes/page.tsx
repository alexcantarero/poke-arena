import { redirect } from "next/navigation";
import { canManageLeague } from "@/lib/auth";
import { currentPlayer, loadInvites, loadPlayerEmails, loadSnapshot } from "@/lib/data";
import { availableSeasons, getSeason } from "@/lib/cp";
import { isPlayed, sideOf } from "@/lib/stats";
import { PageHead, SectionTitle } from "@/components/ui";
import { InviteManager } from "@/components/InviteManager";
import { PlayerAdmin } from "@/components/PlayerAdmin";
import { PasswordForm } from "@/components/PasswordForm";
import { saveSettings } from "@/actions";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const [snap, me] = await Promise.all([loadSnapshot(), currentPlayer()]);
  if (!me) redirect("/entrar");
  const manager = canManageLeague(me.role);
  const invites = manager ? await loadInvites() : [];
  const emails: Record<string, string> = manager ? await loadPlayerEmails() : {};

  const played = snap.matches.filter(isPlayed);
  const counts = Object.fromEntries(
    snap.players.map((p) => [p.id, played.filter((m) => sideOf(m, p.id)).length]),
  );

  return (
    <>
      <PageHead
        title="Ajustes"
        sub={manager
          ? "Puntuación, invitaciones y jugadores. Los puntos y el Elo se recalculan desde el historial, así que cambiar la puntuación reordena el ranking al momento."
          : "Tu cuenta. Para cambiar la configuración de la liga habla con el organizador."}
      />

      {manager && (
        <>
          <SectionTitle aside="cualquiera con el enlace puede darse de alta">Invitaciones</SectionTitle>
          <InviteManager invites={invites} />

          <SectionTitle>La liga</SectionTitle>
          <form action={saveSettings} className="card mb-6 flex flex-col gap-4 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-name">Nombre</label>
                <input className="input" id="s-name" name="name" defaultValue={snap.config.name} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-season">Temporada</label>
                <input className="input" id="s-season" name="season" defaultValue={snap.config.season} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {([["ptsWin", "Pts victoria"], ["ptsTie", "Pts empate"], ["ptsLoss", "Pts derrota"]] as const).map(([n, l]) => (
                <div className="flex flex-col gap-1.5" key={n}>
                  <label className="label" htmlFor={`s-${n}`}>{l}</label>
                  <input className="input" id={`s-${n}`} name={n} type="number" inputMode="numeric"
                    defaultValue={snap.config[n]} />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-eloStart">Elo inicial</label>
                <input className="input" id="s-eloStart" name="eloStart" type="number" inputMode="numeric" defaultValue={snap.config.eloStart} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-eloK">Factor K</label>
                <input className="input" id="s-eloK" name="eloK" type="number" inputMode="numeric" defaultValue={snap.config.eloK} />
                <p className="text-xs text-muted">Cuánto mueve una partida el Elo. 24 va bien para grupos pequeños.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-cpSeason">Temporada de Championship Points</label>
                <select className="input" id="s-cpSeason" name="cpSeason" defaultValue={String(snap.config.cpSeason)}>
                  {availableSeasons().map((y) => (
                    <option key={y} value={y}>
                      {y}{getSeason(y).confirmed ? "" : " (cifras provisionales)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="label" htmlFor="s-zone">Zona de clasificación</label>
                <select className="input" id="s-zone" name="ratingZone" defaultValue={snap.config.ratingZone}>
                  <option value="europe">Europa</option>
                  <option value="us-canada">EE. UU. y Canadá</option>
                  <option value="latam">Latinoamérica</option>
                  <option value="oceania">Oceanía</option>
                  <option value="mesa">Oriente Medio y Sudáfrica</option>
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" name="registrationOpen" className="size-4" defaultChecked={snap.config.registrationOpen} />
              Permitir altas nuevas con enlace de invitación
            </label>

            <button className="btn btn-brand w-full sm:w-auto" type="submit">Guardar ajustes</button>
          </form>

          <SectionTitle aside={`${snap.players.length} en total`}>Jugadores</SectionTitle>
          <PlayerAdmin
            players={snap.players} counts={counts} emails={emails}
            meId={me.id} meRole={me.role}
          />
        </>
      )}

      <SectionTitle>Tu cuenta</SectionTitle>
      <PasswordForm />

      <section className="card mt-6 p-4">
        <h2 className="mb-2 text-lg font-bold">Cómo se calcula todo</h2>
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          <p><b>Puntos.</b> Cuenta la serie, no los juegos: ganar 2–0 y 2–1 valen lo mismo.</p>
          <p><b>%V.</b> Victorias más medio empate, entre partidas jugadas.</p>
          <p><b>Resistencia.</b> Media del % de victorias de tus rivales, con suelo del 25% por rival, como en el reglamento de Play! Pokémon.</p>
          <p><b>Elo.</b> Recalculado en orden cronológico sobre todas las partidas <i>internas</i> de la liga. Las partidas contra gente de fuera no puntúan, porque no habría contra quién compensar.</p>
          <p><b>Championship Points.</b> Se calculan con la tabla de la temporada y descartando lo que se sale del Best Finish Limit. Las tablas están en <code className="rounded bg-surface-2 px-1 font-mono text-xs">src/lib/cp.ts</code>.</p>
        </div>
      </section>
    </>
  );
}
