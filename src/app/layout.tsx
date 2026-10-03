import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLang } from "@/lib/lang";

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
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // v0.17: el idioma elegido, para lectores de pantalla y para el traductor del navegador.
  const lang = await getLang();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Saira+Condensed:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
