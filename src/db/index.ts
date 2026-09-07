import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Conexión perezosa: el cliente no se crea hasta la primera consulta.
 *
 * Importa: `next build` carga todos los módulos de página, así que si la
 * conexión se abriera al importar este fichero no se podría compilar sin
 * tener la base de datos a mano.
 */
function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copia .env.example a .env.local y pega la cadena de conexión de Neon.",
    );
  }
  return drizzle(neon(url), { schema });
}

type Db = ReturnType<typeof connect>;
let instance: Db | null = null;

export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    instance ??= connect();
    return Reflect.get(instance as object, prop, receiver);
  },
});

export { schema };
