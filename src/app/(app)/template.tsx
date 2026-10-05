/**
 * v0.21 — A diferencia del layout, Next vuelve a montar el template en cada
 * navegación. Por eso el fundido de entrada (`.page-in`, en globals.css) se
 * repite al cambiar de pantalla y de pestaña, y el layout (cabecera, menú)
 * se queda quieto. Respeta «reducir movimiento» del sistema.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
