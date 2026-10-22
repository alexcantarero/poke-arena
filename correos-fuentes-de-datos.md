# Correos para pedir acceso a datos — PokeArena TCG

Redactados el 22 de octubre de 2026. Van en **inglés** porque los cuatro proyectos se
gestionan en inglés; debajo de cada uno, un resumen en español de lo que pide.

Antes de enviar, rellena lo que va entre corchetes: `[Tu nombre]`, `[URL de la app]`.
**No incluyas** credenciales, la URL de la base de datos ni nada de `.env.local`.

Ya escribiste a Limitless y a Ciphermaniac sin respuesta, así que esos dos están redactados
como **seguimiento** y por un canal distinto al correo cuando lo hay (Discord, formulario).

| # | Fuente | Canal | Qué se pide | Prioridad |
|---|---|---|---|---|
| 1 | Ciphermaniac | Formulario `https://ciphermaniac.com/feedback` (no publica correo) | Que dejen de bloquear (403) la lectura servidor a servidor | **Alta**: ya tienen licencia MIT y dicen que los datos se pueden usar |
| 2 | Limitless TCG + Labs | `contact@limitlesstcg.com` y su Discord (canal de API) | Permiso para usar agregados de torneos presenciales, sin nombres | Alta |
| 3 | RK9 Labs | Ticket en `https://support.rk9.gg` | Si hay una vía autorizada (exportación o API) para datos agregados | Media: es la fuente original, pero prohíben la extracción automatizada |
| 4 | pokedata.ovh | Sin canal de contacto público encontrado | — | Baja |

Notas sobre los canales:

- **Limitless**: su documentación de desarrolladores manda las dudas a su **Discord**, y las
  claves de API se piden desde los ajustes de usuario de play.limitlesstcg.com, pero solo se
  dan a proyectos **públicos** con un caso de uso legítimo. Arena es privada, así que no se
  pide una clave: se pide **permiso**. `contact@limitlesstcg.com` sale de la investigación
  del 23 de septiembre; compruébalo en `limitlesstcg.com/contact` antes de enviar.
- **RK9**: su aviso de privacidad remite a `support.rk9.gg` como canal de contacto. Una
  política antigua en rk9labs.com daba también `info@rk9labs.com`; úsalo solo si el ticket no
  avanza.
- **pokedata.ovh**: en la revisión del 23 de septiembre no tenía términos, API ni contacto.
  Además republica datos de RK9, así que pedírselo a ellos no sustituye a pedírselo a RK9.
- **TCGdex** (imágenes y datos de cartas, sustituto de pokemontcg.io, que deja de funcionar
  el 1 de marzo de 2027) es gratuita y sin clave: **no hace falta escribir**.

---

## 1. Ciphermaniac — formulario de feedback

**Dónde:** https://ciphermaniac.com/feedback
**Alternativa:** abrir una *issue* en https://github.com/rosematcha/ciphermaniac

> **Subject:** Server-to-server reads return 403 — small private league app, asking for access
>
> Hi Reese,
>
> First, thanks for Ciphermaniac and for publishing the data under MIT — it's exactly the kind
> of resource our small group needed. I wrote a while ago but I'm not sure the message
> arrived, so I'm following up here as your R2 docs suggest.
>
> I run PokeArena TCG, a private, invite-only web app for a Pokémon TCG playgroup of about
> 20 people in Spain. We'd like to show the in-person meta (archetype share and conversion)
> next to our own league results.
>
> Following your R2 documentation, our server reads `reports/tournaments.json` and, from the
> latest event, `meta.json`, `archetypes/index.json`, `conversion.json` and the `topcut`
> slice. Since October every request returns **403**, including
> `build/v1/channels/production.json`, while your documentation page loads fine. A missing
> file would be a 404, so I believe our requests are being blocked at the edge.
>
> How we read the data:
> - Server-to-server only (Next.js on Vercel), never from the browser.
> - Identified User-Agent: `PokeArenaTCG/<version> (liga privada de amigos; servidor a servidor; cache 6 h)`.
> - Cached for 6 hours; a handful of requests per day in total.
> - We never request `decks.json` or `players.json`, and we store no player names.
> - Visible attribution to Ciphermaniac, LimitlessTCG and Play! Limitless.
>
> Could you let us know whether there's a way to be allowed through — for example
> allowlisting our User-Agent, or a header or token you'd like us to send? Vercel's outbound
> IPs aren't fixed, so an IP allowlist probably won't work. If you'd rather we didn't read the
> bucket at all, that's completely fine too; just tell us and we'll remove the integration.
>
> Thanks a lot,
> [Tu nombre]
> PokeArena TCG — [URL de la app]

