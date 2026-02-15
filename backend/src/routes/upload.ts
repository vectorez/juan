import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db } from "../db/connection.js";
import { municipios } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { insertBatch, getTableCount, getTableData, truncateTable, sanitizeColumnName, getImportDates, ensureFechaImportacion } from "../db/dynamic-tables.js";

const router = Router();

const upload = multer({
  dest: path.join(process.cwd(), "uploads"),
  limits: { fileSize: 100 * 1024 * 1024 },
});

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function mapRowWithHeaders(values: string[], columnNames: string[]): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (let i = 0; i < values.length; i++) {
    const colName = i < columnNames.length ? columnNames[i] : `col_${i + 1}`;
    row[colName] = values[i] || null;
  }
  return row;
}

router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const tableType = req.body?.tableType as string;
    const municipioSlug = req.body?.municipioSlug as string;

    if (!tableType || !["facturacion", "recaudos"].includes(tableType)) {
      res.status(400).json({ error: "tableType debe ser 'facturacion' o 'recaudos'" });
      return;
    }

    if (!municipioSlug) {
      res.status(400).json({ error: "municipioSlug es requerido" });
      return;
    }

    const [municipio] = await db.select().from(municipios).where(eq(municipios.slug, municipioSlug));
    if (!municipio) {
      res.status(400).json({ error: "Municipio no encontrado" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No se envió ningún archivo" });
      return;
    }

    const content = fs.readFileSync(req.file.path, "latin1");
    const lines = content.split("\n").filter((l) => l.trim() !== "");

    if (lines.length < 2) {
      res.status(400).json({ error: "El archivo no tiene datos" });
      return;
    }

    // Obtener encabezados SIEMPRE de la BD (ignorar headers del CSV)
    const encabezados: string[] = (tableType === "facturacion" ? municipio.encabezadosFacturacion : municipio.encabezadosRecaudos) || [];
    const columnNames = encabezados.map((h: string) => sanitizeColumnName(h));
    const expectedCols = encabezados.length;

    // Validar número de columnas del CSV (solo para verificar estructura)
    const firstLineCols = parseCsvLine(lines[0]);
    const numCols = firstLineCols.length;
    
    if (expectedCols > 0 && numCols !== expectedCols) {
      fs.unlinkSync(req.file.path);
      res.status(400).json({ error: `El archivo tiene ${numCols} columnas pero se esperan ${expectedCols}. Descarga la plantilla para ver el formato correcto.` });
      return;
    }

    // Migrar tabla existente si no tiene columna fecha_importacion
    await ensureFechaImportacion(municipioSlug, tableType as "facturacion" | "recaudos");

    const BATCH_SIZE = 1000;
    let inserted = 0;
    let errors = 0;

    const fechaImportacion = new Date().toISOString();

    for (let i = 1; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);
      const rows = batch.map((line) => {
        const values = parseCsvLine(line);
        const row = mapRowWithHeaders(values, columnNames);
        row.fecha_importacion = fechaImportacion;
        return row;
      });

      try {
        await insertBatch(municipioSlug, tableType as "facturacion" | "recaudos", rows);
        inserted += rows.length;
      } catch (err) {
        console.error(`Error en lote ${Math.floor(i / BATCH_SIZE)}:`, err);
        errors += rows.length;
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      table: `${municipioSlug}_${tableType}`,
      totalRows: lines.length - 1,
      inserted,
      errors,
    });
  } catch (error) {
    console.error("Error en upload:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/tables", async (_req: Request, res: Response) => {
  try {
    const allMunicipios = await db.select().from(municipios);
    const tables = [];

    for (const m of allMunicipios) {
      const facCount = await getTableCount(m.slug, "facturacion");
      const recCount = await getTableCount(m.slug, "recaudos");
      tables.push({
        municipio: m.nombreMunicipio,
        slug: m.slug,
        facturacion: facCount,
        recaudos: recCount,
        encabezadosFacturacion: m.encabezadosFacturacion || [],
        encabezadosRecaudos: m.encabezadosRecaudos || [],
      });
    }

    res.json({ tables, totalMunicipios: allMunicipios.length });
  } catch (error) {
    console.error("Error al obtener tablas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/data/:slug/:tableType", async (req: Request, res: Response) => {
  try {
    const { slug, tableType } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const fechaImportacion = req.query.fecha as string | undefined;

    if (!tableType || !["facturacion", "recaudos"].includes(tableType as string)) {
      res.status(400).json({ error: "tableType debe ser 'facturacion' o 'recaudos'" });
      return;
    }

    const [municipio] = await db.select().from(municipios).where(eq(municipios.slug, slug as string));
    if (!municipio) {
      res.status(400).json({ error: "Municipio no encontrado" });
      return;
    }

    const result = await getTableData(slug as string, tableType as "facturacion" | "recaudos", limit, offset, fechaImportacion);
    res.json(result);
  } catch (error) {
    console.error("Error al obtener datos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/import-dates/:slug/:tableType", async (req: Request, res: Response) => {
  try {
    const { slug, tableType } = req.params;

    if (!tableType || !["facturacion", "recaudos"].includes(tableType as string)) {
      res.status(400).json({ error: "tableType debe ser 'facturacion' o 'recaudos'" });
      return;
    }

    const dates = await getImportDates(slug as string, tableType as "facturacion" | "recaudos");
    res.json({ dates });
  } catch (error) {
    console.error("Error al obtener fechas de importación:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/truncate/:slug/:tableType", async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug as string;
    const tableType = req.params.tableType as string;

    if (!["facturacion", "recaudos"].includes(tableType)) {
      res.status(400).json({ error: "tableType debe ser 'facturacion' o 'recaudos'" });
      return;
    }

    const [municipio] = await db.select().from(municipios).where(eq(municipios.slug, slug));
    if (!municipio) {
      res.status(404).json({ error: "Municipio no encontrado" });
      return;
    }

    await truncateTable(slug, tableType as "facturacion" | "recaudos");

    res.json({ success: true, message: `Tabla ${slug}_${tableType} vaciada correctamente` });
  } catch (error) {
    console.error("Error al vaciar tabla:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/upload-data", async (req: Request, res: Response) => {
  try {
    const { municipioSlug, tableType, headers: csvHeaders, rows: csvRows } = req.body;

    if (!tableType || !["facturacion", "recaudos"].includes(tableType)) {
      res.status(400).json({ error: "tableType debe ser 'facturacion' o 'recaudos'" });
      return;
    }

    if (!municipioSlug) {
      res.status(400).json({ error: "municipioSlug es requerido" });
      return;
    }

    if (!csvHeaders || !csvRows || !Array.isArray(csvRows) || csvRows.length === 0) {
      res.status(400).json({ error: "No se enviaron datos válidos" });
      return;
    }

    const [municipio] = await db.select().from(municipios).where(eq(municipios.slug, municipioSlug));
    if (!municipio) {
      res.status(400).json({ error: "Municipio no encontrado" });
      return;
    }

    // Obtener encabezados SIEMPRE de la BD (ignorar headers del frontend)
    const encabezados: string[] = (tableType === "facturacion" ? municipio.encabezadosFacturacion : municipio.encabezadosRecaudos) || [];
    const columnNames = encabezados.map((h: string) => sanitizeColumnName(h));
    const expectedCols = encabezados.length;

    const numCols = csvHeaders.length;
    if (expectedCols > 0 && numCols !== expectedCols) {
      res.status(400).json({ error: `El archivo tiene ${numCols} columnas pero se esperan ${expectedCols}. Descarga la plantilla para ver el formato correcto.` });
      return;
    }

    // Migrar tabla existente si no tiene columna fecha_importacion
    await ensureFechaImportacion(municipioSlug, tableType as "facturacion" | "recaudos");

    const BATCH_SIZE = 1000;
    let inserted = 0;
    let errors = 0;

    const fechaImportacion = new Date().toISOString();

    for (let i = 0; i < csvRows.length; i += BATCH_SIZE) {
      const batch = csvRows.slice(i, i + BATCH_SIZE);
      const mappedRows = batch.map((values: string[]) => {
        const row = mapRowWithHeaders(values, columnNames);
        row.fecha_importacion = fechaImportacion;
        return row;
      });

      try {
        await insertBatch(municipioSlug, tableType as "facturacion" | "recaudos", mappedRows);
        inserted += mappedRows.length;
      } catch (err) {
        console.error(`Error en lote ${Math.floor(i / BATCH_SIZE)}:`, err);
        errors += mappedRows.length;
      }
    }

    res.json({
      success: true,
      table: `${municipioSlug}_${tableType}`,
      totalRows: csvRows.length,
      inserted,
      errors,
    });
  } catch (error) {
    console.error("Error en upload-data:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
