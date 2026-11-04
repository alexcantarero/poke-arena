# 15 · Uso real de Vercel y Neon: cómo se recoge cada dato

> v0.95.0 · 4 de noviembre de 2026. Límites y endpoints comprobados ese día en la
> documentación oficial de Vercel y Neon. **Cambian**: si una cifra no cuadra, mira
> primero los enlaces de la sección 7.

El panel **Ajustes → Uso y límites** (`/ajustes/uso`, solo organizadores) responde a una
pregunta: *¿cuánto falta para que el plan gratuito se quede corto?* Este documento explica de
dónde sale cada número, cuáles son reales y cuáles estimados, y qué hay que configurar para que
los estimados pasen a reales.

---

## 1. Resumen en una tabla

| Límite (al mes) | Plan | Límite | Cómo se obtiene en Arena | Real o estimado |
| --- | --- | --- | --- | --- |
| Invocaciones de funciones | Vercel Hobby | 1.000.000 | A mano, desde el panel *Usage* de Vercel | Real si se apunta; si no, estimado |
| CPU activa | Vercel Hobby | 4 h | A mano, desde *Usage* | Ídem |
| Memoria provisionada | Vercel Hobby | 360 GB·h | A mano, desde *Usage* | Ídem |
| Cómputo (CU·hora) | Neon Free | 100 CU·h por proyecto | API de Neon, automático | Real con `NEON_API_KEY` |
| Tráfico de red (salida) | Neon Free | 5 GB por proyecto | API de Neon, automático | Real con `NEON_API_KEY` |
| Almacenamiento | Neon Free | **1 GB por proyecto** | API de Neon (ramas) o `pg_database_size` | Real siempre; más exacto con la API |
| Despliegues y builds | Vercel | 100 despliegues/día | API de Vercel | Real con `VERCEL_TOKEN` |
| Actividad (gente, días, horas) | — | — | La propia base de Arena | Real siempre |

Dos cambios respecto a la v0.86 que conviene saber:

- **Neon subió el almacenamiento gratuito a 1 GB por proyecto** (antes 0,5 GB). El panel ya usa 1 GB.
- **Neon cuenta en GB decimales** (1 GB = 10⁹ bytes), no en GiB (1024³). El panel ya convierte así, para que las cifras cuadren con su consola.

---

## 2. Neon: datos reales y automáticos

### 2.1 Qué ofrece Neon en el plan gratuito

Neon tiene una API de *historial de consumo* (`/consumption_history/...`), pero **solo en planes de
pago**. En el gratuito hay dos lecturas que sí funcionan y que **no despiertan la base** (son la
API de control, no Postgres):

| Petición | Campo | Qué es | Conversión |
| --- | --- | --- | --- |
| `GET /api/v2/projects/{id}` | `compute_time_seconds` | CU·segundos del periodo | ÷ 3600 → CU·h |
| | `active_time_seconds` | Segundos de reloj con la base encendida | ÷ 3600 → horas |
| | `data_transfer_bytes` | Tráfico de salida del periodo | ÷ 10⁹ → GB |
| | `consumption_period_start` | Inicio del periodo; todo se pone a cero ahí | — |
| `GET /api/v2/projects/{id}/branches` | `logical_size` (por rama) | Tamaño de datos; se suma | ÷ 10⁹ → GB |

`compute_time_seconds ÷ active_time_seconds` es el tamaño medio de la base. Si sale más de 0,25,
la base está escalando por encima de lo necesario: limítala (ver 2.4).

Neon avisa de que estas cifras son **aproximadas, para vigilar**, no para facturar. Para lo que
necesita Arena sobran.

### 2.2 Configurarlo (5 minutos)

1. En la consola de Neon: **Account settings → API keys → Create new API key**. Ponle un nombre
   reconocible («arena-uso»). Cópiala: solo se enseña una vez.
2. El **id del proyecto**: en la consola, el proyecto de Arena → **Settings → General → Project ID**
   (tiene la forma `palabra-palabra-12345678`).
3. En Vercel: el proyecto → **Settings → Environment Variables**, añade **solo en Production**:
   - `NEON_API_KEY` = la clave del paso 1
   - `NEON_PROJECT_ID` = el id del paso 2
4. **Redespliega** (las variables se leen al arrancar).

> La clave da acceso a toda tu cuenta de Neon. Va **solo** en Vercel. Nunca en `.env.local`
> compartido, en el repo, en un zip ni en un chat (regla 14 de `CLAUDE.md`).

### 2.3 La historia del mes: el cron

Como el plan gratuito no guarda historial, Arena lo guarda por su cuenta: el cron diario
(`/api/cron/limpieza`, 04:00 UTC) llama a `guardarLecturaNeonDeHoy()` y escribe una fila en
`uso_lecturas` (`fuente = 'neon'`) con cómputo, horas encendida, tráfico, almacenamiento e
inicio del periodo. Una por día; si se repite el día, se sustituye.