*En español:* explica el 403 con datos concretos (qué ficheros, desde dónde, con qué
identificación y caché), confirma que no se piden ficheros con nombres de jugadores y pide
cómo dejarnos pasar, ofreciendo retirar la integración si lo prefieren.

---

## 2. Limitless TCG (y Limitless Labs)

**Para:** contact@limitlesstcg.com
**Y además:** un mensaje corto en su Discord, en el canal de la API, enlazando a este correo.

> **Subject:** Permission request: aggregated in-person tournament data for a private playgroup app
>
> Hi Robin and the Limitless team,
>
> I'm following up on an earlier message that may have got lost. I run PokeArena TCG, a
> private, invite-only web app for a Pokémon TCG playgroup of about 20 people in Spain. It
> tracks our league, our tournament results and Championship Points, and compares our meta
> with the wider one.
>
> We already use your public API (`/tournaments`, `/details`, `/standings`) for online
> events, without a key, with caching and well within the rate limits. Since that API only
> covers the online platform, the in-person Regionals, Internationals and City Leagues are the
> piece we're missing.
>
> We have **not** scraped limitlesstcg.com or labs.limitlesstcg.com, and we won't without your
> permission. What we'd like to ask:
>
> 1. Would you allow us to read, **once a month**, aggregated data for in-person events: deck
>    archetype per placing, archetype share and top-cut conversion? We would store **no
>    player names**; our importer discards them, and the database table has no column for
>    them.
> 2. Specifically from Labs: the aggregated `/{event}/decks` and `/{event}/decks/{archetype}/matchups`
>    pages, which have no names and are exactly what our matchup matrix needs.
> 3. If there's a preferred way to do this (an export, an endpoint, or a key under specific
>    terms), we're happy to follow it. We know API keys are meant for public projects, and
>    ours is private, so permission under your conditions is what we're after.
>
> Attribution to Limitless would be visible on every screen that shows this data. If the
> answer is no, that's fine; we'll keep entering in-person results by hand.
>
> Thank you for everything you do for the competitive scene,
> [Tu nombre]
> PokeArena TCG — [URL de la app]

**Mensaje corto para Discord:**

> Hi! I run a small private playgroup app that already uses the public API for online
> events. I've emailed contact@limitlesstcg.com asking for permission to use aggregated,
> name-free data from in-person events (and Labs' deck/matchup pages) once a month. Is that
> the right place, or is there someone better to ask? Thanks!

*En español:* deja claro que ya se usa la API pública con respeto, que no se ha raspado
nada, y pide permiso concreto (qué datos, con qué frecuencia, sin nombres) aceptando sus
condiciones o un no.

---

## 3. RK9 Labs — ticket de soporte

**Dónde:** https://support.rk9.gg (nuevo ticket)
**Si no avanza:** info@rk9labs.com

> **Subject:** Is there an authorized way to access aggregated decklist/standings data?
>
> Hello RK9 team,
>
> I run PokeArena TCG, a private, invite-only web app for a Pokémon TCG playgroup of about
> 20 people in Spain. I've read your Terms of Service, and I understand that automated
> extraction from rk9.gg is not allowed, so we don't do it and won't.
>
> I'm writing to ask whether there is an **authorized** way to obtain aggregated data from
> Play! Pokémon events: for example an export, a feed or a licensing contact. What we'd use
> is limited:
>
> - archetype per placing and top-cut results for TCG Masters;
> - no player names or personal data (we would discard them on import);
> - about once a month, cached, for a non-commercial private group.
>
> If no such route exists, a short reply saying so would help us close the question.
>
> Thank you,
> [Tu nombre]
> PokeArena TCG — [URL de la app]

*En español:* reconoce la prohibición de raspar y pregunta solo si existe una vía
autorizada. Lo más probable es que digan que no; aun así, deja el tema cerrado con su
respuesta.

---

## Qué hacer con las respuestas

- **Ciphermaniac dice que sí:** no hay que cambiar código. El diagnóstico de Ajustes →
  Importar datos se pondrá en verde y el lector ya existe (`src/lib/sources/ciphermaniac.ts`).
  Si piden una cabecera o un token, va como variable de entorno en Vercel, nunca en el
  código.
- **Limitless dice que sí:** guarda el correo con las condiciones exactas (qué rutas, qué
  frecuencia) y pásamelo. El importador de presenciales (`meta_entries`, sin columna de
  nombre) ya está preparado para recibirlo.
- **Alguien dice que no o no contesta en un mes:** se sigue con lo que hay (API de Limitless
  para online, pegar clasificaciones a mano para lo presencial).
