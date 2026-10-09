import { NextResponse, type NextRequest } from "next/server";
import { currentPlayer } from "@/lib/data";
import { hasPokemonTcgKey, searchCards } from "@/lib/sources/tcgdex";

/* =========================================================================
   GET /api/cards?q=dragapult — buscar una carta por nombre.

   Para qué sirve, en concreto: estás montando una lista y no te acuerdas de
   en qué set salió la carta ni con qué número. Sin esto hay que ir a otra
   web, buscarla, y volver con el dato copiado. Con esto sale la carta, y con
   ella la línea de lista ya escrita —"1 Dragapult ex TWM 130"— lista para
   pegar en el recuadro de al lado.

   Tres cosas que este endpoint hace a propósito:

   · **Va detrás de la sesión.** No porque los nombres de carta sean secretos
     —no lo son—, sino porque sin sesión cualquiera podría usar el despliegue
     de la liga como proxy gratis contra tcgdex.io y gastar la cuota
     diaria en una tarde.
   · **Nunca devuelve un error 5xx.** Si la API de terceros no contesta,
     devuelve la lista vacía y `available: false`. Es un adorno del editor de
     mazos: que se caiga no puede impedir guardar un mazo.
   · **Exige tres letras.** Sin clave el límite son 30 peticiones por minuto,
     y una búsqueda por cada tecla se lo come en cinco segundos. El
     componente además espera a que dejes de escribir.

   Ojo con la fecha de caducidad: tcgdex.io está deprecada y sus claves
   mueren el 1 de marzo de 2027. Todo lo que hay debajo está escrito para que
   cambiarla por TCGdex sea reescribir `lib/sources/tcgdex.ts` y nada más.
   ========================================================================= */

export async function GET(request: NextRequest) {
  const me = await currentPlayer();
  if (!me) return NextResponse.json({ error: "Hace falta una sesión." }, { status: 401 });

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 3) {
    return NextResponse.json({ cards: [], available: true, hint: "Escribe al menos tres letras." });
  }

  const cards = await searchCards(q, 12);
  return NextResponse.json({
    cards,
    // Si no hay resultados Y no hay clave, lo más probable no es que la carta
    // no exista: es que se ha topado con el límite de peticiones. Merece la
    // pena poder decirlo en la pantalla en vez de un "no hay nada" a secas.
    available: cards.length > 0 || hasPokemonTcgKey(),
  });
}