Con dos lecturas o más aparece la **curva del periodo**: lo gastado día a día, la línea del
límite y, en discontinua, la **proyección a fin de periodo** al ritmo actual
(`proyectarPeriodo`, lineal; con menos de un día de datos no proyecta). Si el valor baja de un
día a otro, es que empezó un periodo nuevo, y la curva arranca de ahí (`serieDelPeriodo`).

Lo que añade al consumo: una petición HTTP a la API de Neon y una fila al día en una ejecución
que ya despertaba la base para la limpieza. Despreciable.

### 2.4 Lo que más estira el plan gratuito de Neon

- **Settings → Compute → tamaño máximo 0,25 CU.** El cómputo se cuenta en CU·h: a 0,25 CU,
  100 CU·h son 400 horas de base encendida al mes.
- **No tocar el apagado automático** (5 minutos sin peticiones; en el gratuito no se puede quitar).
- Lo que gasta es **cuántas horas al día hay alguien usando la app**, no cuánta gente. La gráfica
  «A qué horas se usa» del panel lo enseña: cada hora con barra es una hora (más 5 minutos) de
  base encendida.
- Las previews de Vercel apuntan a la rama `dev` de Neon: su cómputo **también cuenta** en el
  mismo proyecto.

---

## 3. Vercel: lo que hay y lo que no

### 3.1 La mala noticia: Hobby no tiene API de uso

Vercel publicó en 2025 una API de costes (`GET /v1/billing/charges`, formato FOCUS) y el comando
`vercel usage`, pero devuelven **cargos**, y un equipo Hobby no tiene cargos: no hay nada que leer.
Los *Drains* (exportar métricas) son de Pro. Así que invocaciones, CPU y memoria **no se pueden
leer automáticamente** en Hobby.

### 3.2 La solución: apuntarlo a mano, una vez al mes

En el panel de Arena, sección **«Vercel: cifras del panel Usage»**:

1. Abre **vercel.com → el proyecto de Arena → Usage** (o el panel del equipo → *Usage*).
   Deja el periodo actual.
2. Copia estas cifras tal y como salen:
   - **Function Invocations** → *Invocaciones*
   - **Active CPU** (en horas; si sale en minutos, divide entre 60) → *CPU activa (h)*
   - **Provisioned Memory** (GB-Hrs) → *Memoria (GB·h)*
   - **Fast Data Transfer** (GB), opcional → *Transferencia (GB)*
3. **Guardar lectura.** Se guarda en `uso_lecturas` (`fuente = 'vercel'`) con la fecha que elijas.

El formulario entiende «12.345», «12,345», «1,2K», «3,4 M» o «0,75» (`leerCifra`, con pruebas).
Lo que dejes vacío sigue estimado. Una lectura vale para el periodo en curso: pasados 31 días
deja de usarse y el panel vuelve a estimar hasta que apuntes otra.

Cada medidor dice **«real»** o **«estimado»**: nunca se mezclan sin avisar.

### 3.3 Lo que sí se lee automáticamente: despliegues

Con un token, la API de Vercel da los despliegues (`GET /v6/deployments`): cuántos en 30 días,
cuántos a producción, cuántos fallaron y el tiempo medio de build. De cada despliegue se lee
**solo** fecha, estado y tiempos; el autor y su correo vienen en la respuesta pero ni se guardan
ni se enseñan.

1. **vercel.com → Account Settings → Tokens → Create.** Ámbito: tu cuenta (o el equipo).
   Caducidad: la que prefieras; cuando caduque, el panel dirá «Vercel respondió 403».
2. El **id del proyecto**: proyecto → **Settings → General → Project ID** (`prj_…`).
3. Variables en Vercel (solo Production): `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` y, **solo si el
   proyecto es de un equipo**, `VERCEL_TEAM_ID` (`team_…`, en *Team Settings → General*).
4. Redespliega.

### 3.4 Si un día se quiere medir páginas vistas

No está hecho, a propósito. Las opciones, de menos a más coste:

- **Vercel Web Analytics** (`@vercel/analytics`): 50.000 eventos al mes en Hobby, visitas por
  página en el panel de Vercel. Sin API en Hobby: se mira allí. Una dependencia y un componente
  en el layout raíz.
- **Contar en la base** (una fila por visita): da datos propios, pero **cada visita escribiría en
  Neon**, y eso alarga las horas encendida. Es justo el recurso que más se gasta. Descartado
  mientras el plan sea el gratuito.

---

## 4. Lo que mide Arena por su cuenta

Sin configurar nada, de la propia base:

