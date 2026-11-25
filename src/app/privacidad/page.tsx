import Link from "next/link";
import { datosLegales, LEGAL_ACTUALIZADO } from "@/lib/legal";

export const metadata = { title: "Política de privacidad", robots: { index: true, follow: true } };

/* v0.134 — Política de privacidad. Pública (sin sesión): hace falta poder
   leerla antes de darse de alta, y la piden las tiendas de aplicaciones.
   Es un punto de partida, no asesoramiento jurídico (ver `lib/legal.ts`). */
export default function PrivacidadPage() {
  const { responsable, contacto } = datosLegales(process.env);
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <p className="mb-4"><Link href="/" className="text-sm underline underline-offset-2">← Volver</Link></p>
      <h1 className="font-display text-3xl font-black">Política de privacidad</h1>
      <p className="mt-1 text-sm text-muted">Última actualización: {LEGAL_ACTUALIZADO}</p>
      <div className="legal mt-6">
        <h2>Quién trata tus datos</h2>
        <p>Esta aplicación es una herramienta privada de una liga de aficionados al juego de cartas coleccionables. El responsable de los datos es {responsable}. Para cualquier cosa relacionada con tus datos puedes dirigirte a {contacto}.</p>

        <h2>Qué datos guardamos</h2>
        <ul>
          <li><b>De tu cuenta:</b> el nombre que elijas, tu correo electrónico y tu contraseña (guardada cifrada de forma que nadie puede leerla).</li>
          <li><b>De tu perfil, si los pones:</b> avatar, color, biografía, tu nick en plataformas de torneos, tu nombre en la clasificación oficial, tu rango en el juego en línea y tus puestos en las clasificaciones.</li>
          <li><b>De tu actividad en la liga:</b> las partidas y rondas que apuntas (resultado, mazos, fecha), tus resultados en torneos, tus mazos y sus listas, y los torneos a los que dices que vas a ir.</li>
          <li><b>Técnicos:</b> una cookie de sesión para mantenerte dentro, tus preferencias (idioma, tema) y, en tu propio dispositivo, lo que la app guarda para funcionar sin conexión.</li>
        </ul>
        <p>No guardamos datos de pago, ni tu ubicación, ni usamos cookies de publicidad o de seguimiento.</p>

        <h2>Para qué los usamos</h2>
        <p>Para llevar la liga: clasificaciones, estadísticas, calendario y avisos dentro de la aplicación. La base es tu consentimiento al darte de alta y tu participación en la liga. No vendemos tus datos ni los usamos para publicidad.</p>

        <h2>Quién puede verlos</h2>
        <ul>
          <li>Los demás miembros de la liga ven tu nombre, tu perfil y tus resultados. Tu correo no lo ve nadie más que los organizadores.</li>
          <li>Los organizadores pueden ver y corregir los datos de la liga.</li>
          <li>Si la liga usa un canal de Discord, la aplicación puede publicar allí resultados y recordatorios con tu nombre.</li>
          <li>Proveedores técnicos que alojan la aplicación y su base de datos, que actúan por cuenta nuestra.</li>
        </ul>

        <h2>Datos de otras personas</h2>
        <p>De quien no es miembro de la liga no guardamos nombres. De los torneos solo se conserva el mazo y el resultado de tus rivales, no quiénes son.</p>

        <h2>Datos de fuentes externas</h2>
        <p>La aplicación consulta datos públicos de torneos y de cartas en servicios de terceros. Si pones tu nick de una plataforma de torneos, se usa para encontrar tus resultados publicados allí.</p>

        <h2>Cuánto tiempo los guardamos</h2>
        <p>Mientras tengas cuenta. Si la borras, se elimina todo lo que te identifica; tus partidas quedan sin tu nombre, porque también son las de tus rivales y sin ellas sus clasificaciones no cuadrarían.</p>

        <h2>Tus derechos</h2>
        <p>Puedes ver y corregir tus datos en tu perfil, descargarlos y borrar tu cuenta desde Ajustes → Tu cuenta. También puedes pedir acceso, rectificación, supresión, oposición, limitación o portabilidad escribiendo al contacto de arriba, y reclamar ante la autoridad de protección de datos de tu país (en España, la Agencia Española de Protección de Datos).</p>

        <h2>Menores</h2>
        <p>La aplicación no está dirigida a menores de 14 años. Si eres menor, necesitas el permiso de tu padre, madre o tutor para darte de alta.</p>

        <h2>Cambios</h2>
        <p>Si esta política cambia de forma importante, se avisará dentro de la aplicación.</p>

        <p className="mt-6 text-sm text-muted">Aplicación de aficionados, no oficial. No está afiliada, patrocinada ni respaldada por Nintendo, Creatures Inc., GAME FREAK inc. ni The Pokémon Company. Pokémon y los nombres de sus personajes son marcas de sus respectivos dueños.</p>
      </div>
      <p className="mt-6 text-sm"><Link href="/condiciones" className="underline underline-offset-2">Condiciones de uso</Link></p>
    </main>
  );
}
