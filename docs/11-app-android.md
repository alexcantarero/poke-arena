# 11 · La app de Android (TWA)

> v0.70. Cómo convertir PokéArena en una app de Android **sin reescribir nada**: una TWA
> (*Trusted Web Activity*) es la web envuelta, abierta a pantalla completa con el motor de
> Chrome. Se actualiza sola, porque lo que abre es la web desplegada.

## Lo que ya está hecho en el código

| Requisito | Dónde |
|---|---|
| Manifiesto con iconos PNG 192/512 (normal y *maskable*), `id`, atajos | `public/manifest.webmanifest`, `public/icon-*.png` |
| Service worker (Chrome lo exige para instalar) | `public/sw.js` |
| Página sin conexión | `/sin-conexion` |
| Verificación del dominio (`assetlinks.json`) | `src/app/.well-known/assetlinks.json/route.ts`, con variables de Vercel |
| Pantalla de bienvenida | Android la pone con `background_color` + icono; la app sigue con `.splash` |

## Dos caminos

**A · Sin tienda y sin coste.** Se genera el APK y se pasa al grupo (WhatsApp, Drive). Cada
uno lo instala permitiendo «fuentes desconocidas». Vale de sobra para un grupo de amigos.

**B · Google Play, prueba interna.** Cuenta de desarrollador (pago único de 25 USD según la
página oficial de Play Console; compruébalo al registrarte), identidad verificada, y la app en
el canal de **prueba interna**: hasta 100 personas por correo, sin salir al público. Para pasar
a **producción** con una cuenta personal nueva, Google exige antes una prueba cerrada con al
menos 12 testers durante 14 días.

## Paso a paso

Necesitas Node (ya lo tienes) y Java; Bubblewrap ofrece bajarse el JDK y el SDK de Android solo.

```powershell
npm install -g @bubblewrap/cli
mkdir $env:USERPROFILE\pokearena-android; cd $env:USERPROFILE\pokearena-android
bubblewrap init --manifest https://poke-arena-sand.vercel.app/manifest.webmanifest
```

Las preguntas de `init`, con lo que conviene contestar:

- *Application ID (package)*: algo tuyo y estable, p. ej. `es.ibai.pokearena`. **No se puede
  cambiar después** en Google Play.
- *Display mode*: `standalone`. *Orientation*: `portrait`.
- *Signing key*: deja que cree `android.keystore` y **guarda el fichero y las dos contraseñas
  en un gestor de contraseñas**. Si se pierde, no podrás volver a firmar actualizaciones del APK
  (con Google Play App Signing sí podrías pedir un cambio de clave de subida, pero es un trámite).

```powershell
bubblewrap build
```

Salen `app-release-signed.apk` (camino A) y `app-release-bundle.aab` (camino B).

## Unir la app con el dominio

Sin esto la app abre con una barra de dirección arriba.

1. Saca la huella SHA-256 de tu clave: `bubblewrap fingerprint list` (o
   `keytool -list -v -keystore android.keystore`).
2. En Vercel → Settings → Environment Variables (Production):
   - `ANDROID_TWA_PACKAGE` = el paquete del paso anterior.
   - `ANDROID_TWA_SHA256` = la huella (formato `AB:CD:…`, 32 pares).
3. Redespliega y abre `https://poke-arena-sand.vercel.app/.well-known/assetlinks.json`: debe
   salir tu paquete y tu huella.
4. **Si usas Google Play**: Play re-firma la app con su propia clave. Copia también la huella
   de Play Console → Prueba y publicación → Integridad de la app → Firma de apps, y añádela a
   `ANDROID_TWA_SHA256` separada por una coma. Redespliega.

## Lo que pide Google Play además

- **Política de privacidad** con URL pública: la app guarda correos y contraseñas (cifradas).
  Hay que escribirla y publicarla antes de enviar la ficha.
- **Formulario de seguridad de los datos** en Play Console (qué datos se recogen y para qué).
- **Clasificación de contenido** (un cuestionario).
- Capturas de pantalla e icono 512×512 (`public/icon-512.png`).

## Ojo con el nombre y las imágenes

La app usa nombres, sprites e imágenes de Pokémon. En un APK para el grupo no cambia nada; en
una ficha pública de Google Play es otra cosa: las marcas son de The Pokémon Company y Google
retira apps por uso de marcas ajenas. Para la prueba interna no hay ficha pública; si algún día
se publicara, habría que revisar nombre, icono y capturas.
