/* =========================================================================
   Las Server Actions, por tema. v0.47.

   Este fichero era el que tenía las 60 acciones (3.088 líneas). Ahora solo
   reexporta, para que todo `import { … } from "@/actions"` siga funcionando
   sin tocar ni un componente.

   SIN "use server" a propósito: la directiva va en cada fichero de tema.
   Un fichero «use server» solo puede exportar funciones `async` declaradas
   en él; este no declara ninguna, solo las reexporta.
   ========================================================================= */

export * from "./cuenta";
export * from "./mazos";
export * from "./partidas";
export * from "./torneos";
export * from "./ligas";
export * from "./calendario";
export * from "./ajustes";
export * from "./metagame";
