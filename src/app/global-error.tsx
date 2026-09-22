"use client";

/* =========================================================================
   El error de último recurso: el que se lleva por delante el layout raíz.

   Es el único componente de la app que tiene que pintar su propio <html> y
   <body>, porque cuando se muestra el layout raíz ya no está. Eso significa
   que tampoco hay hoja de estilos garantizada ni el script que decide el
   tema, así que los colores van escritos a mano en el propio elemento. Es la
   única parte de Arena donde eso está bien: en todas las demás, un color
   suelto sería un color que el tema oscuro no sabe cambiar.

   En la práctica no se ve casi nunca. Pero si se ve y no está, lo que aparece
   es una pantalla negra con letra de sistema.
   ========================================================================= */

export default function GlobalError({
  error, reset,
}: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          background: "#eff2f8",
          color: "#0d1526",
          fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "26rem" }}>
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#5f6d8a" }}>
            Arena
          </p>
          <h1 style={{ fontSize: "1.6rem", margin: "0.5rem 0 0.75rem" }}>
            La aplicación no ha podido arrancar
          </h1>
          <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "#36445e", margin: 0 }}>
            Ha fallado algo por debajo de todas las pantallas. Recarga; si sigue igual, es un
            problema del despliegue y no de tu conexión.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: "2.75rem",
              padding: "0 1.25rem",
              borderRadius: "0.5rem",
              border: "1px solid #6d4808",
              background: "#8a5c0a",
              color: "#fffaf0",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Recargar
          </button>
          {error.digest && (
            <p style={{ marginTop: "1rem", fontSize: "0.7rem", color: "#5f6d8a", fontFamily: "ui-monospace, monospace" }}>
              referencia {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
