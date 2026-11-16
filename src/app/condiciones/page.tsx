import Link from "next/link";
import { datosLegales, LEGAL_ACTUALIZADO } from "@/lib/legal";

export const metadata = { title: "Condiciones de uso" };

/* v0.134 — Condiciones de uso. Pública, como la política de privacidad.
   Es un punto de partida, no asesoramiento jurídico (ver `lib/legal.ts`). */
export default function CondicionesPage() {
  const { responsable, contacto } = datosLegales(process.env);
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-10">
      <p className="mb-4"><Link href="/" className="text-sm underline underline-offset-2">← Volver</Link></p>
      <h1 className="font-display text-3xl font-black">Condiciones de uso</h1>
      <p className="mt-1 text-sm text-muted">Última actualización: {LEGAL_ACTUALIZADO}</p>
      <div className="legal mt-6">
        <h2>Qué es esto</h2>
        <p>Una aplicación gratuita para llevar una liga de aficionados: partidas, torneos, clasificaciones y estadísticas. La mantiene {responsable}. Al darte de alta aceptas estas condiciones.</p>

        <h2>Tu cuenta</h2>
        <ul>
          <li>Se entra por invitación. La cuenta es personal: no la compartas y guarda bien tu contraseña.</li>
          <li>Usa un nombre con el que te reconozca el resto de la liga y que no suplante a nadie.</li>
          <li>Puedes borrar tu cuenta cuando quieras desde Ajustes → Tu cuenta.</li>
        </ul>

        <h2>Lo que apuntas</h2>
        <ul>
          <li>Apunta resultados verdaderos. Las clasificaciones son de todos y dependen de que cada uno sea honesto.</li>
          <li>No escribas nombres ni datos de personas que no son de la liga.</li>
          <li>Nada de contenido ofensivo, ilegal o que no venga a cuento en nombres, biografías, notas o comentarios de mazos.</li>
          <li>Los organizadores pueden corregir o borrar datos incorrectos y, si alguien incumple estas normas, desactivar su cuenta.</li>
        </ul>

        <h2>Lo que no prometemos</h2>
        <ul>
          <li>Es un proyecto de aficionados, sin garantías: puede fallar, cambiar o dejar de funcionar.</li>
          <li>Los puntos, clasificaciones y cálculos de la aplicación son orientativos. Los oficiales son los de la organización del juego: compruébalos allí antes de tomar decisiones.</li>
          <li>Las estimaciones (cruces, cortes, probabilidades) son eso, estimaciones.</li>
        </ul>

        <h2>Marcas y contenidos de terceros</h2>
        <p>Aplicación no oficial. No está afiliada, patrocinada ni respaldada por Nintendo, Creatures Inc., GAME FREAK inc. ni The Pokémon Company. Pokémon, los nombres de sus personajes y las imágenes de cartas y personajes son propiedad de sus respectivos dueños y se muestran solo para identificar mazos y cartas. Los datos de torneos proceden de fuentes de terceros, citadas dentro de la aplicación.</p>

        <h2>Cambios y contacto</h2>
        <p>Estas condiciones pueden cambiar; si el cambio es importante, se avisará dentro de la aplicación. Para cualquier duda: {contacto}.</p>
      </div>
      <p className="mt-6 text-sm"><Link href="/privacidad" className="underline underline-offset-2">Política de privacidad</Link></p>
    </main>
  );
}
