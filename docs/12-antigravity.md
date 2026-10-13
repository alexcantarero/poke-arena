# Antigravity y entornos dev/prod

## Abrir Poke Arena en Antigravity

1. Abre o crea un proyecto de Antigravity y añade la carpeta raíz del repositorio `poke-arena`.
2. Trabaja en **Local mode** si quieres modificar tu carpeta actual. Usa un worktree para probar cambios aislados.
3. Antigravity carga las instrucciones del proyecto desde [`AGENTS.md`](../AGENTS.md). Consérvalo en la raíz del repositorio.
4. Mantén la revisión de operaciones habilitada en Antigravity. Revisa cualquier comando o cambio antes de aprobarlo, especialmente si menciona Neon, SQL o migraciones.

No pegues cadenas de conexión, contraseñas ni secretos en el chat del agente. El agente no necesita conocerlos para trabajar en el código.

## Separar las bases de datos

En Neon, conserva la rama existente que usa la aplicación publicada como `production` (a menudo se llama `main`) y crea una rama `dev` para el trabajo local y las previews. Comprueba en el panel de Neon el nombre de la rama y su endpoint antes de copiar una URL.

Una rama nueva de Neon parte de una instantánea de su rama padre. Si creas `dev` desde `production`, puede contener datos reales: limpia o anonimiza esos datos antes de compartir acceso a `dev` o publicar previews, y no des por hecho que la rama está vacía.

| Entorno | `DATABASE_URL` debe apuntar a | Dónde se configura |
|---|---|---|
| Desarrollo local | Neon `dev` | `.env.local`, que está excluido de Git |
| Preview de Vercel | Neon `dev` | Variable de entorno de Vercel con alcance **Preview** |
| Producción de Vercel | Neon `production` | Variable de entorno de Vercel con alcance **Production** |

En local, copia `.env.example` a `.env.local` y coloca únicamente la URL pooled de la rama `dev` en `DATABASE_URL`. Genera un `SESSION_SECRET` propio para desarrollo. No guardes la URL de producción en archivos locales, en el repositorio o en instrucciones para el agente.

En Vercel, configura `DATABASE_URL` por separado para **Preview** y **Production**; no marques una única URL para todos los entornos. Las demás variables también se configuran en Vercel cuando la aplicación las necesite. La URL de producción y los secretos de producción nunca se copian a `.env.local`.

## Preparar dev y desplegar cambios

La primera vez, inicializa el esquema en `dev` con `npm run db:push` después de verificar que `.env.local` apunta a la rama correcta. Ejecuta `npm run db:seed` solo si necesitas datos de ejemplo y la base de datos de desarrollo se puede borrar.

Flujo recomendado:

1. Trabaja en una rama de Git, desarrolla con `npm run dev` y valida con `npm test` y `npm run build`.
2. Comprueba una Preview de Vercel, que debe seguir conectada a Neon `dev`.
3. Revisa el diff y abre un pull request. Al integrar en la rama de producción, Vercel despliega el código usando su variable Production, conectada a Neon `production`.
4. Si cambia el esquema, prepara y revisa el SQL de migración por separado. Una persona responsable decide cuándo y cómo aplicarlo a `production`, con copia de seguridad y comprobación del destino. No conviertas `db:push` ni una migración en un paso automático de despliegue.

Las previews comparten la base de desarrollo: usa datos de prueba y evita datos personales o información que no quieras exponer a quienes tengan acceso a las previews.
