# Cómo meter la v0.4.0 en `develop`

El zip trae **solo los ficheros que cambian**, con la misma estructura del proyecto.
Descomprímelo encima de tu copia y sobrescribe.

```bash
git checkout develop
git pull
unzip -o arena-v0.4.0-cambios.zip -d .
git status          # tienen que salir 32 ficheros: 26 modificados y 6 nuevos
git diff --stat
```

Si sale alguno más, párate y mira qué es antes de seguir.

**Los 6 nuevos:**

```
drizzle/0002_v0_4_0.sql
src/app/(app)/torneos/[id]/editar/page.tsx
src/components/ArchetypeSync.tsx
src/components/CpBreakdown.tsx
src/components/DeckPicker.tsx
src/components/TournamentLifecycle.tsx
src/components/TournamentResultForm.tsx
src/lib/sources/limitless.ts
src/lib/sources/pokeapi.ts
```

---

## 1. La base de datos

Dos pasos, en este orden.

```bash
npm run db:push
```

Eso crea, leyendo el esquema de Drizzle: `tournaments.status`, `tournaments.closed_at`,
`decks.created_by`, la tabla `deck_favorites`, y quita el `NOT NULL` de `decks.player_id`.

Después, pega **`drizzle/0002_v0_4_0.sql` entero** en el SQL Editor de Neon. Es idempotente.
Lo que hay ahí y no sale del esquema de Drizzle:

- El `CHECK` de `tournaments.status`. Importa porque `setTournamentStatus` es una Server Action,
  o sea un endpoint público: el formulario acota, la acción vuelve a acotar, y el CHECK es la
  tercera red — la única que no depende de que el código esté bien.
- El índice `matches_tour_round_idx`, que ya venía de 0001 pero se repite por si acaso: el alta
  de rondas hace un `ON CONFLICT` contra él y sin el índice falla en cada ronda nueva.
- Rellenar `decks.created_by` con el dueño actual, que es lo único que sabemos de quién creó los
  mazos que ya existen.

Al final del fichero hay cuatro comprobaciones comentadas. Descoméntalas y ejecútalas.

**Nada se pierde.** Los torneos que ya existen quedan en estado «en curso», que es como se
comportaban. Los mazos conservan su dueño; la biblioteca compartida son los mazos nuevos que
crees sin dueño.

---

## 2. Compilar

```bash
npm test        # 33 pruebas
npm run build
npm run dev
```

Sigue en pie el aviso de siempre: **este proyecto no se ha compilado nunca aquí** (npm está
bloqueado en el entorno donde se escribe). Lo que sí ha pasado: las 33 pruebas del motor de CP,
un comprobador estático de imports y exports sobre los 79 ficheros, y tres pasadas de revisión
de código. Si `npm run build` saca algo, pásamelo y lo miro.

---

## 3. Qué probar en el navegador, y en este orden

1. **Crear un torneo** → `/torneos/nuevo`. Pon 32 en «cuánta gente» y fíjate en que te propone
   5 rondas. Elige «Borrador» y guarda.
2. En la ficha, arriba, tiene que salir la barra de ciclo con **«Borrador»** y el botón
   **«Empezar el torneo»**. Dale.
3. **Apunta la ronda 1**: rival, contra qué mazo (escribe para buscar), «Salí 1.º», «Gané».
   Guarda. El récord de arriba pasa a `1-0-0`.
4. **Apunta la ronda 1 otra vez**, con el mismo número. No se duplica: se sobrescribe.
5. **Edita la ronda 1 y cámbiale el número a 2.** Tiene que *moverse*, no duplicarse. (Esto
   estaba roto y es lo que más me interesa que compruebes.)
6. **Modo juego a juego**: marca el juego 1 y el 2 con la misma letra; el juego 3 desaparece
   solo. Fíjate en que cada juego tiene su propio «Salí 1.º / 2.º».
7. **Pon tu resultado final**: elige el mazo. Vuelve a las rondas: arriba tiene que decir
   «Jugando *tu mazo* todo el torneo» y ya **no** te pregunta el mazo en cada ronda.
8. **Cierra el torneo.** El formulario de ronda desaparece. Reábrelo y vuelve.
9. **Edita la cabecera** (`/torneos/<id>/editar`) y cambia la asistencia. Vuelve a la ficha: los
   CP tienen que haberse recalculado solos.
10. **Ajustes → Datos del metagame → Actualizar catálogo.** Tarda; es normal, son varias decenas
    de llamadas. Al terminar dice cuántos arquetipos ha añadido. Busca «Grimmsnarl» en Mazos.
11. **Mazos**: crea uno con ámbito «De la liga». Tiene que salir en el selector del rival de una
    ronda. Marca alguno como favorito y comprueba que sale el primero.
12. **Perfil**: las cifras de arriba y el filtro Todo / Liga / Torneos / Amistosos. Y el
    desglose de CP con los 4+4+5.

---

## 4. Una cosa de Vercel que no es código

En la lista estaba «poder invitar a amigos a la web y a los torneos **sin que tengan que crear
cuenta en Vercel**». Eso no se arregla en el repositorio: es un ajuste del proyecto.

Vercel protege por defecto los despliegues con su propio login. Si les estás pasando una URL de
*preview* (`arena-git-develop-...vercel.app`), Vercel les pide cuenta.

- Pásales **la URL de producción**, no la de preview.
- Y en **Project Settings → Deployment Protection**, deja **Vercel Authentication** desactivada
  para producción.

Con eso, el enlace de invitación de Arena es lo único que hace falta para entrar.

---

## 5. Lo que sé que sigue pendiente

Para que no te pille de sorpresa:

- **Las imágenes de cartas** salen del CDN de Limitless, que es un patrón de URL de un tercero y
  no un contrato. Está comprobado que responde hoy. Si algún día cambia, cada carta cae a su
  línea de texto en vez de dejar un hueco, y el reemplazo natural es TCGdex (documentado en
  `docs/08-datos-externos.md`).
- **Las cifras de CP de 2027** son las que me pasaste en el documento. Si Play! Pokémon publica
  una corrección, se cambian los números en `src/lib/cp.ts` y no hay que tocar lógica.
- El **top cut** de una competición se guarda pero el cuadro sigue sin dibujarse.
