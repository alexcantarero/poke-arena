# IMPLEMENTAR v0.134.0

Sobre la **v0.133.0**. **Sin migración.**

## 1. Aplicar

Descomprime `arena-v0.134.0.zip` en la raíz del repo y doble clic en **`aplicar-v0.134.bat`**.
Si algo falla, mándame `aplicar-v0.134.log`.

## 2. Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Qué poner |
|---|---|
| `LEGAL_RESPONSABLE` | Quién lleva la liga y responde de los datos (tu nombre o el de la asociación) |
| `LEGAL_CONTACTO` | Un correo al que escribir para ejercer derechos |

Sin ellas las páginas funcionan, pero dicen «la organización de la liga» en vez de un nombre.
Tras ponerlas, vuelve a desplegar.

## 3. Probar

1. Sin sesión (ventana de incógnito): `/privacidad` y `/condiciones` se abren, y están enlazadas
   al pie de la pantalla de entrar. **Léelas enteras**: describen lo que hace la app; si algo no
   es verdad en vuestra liga, dímelo y lo cambio.
2. **Ajustes → Tu cuenta → «Descargar mis datos»**: baja un JSON. Ábrelo: no lleva la contraseña.
3. **Borrar mi cuenta, con una cuenta de prueba** (crea una con una invitación; no lo pruebes con
   la tuya): contraseña mala → error; nombre mal escrito → error; bien → te lleva a entrar con el
   aviso. Entra con tu cuenta: en el ranking y en sus partidas sale «Jugador eliminado XXXX», y
   con la cuenta borrada ya no se puede entrar.
4. Con tu cuenta de dueño, si eres el único dueño, el borrado te lo impide.

## Deshacer

`git revert` del commit. Una cuenta borrada no se recupera.
