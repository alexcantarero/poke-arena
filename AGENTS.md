# Instrucciones para agentes de Poke Arena

## Límites de entorno y datos

- Para desarrollo local, usa exclusivamente la rama `dev` de Neon mediante `DATABASE_URL` en `.env.local`.
- Nunca apuntes el entorno local, las pruebas ni las previews de Vercel a la rama `production` de Neon.
- No abras, leas, copies, imprimas ni incluyas en respuestas o cambios los archivos `.env`, `.env.*`, ni valores de credenciales. No solicites credenciales al usuario por el chat.
- Vercel Production es el único entorno de la aplicación que debe usar la URL de la rama `production`; las previews deben usar la URL de `dev`.
- No ejecutes `npm run db:push`, `npm run db:seed`, migraciones, SQL de escritura ni cambios destructivos sobre producción. El usuario debe revisar y autorizar explícitamente cualquier operación de esquema o datos; las migraciones de producción las aplica una persona tras revisar el SQL.
- `npm run db:seed` puede borrar datos. No lo ejecutes sin autorización y solo contra una base de datos descartable de desarrollo.
- Si no puedes verificar que la base de datos de destino es `dev`, no ejecutes comandos que lean o modifiquen datos; explica el bloqueo y pide confirmación.

## Flujo de trabajo

- Antes de cambiar código, inspecciona el contexto relevante y propone un plan breve para cambios que abarquen varios archivos.
- Mantén los cambios acotados y sigue los patrones existentes del proyecto.
- Valida los cambios con `npm test` y, cuando sea pertinente, `npm run build`.
- No publiques cambios ni despliegues a producción sin una solicitud explícita del usuario.

## Codificación — obligatorio (v0.42)

Todos los ficheros en **UTF-8 sin BOM**. El 9 de octubre una sesión reescribió
`src/actions/index.ts` leyéndolo como Windows-1252 y el texto con acentos se
corrompió («contraseña» pasó a ser dos caracteres raros por cada ñ). Estuvo así
diez días porque **ni los tests, ni `tsc`, ni el build lo detectan**.

Antes de dar nada por terminado:

```bash
npm run verificar   # codificación + tests + tsc
npm run build
```

En Windows, nunca `Set-Content` ni `Out-File` sin `-Encoding utf8`.
