# Qué me viene bien que me mandes, y cómo

Preguntas qué prefiero para los cambios que vengan. Va por orden de lo que más me desbloquea.

---

## 1. El código: un zip, aquí en el chat

Es lo único que falta y lo que más frena. Y conviene que sepas por qué las otras vías no
sirven, para no perder tiempo con ellas:

- **Drive no vale.** La cuenta de Google conectada en esta sesión es la de Luce
  (`ibai.montero@luceit.es`). He buscado y en esa carpeta no hay nada accesible desde aquí;
  Arena está en tu cuenta personal.
- **El portátil tampoco.** Busqué en todo `C:\Users` y `D:` y no hay ni carpeta del proyecto ni
  `drizzle.config.ts`. Lo único parecido son dos zips de principios de septiembre en
  `D:\Web App`. Este es el portátil de trabajo; Arena vive en otra máquina.
- **Conectar la carpeta no me lo permite el sistema.** Lo intenté y lo rechaza.

Así que: **adjunta un zip en el chat**. Con esto me sobraa:

```
src/  drizzle/  package.json  next.config.ts  tsconfig.json
```

Y lo que **no** debe ir: `node_modules/`, `.next/`, y sobre todo **`.env.local`** — lleva la
contraseña de la base de datos, y ya se coló una vez en un zip anterior.

```bash
# Desde D:\Projects\poke-arena, en la máquina donde esté el repo
git archive -o arena.zip HEAD src drizzle package.json next.config.ts tsconfig.json
```

`git archive` respeta el `.gitignore`, así que no arrastra ni `node_modules` ni el `.env`.

**Cuándo mandarlo otra vez:** cuando hayas tocado bastante desde la última. No hace falta cada
día; sí antes de pedirme un cambio en una pantalla que hayas modificado tú.

---

## 2. Cuando algo está mal: captura + qué esperabas

Esto ya lo haces bien y es exactamente lo que necesito. La captura me dice cómo está maquetado
de verdad, que es lo que no puedo adivinar. Añádele una línea con **qué esperabas ver**, porque
muchas veces lo que parece un fallo es una decisión mía que no te conté.

Si es un error de compilación, pégame el error entero de `npm run build`. Yo **no puedo
compilar aquí** —el registro de npm está bloqueado en este entorno— así que ese texto es mi
única forma de verlo.

---

## 3. Para reglamento, datos o formatos: el documento fuente

El PDF del handbook ha sido, de largo, lo más útil que me has mandado. Destapó un fallo real que
llevaba semanas ahí: **el TCG tiene tres tablas de rondas y la app usaba una**. Sin el PDF yo
estaba trabajando con una tabla suelta y la web de anuncios.

Lo mismo con el formato de standings de Frankfurt que me has pasado hoy: con tres líneas reales
he podido fijar un test. **Un ejemplo real vale más que la descripción del formato.**

Si consigues la tabla oficial de Championship Points, mándamela: es lo único de `cp.ts` que
sigue sin contrastar contra fuente oficial.

---

## 4. Para pantallas nuevas: captura de cómo está + qué quieres que salga

Como hoy con lo de ciphermaniac. Lo que no me sirve es solo la idea, porque acabo
inventándome tu maquetación y luego no encaja.

Si es una pantalla que ya existe, la captura **y** el fichero. Si es nueva, con la captura de
una parecida me oriento.

---

## 5. Lo que no hace falta que me repitas

El contexto del proyecto está en los documentos que voy dejando en el proyecto de Claude
(v0.2 a v0.12, el reglamento verificado, ciphermaniac, el plan de offline). Cuando abras una
sesión nueva, los leo. No hace falta que me recuerdes qué es Arena ni las líneas rojas.

Lo que **sí** conviene decirme al empezar: **qué versión tienes subida a develop**. Es el dato
que más me ha faltado estas semanas.

---

## 6. Lo que te doy yo, para que sepas qué esperar

- **Ficheros que no pisan nada** cuando no tengo tu código: módulos nuevos y componentes que
  reciben todo por props. Los enchufas cambiando un import.
- **Tests de lo que se puede probar.** La lógica pura va siempre con sus casos, incluidos los
  que evitan contar cuentos (un mazo con tres pilotos al 100% no se corona).
- **Aviso cuando algo rompería el build.** Ayer pillé un import con extensión `.ts` que pasaba
  los tests y reventaba `npm run build` — el mismo tipo de fallo que se nos coló en la v0.9.0.
- **Y te digo cuando me equivoco.** Te dije que no había forma legítima de traer los Regionales
  y la había.

Lo que **no** puedo: compilar, ver la app por dentro (está tras login y no voy a meter
credenciales), ni tocar tu repo directamente.

---

## 7. Cadencia

Un cambio grande por entrega, con su zip y su guía. Cuando me pides cinco cosas a la vez, las
tres últimas salen peor: no porque no dé tiempo, sino porque cada una necesita que yo entienda
en qué estado quedó la anterior, y eso se pierde.

Si tienes cinco, mándamelas todas y te digo yo en qué orden las haría.
