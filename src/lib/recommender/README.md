# El modelo de cruces del recomendador (v0.138)

Código: `modelo.ts` (puro, con pruebas en `tests/recommenderModelo.test.ts`). Pantalla:
Herramientas → **Modelo** (`/herramientas/modelo`).

## Qué calcula

La probabilidad de que el mazo A gane al mazo B a una **fecha de corte**, usando **solo partidas
anteriores** a esa fecha.

Cada partida pesa

    w = exp(−Δdías / τ) · peso_torneo

- **Recencia**: τ = 60 días por defecto (vida media ≈ 42 días). Con τ = ∞ no hay recencia.
- **Peso del torneo** (hace de fuerza del rival: de fuera no se sabe quién jugó, pero cuanto
  más competitivo el torneo, mejor la gente): Mundial, Internacional, Regional, Special 1,0 ·
  City League y League Cup 0,6 · Challenge y liga interna 0,5 · online 0,4 · amistoso 0,3.

Con V y D las victorias y derrotas ponderadas de A (el empate cuenta medio y medio), la
probabilidad es la media de una **Beta(a + V, b + D)** con a = b = prior / 2 (prior = 8 por
defecto): con pocas partidas, cerca del 50 %. Se enseñan también el **tamaño de muestra
efectivo** (V + D), un **intervalo del 90 %** y la **fecha del dato más reciente** usado.

## Cómo se valida

**Backtest**: cada partida del grupo se predice con las anteriores a su fecha y se compara con
lo que pasó. Métricas: **Brier** (0,25 es decir siempre 50 %), **log-loss** y % de acierto del
favorito. La pantalla prueba una rejilla de τ (30, 45, 60, 90, 120, ∞) y prior (2, 4, 8, 16) y
dice cuál funciona mejor con vuestros datos.

## Registro de predicciones

Cada día (cron) se guarda, para cada ronda nueva con los dos mazos conocidos, la predicción del
modelo con los datos anteriores a esa ronda (tabla `predicciones`, migración 0039). La pantalla
del modelo enseña el acierto acumulado de lo registrado.

## Lo que todavía NO hace (pendiente)

- El recomendador de Herramientas sigue usando su tabla de cruces de siempre (fuentes externas
  + encogimiento k = 4). Este modelo se valida aparte; cuando el backtest demuestre que mejora,
  se enchufa.
- Las fuentes externas (Limitless online, Trainer Hill) llegan agregadas, sin fecha por partida:
  no se pueden cortar por fecha, así que este modelo usa vuestras partidas. La calibración α del
  recomendador ahora solo usa las rondas de los últimos 45 días (la ventana de esos datos), que
  es donde la fuga es menor; sigue sin ser cero.
- La «conversión real» por mazo (factor de corte frente a lo predicho) queda para la siguiente.
