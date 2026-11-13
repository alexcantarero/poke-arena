/* =========================================================================
   v0.125 — ¿Están el servidor y la base de datos en el mismo sitio?

   Sin imports, para probarlo.

   EL HALLAZGO (13/11/2026, medido en producción): las funciones de Vercel
   corrían en `iad1` (Washington) y los usuarios están en España. Solo ir y
   volver ya son ~150 ms por página; y si la base de Neon está en Europa, cada
   consulta cruza el Atlántico otra vez. Poner las funciones en la región de
   la base (Vercel → Settings → Functions → Function Region) es, con
   diferencia, lo que más acelera la app, y no es código.

   Esto solo traduce nombres y juzga una latencia; quien mide es
   `latenciaDb.ts` y quien lo enseña, Ajustes → Uso.
   ========================================================================= */

/** La región de Neon que va dentro del nombre del servidor: «….eu-central-1.aws.neon.tech» → «eu-central-1». */
export function regionDeHostNeon(host: string | null | undefined): string | null {
  const m = /\.([a-z]{2}-[a-z]+-\d)\.(?:aws|azure|gcp)\.neon\.(?:tech|build)$/i.exec((host ?? "").trim());
  if (m) return m[1].toLowerCase();
  const az = /\.([a-z]+(?:us|europe|asia)?[a-z0-9]*)\.azure\.neon\.(?:tech|build)$/i.exec((host ?? "").trim());
  return az ? az[1].toLowerCase() : null;
}

/** La región de Vercel más cercana a cada región de Neon en AWS. */
export const VERCEL_PARA_NEON: Record<string, { vercel: string; ciudad: string }> = {
  "eu-central-1": { vercel: "fra1", ciudad: "Fráncfort" },
  "eu-west-2": { vercel: "lhr1", ciudad: "Londres" },
  "us-east-1": { vercel: "iad1", ciudad: "Washington D. C." },
  "us-east-2": { vercel: "cle1", ciudad: "Cleveland" },
  "us-west-2": { vercel: "pdx1", ciudad: "Portland" },
  "ap-southeast-1": { vercel: "sin1", ciudad: "Singapur" },
  "ap-southeast-2": { vercel: "syd1", ciudad: "Sídney" },
  "sa-east-1": { vercel: "gru1", ciudad: "São Paulo" },
};

export type VeredictoLatencia = "bien" | "regular" | "lejos";

/** Una consulta mínima entre vecinos tarda pocos ms; cruzando un océano, cerca de 100. */
export function veredictoLatencia(medianaMs: number): VeredictoLatencia {
  if (medianaMs <= 25) return "bien";
  if (medianaMs <= 60) return "regular";
  return "lejos";
}

export function mediana(xs: readonly number[]): number {
  if (!xs.length) return 0;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2);
}

/** ¿Coinciden la región de la función y la que le tocaría por la base? null = no se sabe. */
export function regionesCoinciden(regionFuncion: string | null | undefined, regionBase: string | null | undefined): boolean | null {
  if (!regionFuncion || !regionBase) return null;
  const ideal = VERCEL_PARA_NEON[regionBase];
  return ideal ? ideal.vercel === regionFuncion.toLowerCase() : null;
}
