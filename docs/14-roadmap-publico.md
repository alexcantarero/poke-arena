# 14 · Hoja de ruta para abrir PokeArena al público

Escrita el 16/11/2026, con la app en la v0.133. Responde a «¿podríamos subir esto ya al público?».

## La respuesta corta

**Todavía no, tal cual.** La app funciona bien para vuestro grupo, pero está construida para UNA
liga y con marcas que no son nuestras. Abrirla hoy tendría cuatro problemas, por orden de gravedad:

1. **Una sola liga.** Hay una única configuración, un único ranking y un único Elo. Un segundo
   grupo vería y mezclaría sus datos con los vuestros. Es el cambio técnico más grande.
2. **Marca y propiedad intelectual.** El nombre «PokéArena», la Poké Ball del icono, los sprites y
   las imágenes de carta son de The Pokémon Company. En privado nadie mira; en una tienda de
   aplicaciones o con tráfico, sí. Hace falta otro nombre, otro icono y decidir qué imágenes se
   pueden seguir usando.
3. **Legal y datos personales.** No hay política de privacidad, ni condiciones de uso, ni forma de
   borrar la cuenta desde la propia app, ni tratamiento de menores. Con público, es obligatorio.
4. **Las fuentes de datos están pensadas para uso privado.** La API de Limitless da su clave a
   proyectos públicos (habría que pedirla), Ciphermaniac pide atribución y moderación, y
   pokemontcg.io deja de funcionar el 1/3/2027 (hay que pasar a TCGdex antes).

Además: Vercel Hobby es solo para uso personal no comercial, y no hay pruebas automáticas del
build (cada versión se compila por primera vez en tu ordenador).

## Fases

### Fase 0 — Estabilizar lo que hay (1–2 semanas)

- Aplicar y probar las versiones pendientes; dos semanas sin tocar nada más que fallos.
- **Build y pruebas automáticas en cada subida** (GitHub Actions: `npm run verificar` y
  `npm run build`). Es lo que más riesgo quita, y es gratis.
- Copia de seguridad semanal de la base (Neon permite ramas; un script que exporte a fichero).
- Pasar las imágenes de carta de pokemontcg.io a TCGdex.

### Fase 1 — Varias ligas (4–6 semanas)

- Cada dato cuelga de una liga (`league_id` en las tablas principales) y cada consulta filtra por
  ella. Es una migración grande: se hace en una rama de Neon, con vuestra liga como la primera.
- Crear una liga, invitar por enlace, y que cada uno pueda estar en varias.
- El Elo, la Forma, los avisos y el cron, por liga.
- Rendimiento: dejar de cargar el historial entero en Inicio, Ranking y Estadísticas.

### Fase 2 — Marca y legal (2–3 semanas, en paralelo)

- Nombre e icono propios; revisar textos, colores y qué imágenes de terceros se mantienen.
- Política de privacidad, condiciones de uso, borrado de cuenta y exportación de mis datos.
- Pedir la clave de la API de Limitless como proyecto público y escribir a Ciphermaniac.
- Aviso claro de que no es un producto oficial ni está afiliado.

### Fase 3 — Beta cerrada (4 semanas)

- Dos o tres grupos de fuera (otra tienda, otra ciudad) usando la app de verdad.
- Play Store en **prueba cerrada** (12 testers durante 14 días es justo lo que pide Google para
  una cuenta personal nueva): sirve a la vez de requisito y de beta.
- Medir: cuánto tarda cada página, qué se usa y qué no, qué preguntan.
- Pasar de Vercel Hobby a un plan que permita uso no personal, si va a haber gente de fuera.

### Fase 4 — Abrir (cuando la beta no dé sorpresas)

- Página pública de presentación (hoy todo está tras el inicio de sesión).
- Producción en Play Store. iOS, más adelante: la web instalada ya funciona en iPhone.
- Decidir el modelo: gratis con límites generosos y, si acaso, donaciones. Cobrar cambia las
  reglas de casi todas las fuentes de datos.

## Lo que haría único el producto

No competir con Limitless en datos del metagame, que ya lo hacen mejor. Lo que nadie más tiene es
**lo vuestro**: el historial de cada grupo, ronda a ronda, con el mazo de enfrente. De ahí salen la
preparación de torneo personalizada, el scouting entre amigos, el informe para compartir y el
modo torneo sin cobertura. Esa es la apuesta.

## Decisiones que hay que tomar antes de la Fase 1

1. ¿Proyecto de aficionados gratuito, o algo que algún día cobre? Condiciona hosting, fuentes y
   licencias.
2. ¿Nombre nuevo ya, o al llegar a la Fase 2? Cuanto más tarde, más sitios donde cambiarlo.
3. ¿Quién más mantiene esto? Con público, un fallo un sábado de torneo necesita a alguien.
