import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  json,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const municipios = pgTable("municipios", {
  id: serial("id").primaryKey(),
  codDepartamento: integer("cod_departamento").notNull(),
  nombreDepartamento: varchar("nombre_departamento", { length: 100 }).notNull(),
  codMunicipio: integer("cod_municipio").notNull(),
  nombreMunicipio: varchar("nombre_municipio", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  activo: boolean("activo").default(true).notNull(),
  columnasFacturacion: integer("columnas_facturacion").notNull().default(0),
  columnasRecaudos: integer("columnas_recaudos").notNull().default(0),
  encabezadosFacturacion: json("encabezados_facturacion").$type<string[]>().default([]),
  encabezadosRecaudos: json("encabezados_recaudos").$type<string[]>().default([]),
});

export const pipelines = pgTable("pipelines", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  descripcion: text("descripcion").default(""),
  flowData: json("flow_data").$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const reportes = pgTable("reportes", {
  id: serial("id").primaryKey(),
  nombre: varchar("nombre", { length: 200 }).notNull(),
  descripcion: text("descripcion").default(""),
  pipelineId: integer("pipeline_id").references(() => pipelines.id, { onDelete: "set null" }),
  config: json("config").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
