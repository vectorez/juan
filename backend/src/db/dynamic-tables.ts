import { client } from "./connection.js";

function sanitizeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9_]/g, "");
}

export function sanitizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 63) || "col";
}

export async function createMunicipioTables(
  slug: string,
  encabezadosFacturacion: string[],
  encabezadosRecaudos: string[]
) {
  const s = sanitizeSlug(slug);

  const colsFacturacion = encabezadosFacturacion
    .map((h) => `"${sanitizeColumnName(h)}" TEXT`)
    .join(", ");
  const colsRecaudos = encabezadosRecaudos
    .map((h) => `"${sanitizeColumnName(h)}" TEXT`)
    .join(", ");

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "${s}_facturacion" (
      id SERIAL PRIMARY KEY,
      fecha_importacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ${colsFacturacion}
    )
  `);

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "${s}_recaudos" (
      id SERIAL PRIMARY KEY,
      fecha_importacion TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ${colsRecaudos}
    )
  `);
}

export async function ensureFechaImportacion(slug: string, tableType: "facturacion" | "recaudos") {
  const s = sanitizeSlug(slug);
  const tableName = `${s}_${tableType}`;
  try {
    const result = await client.unsafe(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = '${tableName}' AND column_name = 'fecha_importacion'
    `);
    if (result.length === 0) {
      await client.unsafe(`ALTER TABLE "${tableName}" ADD COLUMN fecha_importacion TIMESTAMPTZ NOT NULL DEFAULT NOW()`);
    }
  } catch { /* tabla no existe aún */ }
}

export async function ensureTableColumns(slug: string, tableType: "facturacion" | "recaudos", numCols: number) {
  const s = sanitizeSlug(slug);
  const tableName = `${s}_${tableType}`;

  const result = await client.unsafe(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = '${tableName}' AND column_name LIKE 'col_%'
    ORDER BY ordinal_position
  `);
  const currentCols = result.length;

  if (numCols > currentCols) {
    const alterCols = Array.from(
      { length: numCols - currentCols },
      (_, i) => `ADD COLUMN col_${currentCols + i + 1} TEXT`
    ).join(", ");
    await client.unsafe(`ALTER TABLE "${tableName}" ${alterCols}`);
  }
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

export async function getTableData(
  slug: string,
  tableType: "facturacion" | "recaudos",
  limit: number,
  offset: number,
  fechaImportacion?: string
) {
  const s = sanitizeSlug(slug);
  const tableName = `${s}_${tableType}`;

  let whereClause = "";
  const params: unknown[] = [];

  if (fechaImportacion) {
    whereClause = `WHERE fecha_importacion::date = $1`;
    params.push(fechaImportacion);
  }

  const data = await client.unsafe(
    `SELECT * FROM "${tableName}" ${whereClause} ORDER BY id LIMIT ${limit} OFFSET ${offset}`,
    params as any[]
  );
  const countResult = await client.unsafe(
    `SELECT count(*)::int as count FROM "${tableName}" ${whereClause}`,
    params as any[]
  );
  return { data, total: countResult[0]?.count ?? 0 };
}

export async function getImportDates(
  slug: string,
  tableType: "facturacion" | "recaudos"
): Promise<{ fecha: string; registros: number }[]> {
  const s = sanitizeSlug(slug);
  const tableName = `${s}_${tableType}`;
  try {
    const result = await client.unsafe(`
      SELECT
        fecha_importacion::date::text AS fecha,
        count(*)::int AS registros
      FROM "${tableName}"
      GROUP BY fecha_importacion::date
      ORDER BY fecha_importacion::date DESC
    `);
    return result as unknown as { fecha: string; registros: number }[];
  } catch {
    return [];
  }
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
