import { client } from "./connection.js";

function sanitizeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9_]/g, "");
}

export async function createMunicipioTables(slug: string, columnasFacturacion: number, columnasRecaudos: number) {
  const s = sanitizeSlug(slug);

  const colsFacturacion = Array.from({ length: columnasFacturacion }, (_, i) => `col_${i + 1} TEXT`).join(", ");
  const colsRecaudos = Array.from({ length: columnasRecaudos }, (_, i) => `col_${i + 1} TEXT`).join(", ");

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "${s}_facturacion" (
      id SERIAL PRIMARY KEY,
      ${colsFacturacion}
    )
  `);

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS "${s}_recaudos" (
      id SERIAL PRIMARY KEY,
      ${colsRecaudos}
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
