# 14 · Hoja de ruta para abrir PokeArena al público

Escrita el 16/11/2026, con la app en la v0.133. Responde a «¿podríamos subir esto ya al público?».

## Actualización del 16/11/2026 (v0.134)

Decisiones de Ibai y lo que cambia:

- **Habrá UNA sola liga, con divisiones.** No hace falta el modelo de varias ligas: desaparece el
  bloqueo técnico más grande. Lo que sí queda es que la liga aguante más gente (rendimiento y
  moderación).
- **Lo legal ya está en la app** (v0.134): política de privacidad y condiciones de uso públicas,
  descargar mis datos y borrar mi cuenta desde Ajustes. Faltan dos variables de entorno con quién
  responde de los datos, y que alguien que sepa revise los textos.
- **pokemontcg.io ya no se usa** desde la v0.123 (las cartas salen de TCGdex).
- **La clave pública de Limitless está pedida**, sin respuesta todavía. La app funciona sin ella.
- **La marca sigue abierta.** Retocar la Poké Ball no la convierte en un diseño propio; para una
  ficha pública en una tienda, lo prudente es un icono y un nombre que no dependan de la marca.

## La respuesta corta

Para vuestro grupo y gente que entre por invitación, **ya se puede usar tal cual**. Para una ficha
pública en Play Store quedan tres cosas: la marca (nombre e icono), que el hosting permita ese uso
(Vercel Hobby es personal y no comercial) y pruebas automáticas del build.

## Fases

### Fase 0 — Estabilizar (1–2 semanas)

- Aplicar y probar las versiones pendientes; dos semanas arreglando solo fallos.
- **Build y pruebas automáticas en cada subida** (GitHub Actions). Es lo que más riesgo quita.
- Copia de seguridad semanal de la base.
- Poner `LEGAL_RESPONSABLE` y `LEGAL_CONTACTO` en Vercel y revisar los textos legales.

### Fase 1 — Que la liga aguante más gente (3–4 semanas)

- Rendimiento: dejar de cargar el historial entero en Inicio, Ranking y Estadísticas.
- Moderación: denunciar un resultado, historial de cambios de un organizador, límites de alta.
- Alta abierta con aprobación de un organizador, además de la invitación.
- Divisiones: ascensos y descensos automáticos al cerrar temporada, si no están ya.

### Fase 2 — Marca (1–2 semanas, en paralelo)

- Nombre e icono propios para la ficha de la tienda y la app instalada.
- Aviso de «no oficial» (ya está en los textos legales) también en la ficha.

### Fase 3 — Prueba cerrada en Play Store (4 semanas)

- 12 testers durante 14 días: es el requisito de Google y sirve de beta.
- Medir tiempos de carga y qué se usa.

### Fase 4 — Abrir

- Página pública de presentación (hoy todo está tras el inicio de sesión).
- Producción en Play Store.

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
