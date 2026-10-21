/* v0.56 — Los términos del glosario: id (el ancla de /glosario) y sus claves de
   traducción. Sin imports: lo usan la página y el componente <Termino>. */
export const TERMINOS = [
  { id: "cp", nombre: "glo.cp", def: "glo.cpDef" },
  { id: "bfl", nombre: "glo.bfl", def: "glo.bflDef" },
  { id: "elo", nombre: "glo.elo", def: "glo.eloDef" },
  { id: "resistencia", nombre: "glo.res", def: "glo.resDef" },
  { id: "topcut", nombre: "glo.top", def: "glo.topDef" },
  { id: "espejo", nombre: "glo.esp", def: "glo.espDef" },
  { id: "bye", nombre: "glo.bye", def: "glo.byeDef" },
] as const;
export type TerminoId = (typeof TERMINOS)[number]["id"];
