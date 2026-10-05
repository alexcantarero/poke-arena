import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Saira_Condensed } from "next/font/google";
import "./globals.css";
import { getLang } from "@/lib/lang";
import { estacionDe } from "@/lib/estacion";

/* v0.20 — tipografías con `next/font`: se descargan al compilar y se sirven
   desde el propio dominio. Antes era una hoja de Google Fonts que BLOQUEABA
   el primer pintado (en 4G, medio segundo con la pantalla en blanco) y un
   salto de letra al llegar. Ahora hay `size-adjust` automático: sin salto. */
const saira = Saira_Condensed({
  subsets: ["latin"], weight: ["500", "600", "700", "800"], display: "swap", variable: "--font-saira",
});
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", variable: "--font-plex-sans",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: { default: "PokeArena TCG", template: "%s · PokeArena TCG" },
  description: "Liga privada de Pokémon TCG: ranking, resultados, torneos y estadísticas.",
  applicationName: "PokeArena TCG",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PokeArena" },
  formatDetection: { telephone: false },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sin maximumScale: bloquear el zoom rompe la accesibilidad en móvil. Quien
  // necesite ampliar tiene que poder. Lo que se evita es que el navegador
  // amplíe SOLO, y eso se arregla con el tamaño de los campos (globals.css),
  // no capando el gesto.
  viewportFit: "cover",
  /* Cuando sale el teclado, que se encoja el contenido en vez de que el
     navegador desplace toda la ventana. Sin esto, al escribir en un campo de
     abajo la cabecera fija se va hacia arriba y desaparece. */
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eff2f8" },
    { media: "(prefers-color-scheme: dark)", color: "#080e1c" },
  ],
};

/**
 * Decide el tema ANTES de pintar, para que no haya un fogonazo blanco al
 * cargar en oscuro. Se ejecuta síncrono en el <head>; por eso va como string
 * y no como componente.
 */
const THEME_SCRIPT = `
(function(){
  try{
    var saved = localStorage.getItem("arena-theme");
    var dark = saved ? saved === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }catch(e){
    document.documentElement.dataset.theme = "light";
  }
  /* v0.22: preferencia de animaciones (Ajustes). Antes de pintar, como el tema. */
  try{
    var mo = localStorage.getItem("arena-motion");
    document.documentElement.dataset.motion = mo === "on" || mo === "off" ? mo : "auto";
  }catch(e){}
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // v0.17: el idioma elegido, para lectores de pantalla y para el traductor del navegador.
  const lang = await getLang();
  // v0.22: estación y fecha señalada de hoy en Madrid → acentos y partículas.
  const hoy = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());
  const estacion = estacionDe(hoy);
  return (
    /* v0.18 — `translate="no"` + la meta `notranslate`: el navegador (Chrome,
       Safari, Edge) ya no traduce las páginas por su cuenta. El único cambio
       de idioma es el botón ES/EN de la app; antes, con la cookie en inglés,
       Chrome «ayudaba» traduciendo a máquina todo lo que aún está en español. */
    <html lang={lang} translate="no" data-season={estacion.id} data-evento={estacion.evento ?? undefined}
      className={`notranslate ${saira.variable} ${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        {/* v0.20: los sprites vienen de este CDN; abrir la conexión antes ahorra
            un viaje en la primera imagen de cada pantalla. */}
        <link rel="preconnect" href="https://r2.limitlesstcg.net" />
        <link rel="dns-prefetch" href="https://r2.limitlesstcg.net" />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
