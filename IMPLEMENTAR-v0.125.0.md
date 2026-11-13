# IMPLEMENTAR v0.125.0

Sobre la **v0.124.0** (aplica antes la v0.124 y su migración 0036). **Sin migración.**

## 1. Aplicar (automático, con commit y push)

1. Cierra `npm run dev`.
2. Descomprime `arena-v0.125.0.zip` en la **raíz del repo**.
3. Doble clic en **`aplicar-v0.125.bat`**: copia, verifica (`npm run verificar` + `npm run build`)
   y, si todo pasa, **commit y push**. Si algo falla, mándame `aplicar-v0.125.log`.

Esta versión toca el layout (va en todas las páginas), la acción de guardar ronda y el service
worker. **Pruébala primero en la preview de Vercel** (rama `development`) antes de pasarla a
producción.

## 2. Lo que más acelera, y no es código: la región de las funciones

Medido el 13/11: las funciones de Vercel corren en **`iad1` (Washington)**. Cada página cruza el
Atlántico para ejecutarse y, si la base de Neon está en Europa, lo vuelve a cruzar en cada
consulta.

1. Despliega esta versión y abre **Ajustes → Uso**. La tarjeta «Distancia entre el servidor y
   la base de datos» dice la región de cada uno, lo que tarda una consulta y qué región elegir.
2. En **Vercel → Settings → Functions → Function Region**, elige la que indica (para una base en
   `eu-central-1`, **`fra1` · Fráncfort**) y **vuelve a desplegar**.
3. Vuelve a Ajustes → Uso: la consulta mínima debería quedar en pocos milisegundos («Cerca»).

Si la tarjeta dice que la base está en EE. UU., no cambies la región de las funciones sin más:
lo que tocaría es mover la base a Europa, y eso es otra operación (dímelo y lo preparamos).

## 3. Probar

1. **Cualquier página**: el menú, el número de pendientes, la Ball y el título bajo el avatar
   salen como antes (el título puede aparecer un instante después).
2. **Torneos y Calendario**: cargan igual; la limpieza automática sigue pasando (un borrador con
   fecha de hoy pasa a «En curso» en la visita siguiente, no en la misma).
3. **Apuntar una ronda desde la ficha** (formulario de siempre): guarda y avisa como antes, y
   los errores (ronda de más, falta el mazo del rival) salen igual.
4. **Modo torneo**, en un torneo en curso → «Apuntar rondas (modo torneo)»:
   - Con red: gané + mazo del rival + Guardar → la ronda sale «En el móvil» y enseguida «Subida».
   - **Sin red** (modo avión): guarda otra → «En el móvil», «1 por subir», el récord ya cuenta.
     Quita el modo avión: sube sola.
   - Con el modo avión puesto, cierra la pestaña y vuelve a abrir la dirección del modo torneo:
     la pantalla abre (dice abajo «Esta pantalla está guardada»).
   - Choque: sin red, apunta en el móvil la ronda siguiente; desde otro dispositivo, apunta esa
     misma ronda con otro resultado; al volver la red, en el móvil sale «Choca» con las dos
     opciones.
   - «Corregir» en una ronda ya subida la cambia sin choque.
5. **Ajustes → Uso**: la tarjeta de distancia enseña regiones y milisegundos.

## Deshacer

`git revert` del commit. No hay cambios de base de datos. Si el modo sin conexión diera guerra
en algún móvil: Ajustes → «Desactivar modo sin conexión» borra las cachés y el service worker.
