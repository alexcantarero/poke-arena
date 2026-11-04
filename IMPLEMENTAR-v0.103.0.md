# IMPLEMENTAR v0.103.0

Mejorar la cobertura y la transparencia del recomendador sin alterar los pesos de las fuentes ni
la calibración estadística. No hay cambios de base de datos ni nuevas variables de entorno.

## Cambios

- El recomendador entrega todos los candidatos de cuota positiva a la interfaz, en vez de cortar
  en doce antes de aplicar «Ocultar fiabilidad baja».
- Se conserva la regla del recomendador: si existen resultados reales para el objetivo, solo se
  muestran esos mazos; el modelo se usa si no hay resultados reales. «Listas sorpresa» y «solo los
  mazos que tengo» conservan sus restricciones.
- La interfaz muestra hasta diez resultados. Con el filtro activo, lista los diez mejores fiables
  si hay tantos; no los rellena con resultados de fiabilidad baja. Si hay menos, los muestra todos
  e informa del número disponible.
- La fiabilidad se calcula y se presenta con los datos de emparejamiento ponderados por la cuota de
  cada rival en el campo esperado, coherente con la muestra usada para estimar incertidumbre.

## Fundamento de la investigación

- NIST explica los intervalos de Wilson para proporciones y sus límites inferiores:
  <https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm>
- scikit-learn recomienda calibrar con datos independientes del ajuste y documenta Brier como
  métrica probabilística:
  <https://scikit-learn.org/stable/modules/calibration.html>
  <https://scikit-learn.org/stable/modules/model_evaluation.html#brier-score-loss>
- No se reajustan a mano los pesos del campo ni de las fuentes: para atribuirles una mejora hace
  falta evaluar predicciones con una partición temporal independiente.

## Comprobar

```bash
npm run verificar
npm run build
```

En Herramientas, comprueba los primeros diez resultados sin filtro y con «Ocultar fiabilidad baja»
activado. Verifica que el filtro no se queda en una lista previamente recortada y que, si hay menos
de diez recomendaciones fiables, se muestran todas con el aviso correspondiente.

## Deshacer

Revertir los cambios de la v0.103.0. No hay migraciones ni cambios de datos.
