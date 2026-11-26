# IMPLEMENTAR v0.136.0

Sobre la **v0.135.0** (y su migración 0037). **Sin migración.**

## 1. Aplicar

Descomprime `arena-v0.136.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.136.bat`**.
Si algo falla, mándame `aplicar-v0.136.log`.

## 2. Probar

1. **Inicio con un torneo en directo** (en curso hoy, con rondas tuyas): a la derecha, el panel
   con ronda X/Y, el récord para el corte (pon la asistencia si sale «falta la asistencia»), tus
   puntos, los CP por puesto y los tres botones.
2. **Avisos**: marca «Iré» en un torneo de pasado mañana → sale «Vas a …» y lleva a la
   preparación. Con una partida de liga pendiente, el aviso dice contra quién. Tras importar un
   Regional de esta semana, sale «Nuevo Regional».
3. **Herramientas → Premios**: debajo de la calculadora de siempre, «En partida». Elige un mazo
   con lista: al empezar, una carta de 1 copia sale al 10 %; marca 20 cartas vistas y comprueba
   que las cifras suben.

## Deshacer

`git revert` del commit. No hay cambios de base de datos.
