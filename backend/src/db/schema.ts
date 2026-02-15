import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

export const municipios = pgTable("municipios", {
  id: serial("id").primaryKey(),
  codDepartamento: integer("cod_departamento").notNull(),
  nombreDepartamento: varchar("nombre_departamento", { length: 100 }).notNull(),
  codMunicipio: integer("cod_municipio").notNull(),
  nombreMunicipio: varchar("nombre_municipio", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  activo: boolean("activo").default(true).notNull(),
  columnasFacturacion: integer("columnas_facturacion").notNull().default(25),
  columnasRecaudos: integer("columnas_recaudos").notNull().default(23),
});
