import { loadSnapshot } from "@/lib/data";
import { isPlayed, sideOf } from "@/lib/stats";
import { PageHead } from "@/components/ui";
import { PlayerEditor } from "@/components/PlayerEditor";
import { saveSettings } from "@/actions";

export default async function SettingsPage() {
  const snap = await loadSnapshot();
  const played = snap.matches.filter(isPlayed);
  const counts = new Map(
    snap.players.map((p) => [p.id, played.filter((m) => sideOf(m, p.id)).length]),
  );

  return (
    <>
      <PageHead
        title="Ajustes"
        sub="Puntuación, Elo, código de invitación y jugadores. Todo lo que cambies aquí afecta al ranking en el momento: los puntos y el Elo se recalculan desde el historial completo, no se guardan acumulados."
      />

      <div className="grid g-2" style={{ marginBottom: 16 }}>
        <div className="card">
          <div className="card-head"><h2>Liga</h2></div>
          <div className="card-pad">
            <form action={saveSettings} className="stack" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="s-name">Nombre</label>
                <input className="inp" id="s-name" name="name" defaultValue={snap.config.name} />
              </div>
              <div className="field">
                <label htmlFor="s-season">Temporada</label>
                <input className="inp" id="s-season" name="season" defaultValue={snap.config.season} />
              </div>
              <div className="grid g-3" style={{ gap: 10 }}>
                <div className="field">
                  <label htmlFor="s-w">Pts victoria</label>
                  <input className="inp" id="s-w" name="ptsWin" type="number" defaultValue={snap.config.ptsWin} />
                </div>
                <div className="field">
                  <label htmlFor="s-t">Pts empate</label>
                  <input className="inp" id="s-t" name="ptsTie" type="number" defaultValue={snap.config.ptsTie} />
                </div>
                <div className="field">
                  <label htmlFor="s-l">Pts derrota</label>
                  <input className="inp" id="s-l" name="ptsLoss" type="number" defaultValue={snap.config.ptsLoss} />
                </div>
              </div>
              <div className="grid g-2" style={{ gap: 10 }}>
                <div className="field">
                  <label htmlFor="s-es">Elo inicial</label>
                  <input className="inp" id="s-es" name="eloStart" type="number" defaultValue={snap.config.eloStart} />
                </div>
                <div className="field">
                  <label htmlFor="s-ek">Factor K</label>
                  <input className="inp" id="s-ek" name="eloK" type="number" defaultValue={snap.config.eloK} />
                  <div className="hint">Cuánto mueve una partida el Elo. 24 va bien para grupos pequeños.</div>
                </div>
              </div>
              <div className="field">
                <label htmlFor="s-code">Código de invitación</label>
                <input className="inp" id="s-code" name="inviteCode" defaultValue={snap.config.inviteCode} placeholder="ARENA26" />
                <div className="hint">
                  Si lo dejas vacío se usa el del fichero <code>.env</code>. Si ambos están vacíos,
                  cualquiera con el enlace entra eligiendo jugador.
                </div>
              </div>
              <button className="btn btn-gold" type="submit">Guardar ajustes</button>
            </form>
          </div>
        </div>

        <PlayerEditor players={snap.players} counts={Object.fromEntries(counts)} decks={snap.decks} />
      </div>

      <div className="card">
        <div className="card-head"><h2>Cómo se calcula todo</h2></div>
        <div className="card-pad stack" style={{ gap: 10, maxWidth: "72ch" }}>
          <p style={{ margin: 0 }}>
            <b>Puntos.</b> Victoria, empate y derrota suman lo que indiques arriba. Se cuenta la
            serie completa: ganar 2–0 y ganar 2–1 valen lo mismo.
          </p>
          <p style={{ margin: 0 }}>
            <b>%V.</b> Victorias más medio empate, dividido entre partidas jugadas.
          </p>
          <p style={{ margin: 0 }}>
            <b>Resistencia.</b> Media del porcentaje de victorias de tus rivales, con un suelo del
            25% por rival, tal como lo define el reglamento de Play! Pokémon. Sirve para desempatar
            a igualdad de puntos.
          </p>
          <p style={{ margin: 0 }}>
            <b>Elo.</b> Rating clásico recalculado en orden cronológico sobre todas las partidas de
            la liga, no solo las de una competición. Ganar a alguien mejor clasificado sube más.
          </p>
          <p style={{ margin: 0 }}>
            <b>Matriz de emparejamientos.</b> Solo entran las partidas en las que los dos jugadores
            tienen mazo asignado.
          </p>
        </div>
      </div>
    </>
  );
}
