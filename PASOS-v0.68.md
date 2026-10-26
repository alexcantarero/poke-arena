# Cómo aplicar la v0.68

**Sin migración nueva.** Si vienes de la v0.66 o antes, las de la v0.65 y la v0.67 siguen
siendo obligatorias en producción: el SQL está en `PASOS-v0.67.md`.

1. Descargas: `pokearena-v0.68-completa.zip` y `aplicar-v0.68.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.68.ps1"`
3. Sube con `-SoloSubir`.

## Discord, después de subir

1. Ajustes → Discord. Cada canal dice ahora **puesto**, **URL no válida** o **sin poner**, y hay
   una fila para `CRON_SECRET`.
2. Pulsa **Probar** en cada canal. Llega un mensaje de prueba o sale el motivo exacto.
3. Si dice «sin poner» y en Vercel SÍ está puesta: la variable tiene que estar marcada para
   **Production**, y después de añadirla o cambiarla hay que **volver a desplegar** (Vercel →
   Deployments → el último → Redeploy). Las variables nuevas no llegan a un despliegue ya hecho.
4. Si `CRON_SECRET` sale «sin poner»: créala en Vercel (Settings → Environment Variables, un
   texto largo cualquiera, Production) y redespliega. Sin ella, los avisos de los lunes y el
   cierre automático de torneos no se ejecutan nunca.

## Ciphermaniac

Ajustes → Importar datos → Diagnóstico de Ciphermaniac. Debería responder. Si sale algún 404,
es la estructura nueva que mencionó Reese: pásame la tabla del diagnóstico.
