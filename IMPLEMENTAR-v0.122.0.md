# IMPLEMENTAR v0.122.0

Sobre la **v0.121.0** (la que está en producción). **Sin migración, sin dependencias ni variables
nuevas.**

## 1. Aplicar (automático, con commit y push)

1. Cierra `npm run dev` si lo tienes abierto (Windows bloquea la carpeta `.next` y el build falla).
2. Descomprime `arena-v0.122.0.zip` en la **raíz del repo**.
3. Doble clic en **`aplicar-v0.122.bat`**. El script:
   - comprueba el repo, la versión (0.121.0) y la rama; si tienes cambios sin subir, te los enseña
     y pregunta (entrarían en el mismo commit);
   - copia `_v0.122/` y **la borra en seguida** (era lo que hacía fallar la v0.121);
   - borra `IMPLEMENTAR-v0.120.0.md` y los restos de la v0.120 y v0.121 (`_v0.121/`,
     `aplicar-v0.121.*`) que quedaron en el repo;
   - `npm run verificar` y `npm run build`;
   - si todo pasa: **`git add` + `git commit` + `git push`** a la rama en la que estés. Vercel
     despliega solo;
   - todo lo que sale por pantalla queda en `aplicar-v0.122.log`. **Si algo falla, mándame ese
     fichero.** Si todo va bien, se borra.

Si el push falla (sesión de GitHub caducada), el commit queda hecho en local: `git push` a mano.

## 2. Probar

1. **Elo online**: tu gráfica ya no debería caer con los torneos online. Con un récord parejo se
   mantiene o sube poco; un top 4 online suma +10 y ganarlo +20.
2. **Divisiones de Elo**: las insignias con los degradados de los CP (Esmeralda entre Platino y
   Diamante; Master y GrandMaster en lugar de Maestro y Gran Maestro).
3. **Mejores resultados / CP**: los números de las medallas Esmeralda, Diamante, Master y
   GrandMaster, en negro y legibles.
4. **Top Decks → Último torneo**: arriba el último de 300+, debajo el último de 100–299. Abajo, cómo
   se actualiza (sola, cada 6 h como mucho).
5. **Ajustes → Torneos online de Limitless**: elige 14 días y «Buscar e importar». Debe mirar del
   orden de cientos de torneos y encontrar los vuestros, con rondas, top cut, organizador, puesto,
   récord y mazo. Tarda (hasta un minuto con 30 días). El cron lo hace solo cada día con los dos
   últimos días: en `/api/cron/limpieza` la respuesta trae `limitless` con lo que encontró.
6. **Idioma EN**: los textos nuevos salen en inglés.

## Deshacer

`git revert` del commit de la v0.122.0.