- **Jugadores** activos/total, y **activos a 7 y 30 días**: quien ha entrado (`last_seen_at`) o ha
  apuntado o corregido una partida.
- **Horas con actividad al día** (media de 14 días): horas distintas con algún movimiento. Es lo
  que alimenta la estimación de Neon cuando no hay API.
- **Actividad de los últimos 30 días**: partidas apuntadas o corregidas por día (barras) y si hubo
  gente distinta (puntos). Hora de Madrid.
- **A qué horas se usa**: 24 barras, hora de Madrid.
- **Tamaño de la base y de cada tabla**: `pg_database_size` y `pg_stat_user_tables`.

Ningún dato personal sale de aquí: solo recuentos.

---

## 5. Las estimaciones, por si no hay datos reales

`src/lib/usoLimites.ts`, con sus supuestos a la vista en el propio panel:

| Supuesto | Valor | Para qué |
| --- | --- | --- |
| Páginas por persona activa y día | 20 | Invocaciones, CPU, memoria |
| Ejecuciones por página | 1,5 | Invocaciones |
| CPU por página | 100 ms | CPU activa |
| Duración de reloj por ejecución | 400 ms | Memoria (incluye esperar a Neon) |
| Memoria por función | 2 GB | Fija en Hobby |
| Tamaño de la base | 0,25 CU | Cómputo de Neon |
| Lecturas completas por hora con actividad | 12 | Tráfico de Neon |

Fórmulas: invocaciones = activos × 20 × 30 × 1,5 · CPU = páginas × 0,1 s · memoria =
invocaciones × 0,4 s × 2 GB · cómputo = horas activas × 30 × (1 + 5/60) × 0,25.

Para ajustarlas con datos: apunta una lectura real de Vercel y compárala con la estimación del
mismo mes. Si la real es la mitad, baja *páginas por persona* en `SUPUESTOS`.

---

## 6. Dónde está cada cosa en el código

| Fichero | Qué hace |
| --- | --- |
| `src/lib/usoLimites.ts` | Límites, supuestos, estimación, series de los gráficos, proyección, `leerCifra`. Puro, con pruebas. |
| `src/lib/rotom.ts` | Qué Rotom cuida de cada límite y su sprite de PokéAPI. Puro, con pruebas. |
| `src/lib/usoDb.ts` | Lecturas de la base, API de Neon y de Vercel, `uso_lecturas`. Solo servidor. |
| `src/components/uso/GraficosUso.tsx` | Medidores, barras y curva en SVG pintado en el servidor (sin JS en el navegador). |
| `src/components/uso/AccesoUso.tsx` | La tarjeta de Ajustes. Lee solo lecturas guardadas: no llama a Neon ni a Vercel. |
| `src/app/(app)/ajustes/uso/page.tsx` | El panel. |
| `src/actions/ajustes.ts` → `guardarLecturaVercel` | Guardar lo apuntado del panel de Vercel. Solo organizadores. |
| `src/app/api/cron/limpieza/route.ts` | Guarda la lectura diaria de Neon. |
| `drizzle/0029_v0_95_0.sql` | La tabla `uso_lecturas`. |

### Variables de entorno (todas opcionales, solo en Vercel, solo Production)

| Variable | Para qué |
| --- | --- |
| `NEON_API_KEY`, `NEON_PROJECT_ID` | Cómputo, tráfico y almacenamiento reales; lecturas diarias del cron |
| `VERCEL_TOKEN`, `VERCEL_PROJECT_ID` | Despliegues y tiempos de build |
| `VERCEL_TEAM_ID` | Solo si el proyecto pertenece a un equipo |
| `CRON_SECRET` | Ya existía: sin él el cron no hace nada, tampoco guardar lecturas |

---

## 7. Fuentes (consultadas el 4/11/2026)

- Neon · Planes: neon.com/docs/introduction/plans
- Neon · Cálculo de uso, y «Tracking usage on the Free plan»: neon.com/docs/introduction/usage-calculations
- Neon · Límites de consumo y métricas del proyecto: neon.com/docs/guides/consumption-limits
- Vercel · Plan Hobby: vercel.com/docs/plans/hobby
- Vercel · Memoria de las funciones (2 GB fijos en Hobby): vercel.com/docs/functions/configuring-functions/memory
- Vercel · API de cargos (FOCUS): vercel.com/docs/rest-api/billing/list-focus-billing-charges
- Vercel · Listar despliegues: vercel.com/docs/rest-api/deployments/list-deployments

**Sin verificar desde aquí** (no se pudo entrar en las cuentas): el nombre exacto de cada métrica
en el panel *Usage* de tu cuenta y si `vercel usage` devuelve algo útil en Hobby. Si en tu panel
se llaman distinto, corrige la sección 3.2.
