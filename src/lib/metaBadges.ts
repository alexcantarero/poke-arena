/* =========================================================================
   Las cuatro frases que resumen un Regional.

   Una tabla de veinte arquetipos con su cuota no cuenta nada: hay que
   leérsela entera y comparar mentalmente. Lo que se recuerda de un Regional
   son cuatro cosas, y son siempre las mismas cuatro:

   · **Qué rindió** — el mazo que convirtió a Día 2 muy por encima de la media.
   · **Qué falló** — el que llevaba mucha gente y no pasó nadie.
   · **Qué se sobrejugó** — el que la gente llevó bastante más de lo que se
     juega online, que suele ser miedo o inercia.
   · **Qué copó el corte** — el que se llevó tres de las ocho plazas.

   LA DECISIÓN QUE HACE QUE ESTO NO MIENTA
   ---------------------------------------
   La conversión a Día 2 **se mide contra la media del campo, no contra
   cero**. En el Regional de Baltimore de 2026 pasaron 559 de 3.118 mazos: la
   media es el 17,9%. Un mazo que convierte al 25% no es «bueno porque uno de
   cada cuatro pasa», es bueno porque el campo estaba al 18. Sin esa
   referencia, en un torneo con corte generoso todos los mazos parecen
   buenísimos y en uno con corte duro todos parecen malos.

   Y LA QUE HACE QUE NO SEA RUIDO
   ------------------------------
   Un mazo con tres pilotos que convierte al 100% no es una historia, es una
   casualidad. Por eso hay mínimos de pilotos, y son distintos para lo bueno
   y para lo malo: para coronar a un mazo bastan unos pocos pilotos si la
   diferencia es grande, pero para decir que un mazo «falló» hace falta que
   lo llevara bastante gente — si no, estás señalando a tres personas que
   tuvieron mala suerte.

   Sin imports, como `cut.ts` y `estructura.ts`, para que los tests lo carguen
   directamente.
   ========================================================================= */

/** Un arquetipo en un evento concreto. */
export type FilaMeta = {
  /** Clave estable para reconciliar entre fuentes. */
  key: string;
  name: string;
  /** Mazos de este arquetipo en el campo. */
  field: number;
  /** Cuántos de ellos pasaron a Día 2. Nulo si el evento no tuvo Día 2. */
  day2: number | null;
  /** Plazas del top cut que se llevó. */
  cut: number;
  /** Su mejor puesto en el evento. */
  bestFinish: number | null;
  /** Su cuota en el meta online, de 0 a 1. Nula si no se sabe. */
  onlineShare: number | null;
  /**
   * Slugs para los sprites. Opcionales porque la lógica de las insignias no
   * los mira: están aquí para que la pantalla pueda pintar la fila sin tener
   * que cruzar con otra estructura, y para que los dos adaptadores —el del
   * mundo y el del grupo— entreguen exactamente la misma forma.
   */
  main?: string;
  secondary?: string;
};

/** El evento, para poder calcular la media del campo. */
export type CampoMeta = {
  /** Mazos con lista conocida. Es el denominador de todo. */
  decks: number;
  /** Cuántos pasaron a Día 2 en total. Nulo si no hubo. */
  day2: number | null;
  /** Plazas del corte. */
  topCut: number;
};

export type Umbrales = {
  /** Pilotos mínimos para coronar a un mazo. Pocos, porque la señal es fuerte. */
  minParaTop: number;
  /**
   * Pilotos mínimos para llamar «decepción» a un mazo.
   *
   * Más alto que el anterior a propósito. Decir que algo falló con cinco
   * pilotos es señalar a cinco personas que igual se cruzaron con el mazo
   * malo; con veinte ya es el mazo.
   */
  minParaDecepcion: number;
  /** Cuota mínima para entrar en la comparación con el online. */
  minParaCuota: number;
  /** Plazas mínimas del corte para hablar de «espejo». Dos ya es espejo. */
  minParaEspejo: number;
};

export const UMBRALES: Umbrales = {
  minParaTop: 5,
  minParaDecepcion: 15,
  minParaCuota: 10,
  minParaEspejo: 2,
};

export type Insignia = {
  fila: FilaMeta;
  /** El número grande de la tarjeta. */
  valor: number;
  /** Qué es ese número: porcentaje (0..1), puntos porcentuales, o plazas. */
  unidad: "pct" | "pp" | "plazas";
};

