import { client } from "./connection.js";

function sanitizeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9_]/g, "");
}

export async function createMunicipioTables(slug: string) {
  const s = sanitizeSlug(slug);

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "${s}_facturacion" (
      id SERIAL PRIMARY KEY,
      ciclo INTEGER,
      servicio_suscrito_dependiente BIGINT,
      servicio_suscrito_padre BIGINT,
      tipo_servicio INTEGER,
      descripcion_servicio VARCHAR(200),
      suscripcion BIGINT,
      fecha_generacion_factura VARCHAR(20),
      ano_mes_factura INTEGER,
      nro_factura BIGINT,
      categoria INTEGER,
      sub_categoria INTEGER,
      valor_impuesto NUMERIC(18,4),
      valor_cartera NUMERIC(18,4),
      intereses_mora NUMERIC(18,4),
      valor_reconocimiento NUMERIC(18,4),
      valor_separacion NUMERIC(18,4),
      valor_financiacion NUMERIC(18,4),
      valor_total_facturado NUMERIC(18,4),
      direccion VARCHAR(300),
      nro_instalacion VARCHAR(50),
      sujeto_pasivo_pdto_dependiente VARCHAR(200),
      identificacion_sujeto_pasivo VARCHAR(50),
      cod_departamento INTEGER,
      cod_municipio INTEGER,
      consumo_energia NUMERIC(18,4)
    )
  `);

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "${s}_recaudos" (
      id SERIAL PRIMARY KEY,
      servicio_suscrito_dependiente BIGINT,
      servicio_suscrito_padre BIGINT,
      tipo_servicio INTEGER,
      descripcion_servicio VARCHAR(200),
      suscripcion BIGINT,
      ano_mes_factura INTEGER,
      nro_factura BIGINT,
      categoria INTEGER,
      sub_categoria INTEGER,
      valor_recaudo_impuesto NUMERIC(18,4),
      valor_recaudo_intereses NUMERIC(18,4),
      valor_recaudo_separacion NUMERIC(18,4),
      valor_reconocimiento NUMERIC(18,4),
      valor_otros_recaudos NUMERIC(18,4),
      valor_total_recaudos NUMERIC(18,4),
      fecha_pago VARCHAR(50),
      direccion VARCHAR(300),
      nro_instalacion VARCHAR(50),
      sujeto_pasivo_pdto_dependiente VARCHAR(200),
      identificacion_sujeto_pasivo VARCHAR(50),
      cod_departamento INTEGER,
      cod_municipio INTEGER,
      valor_reconocimiento_covid NUMERIC(18,4)
    )
  `);
}

export async function dropMunicipioTables(slug: string) {
  const s = sanitizeSlug(slug);
  await client.unsafe(`DROP TABLE IF EXISTS "${s}_facturacion" CASCADE`);
  await client.unsafe(`DROP TABLE IF EXISTS "${s}_recaudos" CASCADE`);
}

export async function getTableCount(slug: string, tableType: "facturacion" | "recaudos"): Promise<number> {
  const s = sanitizeSlug(slug);
  const tableName = `${s}_${tableType}`;
  try {
    const result = await client.unsafe(`SELECT count(*)::int as count FROM "${tableName}"`);
    return result[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function getTableData(slug: string, tableType: "facturacion" | "recaudos", limit: number, offset: number) {
  const s = sanitizeSlug(slug);
  const tableName = `${s}_${tableType}`;
  const data = await client.unsafe(`SELECT * FROM "${tableName}" ORDER BY id LIMIT ${limit} OFFSET ${offset}`);
  const countResult = await client.unsafe(`SELECT count(*)::int as count FROM "${tableName}"`);
  return { data, total: countResult[0]?.count ?? 0 };
}

export async function insertBatch(slug: string, tableType: "facturacion" | "recaudos", rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const s = sanitizeSlug(slug);
  const tableName = `${s}_${tableType}`;

  const columns = Object.keys(rows[0]);
  const colNames = columns.map((c) => `"${c}"`).join(", ");

  const valuePlaceholders = rows.map((row, ri) => {
    const vals = columns.map((_, ci) => `$${ri * columns.length + ci + 1}`);
    return `(${vals.join(", ")})`;
  }).join(", ");

  const flatValues = rows.flatMap((row) => columns.map((c) => row[c] ?? null));

  await client.unsafe(
    `INSERT INTO "${tableName}" (${colNames}) VALUES ${valuePlaceholders}`,
    flatValues as any[]
  );
}

export async function truncateTable(slug: string, tableType: "facturacion" | "recaudos") {
  const s = sanitizeSlug(slug);
  const tableName = `${s}_${tableType}`;
  await client.unsafe(`TRUNCATE TABLE "${tableName}" RESTART IDENTITY`);
}

export { sanitizeSlug };
