# PokeArena TCG — instrucciones para Claude Code

> Este fichero y `AGENTS.md` (que lee Antigravity) dicen lo mismo. **Si cambias uno, cambia el
> otro.** `AGENTS.md` manda en todo lo relativo a bases de datos y entornos; aquí se repite lo
> esencial y se añade el detalle de este proyecto.

## 1. Qué es esto

Web privada para llevar la liga de Pokémon TCG de un grupo de amigos: partidas, torneos, Elo,
Championship Points y estadísticas de metagame. Proyecto **personal**, no corporativo. El dueño
se comunica en español.

Escribe **todo en español**: comentarios, textos de interfaz, documentación y mensajes de commit.
Los identificadores de código y lo que ya esté en inglés en el diccionario EN se quedan como están.

## 2. Stack

Next.js 15.5 (App Router, Server Components y Server Actions) · React 19 · TypeScript ·
Tailwind CSS v4 configurado desde CSS, sin `tailwind.config.js` · shadcn/ui + Radix ·
Drizzle ORM 0.38 · PostgreSQL en Neon · Recharts 3 con carga diferida · Zod ·
Vercel Hobby + GitHub privado · un cron diario en `vercel.json`.

Rama de trabajo: `development`. Despliegue: Vercel.

## 3. Mapa del código

| Dónde | Qué hay |
| --- | --- |
| `src/lib/data.ts` | `loadSnapshot()` y las consultas estrechas (`loadConfig`, `loadPlayers`, `loadArchetypes`, `currentPlayer`). Todo envuelto en `cache()` de React. |
| `src/lib/*.ts` | Lógica pura sin imports: `stats`, `cp`, `cut`, `estructura`, `rank`, `arquetipos`, `h2h`, `mulligan`, `modalidades`, `estacion`, `badges`… |
| `src/actions/index.ts` | ~2.900 líneas, casi 60 Server Actions. Validación con Zod. |
| `src/lib/auth.ts` | Correo + contraseña con scrypt, sesión en cookie firmada con HMAC, alta solo por invitación, límite de intentos y `session_version`. |
| `src/db/schema.ts` | 21 tablas, claves primarias de texto. `settings` tiene una sola fila (`id = "default"`). |
| `drizzle/` | Migraciones SQL a mano e idempotentes. |
| `tests/` | `node --experimental-strip-types --test`. |

## 4. Reglas que no se negocian

### Código

1. **Los módulos de `src/lib/` que se prueban no importan nada.** Lo que necesitan entra por
   parámetro. Nunca importes con extensión `.ts`: rompe `next build` (TS5097).
2. **Un cálculo sin test no está terminado.** Cada fichero de cálculo nuevo lleva su
   `tests/*.test.ts`.
3. **Las migraciones SQL son idempotentes** (`IF NOT EXISTS`, `DO $$ … EXCEPTION WHEN
   duplicate_object …`). `db:push` no cambia datos ni restricciones CHECK: si hay migración, hay
   `.sql`.
4. **Toda Server Action comprueba sesión y papel por dentro.** Esconder un botón no protege nada:
   una Server Action es un endpoint público.
5. **`PUBLIC_PLAYER_COLUMNS` en `data.ts` es un candado.** Usa `satisfies Record<keyof
   PublicPlayer, unknown>` para que `email`, `password_hash`, `login_attempts`, `locked_until` y
   `session_version` no puedan llegar al navegador. No lo rompas.
6. **Orden de escritura:** validar → comprobar permisos → escribir → invalidar caché → redirigir
   con el aviso en la URL (snackbar).
7. Todo texto nuevo de interfaz va al diccionario ES/EN. Tema claro y oscuro. Respeta «reducir
   movimiento». Contraste ≥ 4,5:1. Nada que dependa solo del color.
8. **Móvil primero**: listas de tarjetas antes que tablas anchas, hojas inferiores antes que
   modales, objetivos táctiles de 44 px, campos a 16 px (si bajan de ahí, Safari iOS hace zoom).

### Bases de datos y entornos

9. En local, `DATABASE_URL` apunta **solo** a la rama `dev` de Neon, en `.env.local`.
10. **Nunca** apuntes local, tests ni previews a la rama `production`.
11. No abras, leas, copies ni imprimas `.env`, `.env.*` ni ningún valor de credencial. No pidas
    credenciales por el chat.
12. **No ejecutes `db:push`, `db:seed`, migraciones ni SQL de escritura contra producción.**
    `db:seed` puede borrar datos. Las migraciones de producción las aplica una persona tras
    revisar el SQL.
