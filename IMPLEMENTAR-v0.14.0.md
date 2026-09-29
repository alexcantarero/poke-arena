# Implementar la v0.14.0 (incluye la v0.13.0)

**Sin migración de base de datos y sin dependencias nuevas.** El zip es **acumulativo**: lleva
la v0.13.0 y la v0.14.0 sobre el repo del 28/09. Si ya pusiste la v0.13, no pasa nada: los
ficheros se sobrescriben con su versión más nueva.

## 1. Copiar

Descomprime `arena-v0.14.0-cambios.zip` en la raíz del repo y acepta reemplazar. No hay nada
que borrar a mano.

## 2. Comprobar

```bash
npm test          # 261 de 261
npm run build     # nunca se ha podido lanzar desde el entorno de Claude
```

## 3. Probar

1. **Móvil**: la barra de abajo dice Inicio · Estadísticas · + · Torneos · Más.
2. **Inicio**: ya no está «Últimos resultados».
3. **Nuevo torneo** → tipo League Challenge → el formato salta a **Bo1**.
4. **Ficha del Regional de 3.342** → pestaña **Día 1**: en «Resultados del grupo» cada
   jugador enseña solo sus rondas 1–8; **Día 2**: solo 9 en adelante; **General**: todas. La
   cabecera de cada uno lleva puesto, V–D–E, mazo, CP, premio y comentario.
5. **Ajustes → Regionales y City Leagues automáticos → Traer todo.** Tarda unos segundos
   (hay pausas a propósito). Al acabar, el aviso dice cuántos ha traído. Vuelve a pulsarlo:
   debe decir 0 nuevos sin hacer ninguna petición de torneo.
6. **Estadísticas → Regionales / City Leagues**: la tabla de mazos de lo traído.
7. **Inicio → Global**: el último Regional ya sale solo, con su top cut.
8. **Calendario → Challenges y Cups de la zona**: abre el buscador oficial, busca Barcelona
   (TCG, Challenge y Cup), copia la lista de resultados y pégala. Pégala dos veces: la segunda
   dice «0 nuevos, N actualizados».

## 4. Lo que conviene saber

- **La sincronización necesita hasta ~20 s** y Ajustes ya declara `maxDuration = 60`. En
  Vercel Hobby con Fluid Compute eso cabe; si Vercel la corta, pulsa «Solo Regionales» y
  «Solo City Leagues» por separado.
- **El recuento de Limitless es del Día 2**, no del campo entero (lo dice su propia página).
  La conversión «Global» del inicio es al top cut dentro de esa muestra.
- **El buscador de eventos no se lee solo** porque es de pokemon.com, cuyas condiciones
  prohíben la extracción automatizada. Pegar la lista es un minuto al mes.
- Si Limitless pidiera que no se lea su web, basta con quitar la tarjeta de Ajustes: todo lo
  demás funciona igual con lo pegado a mano.