export type Insignias = {
  /** La media de conversión del campo, que es contra lo que se compara todo. */
  tasaCampo: number | null;
  /** Convirtió muy por encima de la media. */
  top: Insignia | null;
  /** Lo llevaba mucha gente y no pasó (casi) nadie. */
  decepcion: Insignia | null;
  /** Se jugó bastante más que online. */
  sobrejugado: Insignia | null;
  /** Se jugó bastante menos que online. Es la simétrica, y suele ser la buena. */
  infrajugado: Insignia | null;
  /** Copó el corte. */
  espejo: Insignia | null;
};

/** Qué parte de sus mazos pasó a Día 2. Nulo si no hay con qué calcularlo. */
export function conversion(f: FilaMeta): number | null {
  if (f.day2 == null || f.field <= 0) return null;
  return f.day2 / f.field;
}

/** La media de conversión del evento entero. */
export function tasaDelCampo(campo: CampoMeta): number | null {
  if (campo.day2 == null || campo.decks <= 0) return null;
  return campo.day2 / campo.decks;
}

/** Su cuota en el campo, de 0 a 1. */
export function cuota(f: FilaMeta, campo: CampoMeta): number {
  return campo.decks > 0 ? f.field / campo.decks : 0;
}

/**
 * Las cuatro —o cinco— frases del evento.
 *
 * Cada insignia puede salir nula, y eso es correcto: un evento sin Día 2 no
 * tiene ni top ni decepción, y uno donde el corte estuvo repartido no tiene
 * espejo. Enseñar una tarjeta vacía por rellenar la rejilla es peor que
 * enseñar tres tarjetas.
 */
export function insigniasDe(
  filas: FilaMeta[], campo: CampoMeta, u: Umbrales = UMBRALES,
): Insignias {
  const tasaCampo = tasaDelCampo(campo);

  let top: Insignia | null = null;
  let decepcion: Insignia | null = null;
  let sobrejugado: Insignia | null = null;
  let infrajugado: Insignia | null = null;
  let espejo: Insignia | null = null;

  for (const f of filas) {
    /* --- rendimiento, siempre contra la media del campo --- */
    const c = conversion(f);
    if (c != null && tasaCampo != null) {
      if (f.field >= u.minParaTop && c > tasaCampo) {
        // Empate a conversión: gana el que lo hizo con más pilotos, que es el
        // que tiene la muestra menos frágil.
        if (!top || c > top.valor || (c === top.valor && f.field > top.fila.field)) {
          top = { fila: f, valor: c, unidad: "pct" };
        }
      }
      if (f.field >= u.minParaDecepcion && c < tasaCampo) {
        if (!decepcion || c < decepcion.valor
            || (c === decepcion.valor && f.field > decepcion.fila.field)) {
          decepcion = { fila: f, valor: c, unidad: "pct" };
        }
      }
    }

    /* --- presencia, contra el meta online --- */
    if (f.onlineShare != null && f.field >= u.minParaCuota) {
      // En puntos porcentuales, que es como se lee: «+7,8 pp», no «+43%».
      const diff = (cuota(f, campo) - f.onlineShare) * 100;
      if (diff > 0 && (!sobrejugado || diff > sobrejugado.valor)) {
        sobrejugado = { fila: f, valor: diff, unidad: "pp" };
      }
      if (diff < 0 && (!infrajugado || diff < infrajugado.valor)) {
        infrajugado = { fila: f, valor: diff, unidad: "pp" };
      }
    }

    /* --- el corte --- */
    if (f.cut >= u.minParaEspejo && (!espejo || f.cut > espejo.valor)) {
      espejo = { fila: f, valor: f.cut, unidad: "plazas" };
    }
  }

  return { tasaCampo, top, decepcion, sobrejugado, infrajugado, espejo };
}

/**
 * Cuántos arquetipos distintos hay en el corte.
 *
 * «5 de 8» dice de un vistazo si el corte fue variado o un monocultivo, y es
 * de las cifras que mejor resumen un formato.
 */
export function arquetiposEnCorte(filas: FilaMeta[]): { distintos: number; plazas: number } {
  const conPlaza = filas.filter((f) => f.cut > 0);
  return {
    distintos: conPlaza.length,
    plazas: conPlaza.reduce((a, f) => a + f.cut, 0),
  };
}

/**
 * Ordena para la tabla: primero lo más jugado.
 *
 * Y a igualdad de mazos, el que mejor convirtió — porque entre dos mazos con
 * la misma presencia, el que interesa arriba es el que funcionó.
 */
export function ordenaPorCuota(filas: FilaMeta[]): FilaMeta[] {
  return [...filas].sort((a, b) =>
    b.field - a.field
    || (conversion(b) ?? -1) - (conversion(a) ?? -1)
    || a.name.localeCompare(b.name, "es"));
}