13. Si no puedes verificar que la base de destino es `dev`, no ejecutes nada que lea o escriba:
    explica el bloqueo y pregunta.

### Privacidad y fuentes externas

14. Secretos (`DATABASE_URL`, `SESSION_SECRET`, `CRON_SECRET`, claves de API) solo en variables de
    entorno de Vercel. Nunca en el repositorio, en logs, en el chat ni en un zip. Comprueba que
    `.env.local` sigue en `.gitignore`.
15. **No se raspa RK9.gg ni pokemon.com.** Sus condiciones prohíben expresamente la extracción
    automatizada, con o sin fines comerciales. Fuentes permitidas: la API pública de Limitless
    (solo torneos online), Ciphermaniac (licencia MIT, con atribución), TCGdex, y texto pegado a
    mano y analizado en el cliente.
16. **`meta_entries` no tiene columna de nombre de jugador y no se le añade.** Al importar una
    clasificación solo se guardan puesto y mazo.
17. Ninguna ruta de API devuelve nada sin sesión: 401.

### Honestidad técnica

18. Antes de usar una API o una opción de una librería, **comprueba la versión instalada** y su
    documentación. No inventes endpoints, opciones de `next.config` ni firmas de funciones.
19. Si no puedes verificar algo (un límite de cuota, el comportamiento de un servicio), dilo en el
    informe en vez de afirmarlo.
20. No añadas dependencias sin justificarlo en una línea: qué resuelve, tamaño, alternativa
    descartada.
21. **Haz el cambio mínimo que cumple el objetivo.** No reescribas lo que funciona, no renombres
    ni muevas ficheros sin necesidad.
22. **No dejes scripts temporales en el repositorio.** Si necesitas un script de un solo uso,
    déjalo en `/tmp` o bórralo antes de terminar. Ya hubo que limpiar 21.

## 5. Protocolo de trabajo

1. **Lee antes de escribir.** Recorre los ficheros que vas a tocar y sus llamadores.
2. **Plan primero.** Entrega un plan numerado (ficheros, orden, riesgos, qué se prueba) y espera
   aprobación antes de modificar nada.
3. **Una rama por fase**, commits pequeños y atómicos con mensaje en español (`feat:`, `fix:`,
   `refactor:`, `test:`, `docs:`).
4. **Verifica antes de dar nada por terminado, y pega la salida real:**
   - `npm test`
   - `npx tsc --noEmit` (compara con el estado anterior: no puede haber errores nuevos)
   - `npm run build`

   Si algo falla, lo arreglas o lo reportas. Nunca digas «debería funcionar» sin haberlo ejecutado.
5. **Cada fase termina con**: subida de versión en `package.json`, entrada en `CHANGELOG.md`, una
   guía `IMPLEMENTAR-vX.Y.Z.md` (ficheros cambiados, migración, variables de entorno, pasos de
   despliegue y cómo deshacerlo) y un informe de qué se hizo, qué no y por qué.
6. **Al terminar una fase, para.** No empieces la siguiente sin confirmación.
7. Si una tarea es mayor de lo previsto, divídela y avisa. No entregues a medias fingiendo que
   está completa.

## 6. Formato de cada entrega

1. Resumen en 5–10 líneas.
2. Lista de ficheros nuevos / modificados / borrados.
3. Salida pegada de `npm test`, `tsc` y `build`.
4. Checklist de la fase: ✅ hecho · ⚠️ parcial · ❌ no hecho, con motivo.
5. Pasos manuales (SQL en Neon, variables en Vercel).
6. Preguntas abiertas.

## 7. Deuda conocida, por si te la encuentras

- **`loadSnapshot()`** sigue cargando las 21 tablas en las pantallas pesadas. El plan por fases
  está en `docs/13-plan-rendimiento.md`. **Léelo antes de tocar `data.ts`.**
- **`pokemontcg.io` está deprecada y muere el 1 de marzo de 2027.** Reemplazo previsto: TCGdex.
  Es reescribir `src/lib/sources/pokemontcg.ts` y nada más.
- **Los sprites** salen de `https://r2.limitlesstcg.net/pokemon/gen9/<slug>.png`, que es un patrón
  de URL de un tercero, no un contrato.
- **`src/actions/index.ts`** tiene casi 60 acciones en un fichero. Partirlo por dominio está
  pendiente, pero no es urgente.
- **Hay una liga implícita en el esquema**: `settings` tiene una sola fila. Abrir la app a otros
  organizadores exige un concepto de liga/tenant. No añadas tablas sin pensar en eso.
- **Traducción ES/EN incompleta**: el diccionario cubre menú, cabecera y «Más».
- **La PWA es solo manifiesto**, no hay service worker.
