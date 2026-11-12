# IMPLEMENTAR v0.120.0

Sobre la **v0.117.0** (la que está en producción). **Sin migración, sin dependencias nuevas y sin
variables de entorno nuevas.**

> **Cambian el Elo y la Forma.** Al desplegar se recalculan desde la primera partida con los pesos
> nuevos, y los números (y la gráfica) se moverán. No se borra nada: volver a la v0.117 los deja
> como estaban.

## 1. Aplicar (automático)

1. Descomprime `arena-v0.120.0.zip` en la **raíz del repo**.
2. Doble clic en **`aplicar-v0.120.bat`**: comprueba el repo (acepta 0.117.0), copia `_v0.120/`,
   borra lo que sobra, lanza `npm run verificar` y `npm run build`, y si todo pasa se borra solo.
3. Prueba con `npm run dev` y haz el commit.

**Borra:** las guías `IMPLEMENTAR-v0.112.0.md` a `v0.116.0.md` (sus migraciones ya están en
producción) y restos de scripts de aplicación anteriores. Se quedan la de la v0.117 y esta.

## 2. Probar

1. **Top Decks → Online**: cambia entre 14, 30 y 90 días; el número de torneos y listas debe
   cambiar de verdad. La primera carga tarda más (pagina Limitless y pide unas 90 clasificaciones);
   después va a la caché de 6 h. Cada mazo enseña tres barritas (hace dos meses, el mes pasado, este
   mes) y una flecha; el título de la barrita dice las tres cuotas.
2. **Top Decks → City Leagues** y **→ Último torneo**: lo que antes estaba en Estadísticas.
   `/estadisticas?fuente=city` (o `regionales`, `evento`) redirige allí.
3. **Elo**: mira tu gráfica y el ranking. Un Regional con día 2 debe notarse mucho; una derrota en
   Regional, poco; una Cup con récord positivo sube algo y un top cut de Cup bastante.
4. **Forma**: alguien que lleve 8–14 días sin jugar baja poco (1 por día); a las tres semanas ya
   nota más.
5. **Avisos**: con una cuenta sin nick de Limitless sale arriba el aviso rojo; «Ponerlo ahora» lleva
   al campo. Si tu rango del ladder tiene más de 7 días (o no lo tienes), sale el recordatorio
   semanal; «Recordar la semana que viene» lo calla.
6. **Menú**: ya no están «Torneo del Cinturón» ni «Liga por divisiones». Se entra desde las
   tarjetas de arriba de Torneos y de Liga.
7. **Liga por divisiones**: apuntado, arriba sale «Únete al Discord de la liga».
8. **Calendario → Challenges y Cups de la zona**: pega el ejemplo de los dos Challenges del 12/11.
   Deben salir dos torneos en borrador: «TCG League Challenge November» (Sant Joan Despí) y
   «Porygon's Cup» (Mataró), con la dirección en «Tienda o sede», la ciudad y la hora 18:00. Pegar
   otra vez no duplica.
9. **Idioma EN**: todo lo nuevo sale en inglés.

## Deshacer

`git revert` del commit. No hay cambios de esquema.
