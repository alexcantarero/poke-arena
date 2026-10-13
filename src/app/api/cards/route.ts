import { NextResponse, type NextRequest } from "next/server";
import { currentPlayer } from "@/lib/data";
import { searchCards } from "@/lib/sources/tcgdex";

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
     de la liga como proxy gratis contra TCGdex. Sus normas piden usarla
     con cabeza y eso incluye no prestarla.
   · **Nunca devuelve un error 5xx.** Si la API de terceros no contesta,
     devuelve la lista vacía y `available: false`. Es un adorno del editor de
     mazos: que se caiga no puede impedir guardar un mazo.
   · **Exige tres letras.** TCGdex no publica un límite duro, pero pide
     moderación: una búsqueda por cada tecla no lo es. El componente además
     espera 400 ms a que dejes de escribir.

   v0.29: la fuente era pokemontcg.io, que está deprecada y cuyas claves
   mueren el 1 de marzo de 2027. Ahora es TCGdex, gratis y sin clave. El
   contrato de este endpoint no cambió: cambiar de fuente otra vez sería
   reescribir `lib/sources/tcgdex.ts` y nada más.
   ========================================================================= */

export async function GET(request: NextRequest) {
  const me = await currentPlayer();
  if (!me) return NextResponse.json({ error: "Hace falta una sesión." }, { status: 401 });

  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 3) {
    return NextResponse.json({ cards: [], available: true, hint: "Escribe al menos tres letras." });
  }

  const cards = await searchCards(q, 12);
  // `available` distingue «no hay esa carta» de «la fuente no contesta».
  // searchCards() devuelve lista vacía en los dos casos, así que se
  // comprueba aparte con una consulta que siempre tiene resultados.
  const available = cards.length > 0 || (await searchCards("pikachu", 1)).length > 0;
  return NextResponse.json({ cards, available });
}
