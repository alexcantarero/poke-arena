# IMPLEMENTAR v0.123.0

Sobre la **v0.122.0**. Si aún tienes la 0.121, aplica antes la v0.122.

## 1. Migración (antes de usar las causas de derrota)

Neon → SQL Editor, **primero `dev`** y luego `production`: `drizzle/0035_v0_123_0.sql`
(idempotente). En local: `npm run db:migrar`. Sin ella, la app funciona; las causas no se guardan.

## 2. Aplicar (automático, con commit y push)

1. Cierra `npm run dev`.
2. Descomprime `arena-v0.123.0.zip` en la **raíz del repo**.
3. Doble clic en **`aplicar-v0.123.bat`**: comprueba, copia (y borra `_v0.123/` en seguida),
   verifica, hace el build y, si todo pasa, **commit y push** a tu rama. Si algo falla, mándame
   `aplicar-v0.123.log`.

**Opcional:** borra `POKEMONTCG_API_KEY` de las variables de Vercel; ya no se usa.

## 3. Probar

1. **Registrar partida → Tipo de partida**:
   - *No presentado*: desaparecen marcador y mazos; eliges quién no vino y sale «Gana X: Y no se
     presentó». Guarda: en la liga suma 3 puntos al que fue; el Elo no se mueve.
   - *Bye (impares)*: no hay rival; suma la victoria en la clasificación de la liga.
   - *Normal*: termina una serie perdida → al final, «¿Por qué perdió…?» con las etiquetas. Marca
     dos, guarda, vuelve a abrir la partida: siguen marcadas.
2. **Torneo → apuntar ronda**: «Ronda especial» con Bye / Rival no presentado / No me presenté.
   Una ronda perdida o empatada enseña las etiquetas de causa.
3. **Estadísticas → Por qué se pierde**: barras con las causas marcadas; los filtros de arriba
   (jugador, fechas…) cambian el gráfico.
4. **Inicio → Último Regional → Torneos pasados**: solo Regionales.
5. **Calendario → Challenges y Cups de la zona**: pega un bloque con «Copa de Liga / League Cup
   Noviembre - Mythic Games / dirección / fecha». El torneo sale como «League Cup Noviembre», con
   «Organiza: Mythic Games», la sede completa, ciudad, país y hora.

## Deshacer

`git revert` del commit. La tabla `match_causas` puede quedarse.
