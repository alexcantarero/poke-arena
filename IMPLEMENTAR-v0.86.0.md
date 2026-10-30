# IMPLEMENTAR v0.86.0

**Sin migración.** Lleva dentro de la v0.82 a la v0.85 (sus `IMPLEMENTAR` van en el paquete).

1. Descomprime el paquete en Descargas: sueltos `pokearena-v0.86-completa.zip` y `aplicar-v0.86.ps1`.
2. `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\aplicar-v0.86.ps1"`
3. Ajustes → «Uso y límites del plan gratuito» (solo lo ves como organizador).
4. **Opcional, para datos reales de Neon** (horas de cómputo y tráfico):
   - Neon → tu cuenta → **API keys** → crea una (solo lectura si lo permite).
   - Neon → el proyecto → Settings → copia el **Project ID**.
   - Vercel → Settings → Environment Variables (Production): `NEON_API_KEY` y `NEON_PROJECT_ID`.
   - Redespliega. En el panel, esas dos filas pasan de «estimado» a «real».
   - **Nunca** pegues la clave en el chat ni en el código.
5. De paso: Neon → Settings → Compute → máximo **0,25** unidades. Es lo que más estira el plan gratis.
6. `-SoloSubir`.

## Deshacer

`git revert HEAD`. No toca la base de datos.
