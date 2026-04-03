import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";
import { municipios } from "../db/schema.js";
import { eq, ilike } from "drizzle-orm";
import { client } from "../db/connection.js";
import { sanitizeColumnName } from "../db/dynamic-tables.js";

const router = Router();

function sanitizeSlug(slug: string): string {
  return slug.replace(/[^a-z0-9_]/g, "");
}

function parsePageParams(query: Record<string, unknown>) {
  const limit = Math.min(Math.max(parseInt(String(query.limit ?? "100")), 1), 1000);
  const page  = Math.max(parseInt(String(query.page ?? "1")), 1);
  const offset = (page - 1) * limit;
  return { limit, page, offset };
}

// ──────────────────────────────────────────────
// GET /api/public/municipios
// Lista todos los municipios activos
// ──────────────────────────────────────────────
router.get("/municipios", async (req: Request, res: Response) => {
  try {
    const { departamento, activo } = req.query;
    let rows = await db
      .select()
      .from(municipios)
      .orderBy(municipios.nombreDepartamento, municipios.nombreMunicipio);

    if (departamento) {
      rows = rows.filter(m =>
        m.nombreDepartamento.toLowerCase().includes(String(departamento).toLowerCase())
      );
    }
    if (activo !== undefined) {
      const active = activo === "true";
      rows = rows.filter(m => m.activo === active);
    }

    const result = rows.map(m => ({
      id: m.id,
      cod_departamento: m.codDepartamento,
      nombre_departamento: m.nombreDepartamento,
      cod_municipio: m.codMunicipio,
      nombre_municipio: m.nombreMunicipio,
      slug: m.slug,
      activo: m.activo,
      encabezados_facturacion: m.encabezadosFacturacion,
      encabezados_recaudos: m.encabezadosRecaudos,
      columnas_facturacion: m.columnasFacturacion,
      columnas_recaudos: m.columnasRecaudos,
    }));

    res.json({
      success: true,
      total: result.length,
      data: result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

// ──────────────────────────────────────────────
// GET /api/public/municipios/:slug
// Obtiene un municipio con sus estadísticas
// ──────────────────────────────────────────────
router.get("/municipios/:slug", async (req: Request, res: Response) => {
  try {
    const slug = sanitizeSlug(req.params.slug);
    const [m] = await db.select().from(municipios).where(eq(municipios.slug, slug));

    if (!m) {
      res.status(404).json({ success: false, error: `Municipio '${slug}' no encontrado` });
      return;
    }

    let countFact = 0, countRec = 0;
    try {
      const [rf] = await client.unsafe(`SELECT count(*)::int as c FROM "${slug}_facturacion"`);
      countFact = rf?.c ?? 0;
    } catch { /* tabla sin datos */ }
    try {
      const [rr] = await client.unsafe(`SELECT count(*)::int as c FROM "${slug}_recaudos"`);
      countRec = rr?.c ?? 0;
    } catch { /* tabla sin datos */ }

    res.json({
      success: true,
      data: {
        id: m.id,
        cod_departamento: m.codDepartamento,
        nombre_departamento: m.nombreDepartamento,
        cod_municipio: m.codMunicipio,
        nombre_municipio: m.nombreMunicipio,
        slug: m.slug,
        activo: m.activo,
        encabezados_facturacion: m.encabezadosFacturacion,
        encabezados_recaudos: m.encabezadosRecaudos,
        stats: {
          total_registros_facturacion: countFact,
          total_registros_recaudos: countRec,
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Error interno del servidor" });
  }
});

// ──────────────────────────────────────────────
// GET /api/public/municipios/:slug/facturacion
// GET /api/public/municipios/:slug/recaudos
// Consulta datos de un municipio con paginación y filtros
// ──────────────────────────────────────────────
async function queryMunicipioData(req: Request, res: Response, tableType: "facturacion" | "recaudos") {
  try {
    const slug = sanitizeSlug(req.params.slug);
    const { limit, page, offset } = parsePageParams(req.query as Record<string, unknown>);
    const { fecha, columna, q, orderby, dir } = req.query as Record<string, string>;

    const [m] = await db.select().from(municipios).where(eq(municipios.slug, slug));
    if (!m) {
      res.status(404).json({ success: false, error: `Municipio '${slug}' no encontrado` });
      return;
    }

    const tableName = `${slug}_${tableType}`;
    const conditions: string[] = [];

    if (fecha) {
      conditions.push(`fecha_importacion::date = '${fecha.replace(/'/g, "")}'::date`);
    }
    if (columna && q) {
      const safeCol = sanitizeColumnName(columna);
      const safeQ = q.replace(/'/g, "''");
      conditions.push(`"${safeCol}"::text ILIKE '%${safeQ}%'`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    let orderClause = "ORDER BY id ASC";
    if (orderby) {
      const safeCol = sanitizeColumnName(orderby);
      const direction = dir?.toUpperCase() === "DESC" ? "DESC" : "ASC";
      orderClause = `ORDER BY "${safeCol}" ${direction}`;
    }

    const [{ total }] = await client.unsafe(
      `SELECT count(*)::int as total FROM "${tableName}" ${where}`
    ) as [{ total: number }];

    const rows = await client.unsafe(
      `SELECT * FROM "${tableName}" ${where} ${orderClause} LIMIT ${limit} OFFSET ${offset}`
    );

    const encabezados = tableType === "facturacion" ? m.encabezadosFacturacion : m.encabezadosRecaudos;

    res.json({
      success: true,
      municipio: m.nombreMunicipio,
      tabla: tableType,
      encabezados,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        has_next: page * limit < total,
        has_prev: page > 1,
      },
      data: rows,
    });
  } catch (error) {
    const err = error as { message?: string };
    if (err.message?.includes("does not exist")) {
      res.status(404).json({ success: false, error: "No hay datos para este municipio aún" });
    } else {
      console.error(error);
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  }
}

router.get("/municipios/:slug/facturacion", (req, res) => queryMunicipioData(req, res, "facturacion"));
router.get("/municipios/:slug/recaudos",    (req, res) => queryMunicipioData(req, res, "recaudos"));

// ──────────────────────────────────────────────
// GET /api/public/municipios/:slug/importaciones
// Lista las fechas de importación disponibles
// ──────────────────────────────────────────────
router.get("/municipios/:slug/importaciones", async (req: Request, res: Response) => {
  try {
    const slug = sanitizeSlug(req.params.slug);
    const { tipo = "facturacion" } = req.query;
    const tableType = tipo === "recaudos" ? "recaudos" : "facturacion";
    const tableName = `${slug}_${tableType}`;

    const rows = await client.unsafe(`
      SELECT
        fecha_importacion::date AS fecha,
        COUNT(*)::int AS registros,
        MIN(fecha_importacion) AS primera,
        MAX(fecha_importacion) AS ultima
      FROM "${tableName}"
      GROUP BY fecha_importacion::date
      ORDER BY fecha_importacion::date DESC
    `);

    res.json({
      success: true,
      municipio_slug: slug,
      tabla: tableType,
      total_importaciones: rows.length,
      data: rows,
    });
  } catch (error) {
    const err = error as { message?: string };
    if (err.message?.includes("does not exist")) {
      res.status(404).json({ success: false, error: "No hay importaciones para este municipio" });
    } else {
      console.error(error);
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  }
});

// ──────────────────────────────────────────────
// GET /api/public/municipios/:slug/stats
// Estadísticas agregadas por columna
// ──────────────────────────────────────────────
router.get("/municipios/:slug/stats", async (req: Request, res: Response) => {
  try {
    const slug = sanitizeSlug(req.params.slug);
    const { tipo = "facturacion", columna } = req.query as Record<string, string>;
    const tableType = tipo === "recaudos" ? "recaudos" : "facturacion";
    const tableName = `${slug}_${tableType}`;

    const [m] = await db.select().from(municipios).where(eq(municipios.slug, slug));
    if (!m) {
      res.status(404).json({ success: false, error: `Municipio '${slug}' no encontrado` });
      return;
    }

    const encabezados = tableType === "facturacion" ? m.encabezadosFacturacion : m.encabezadosRecaudos;
    const [{ total }] = await client.unsafe(
      `SELECT count(*)::int as total FROM "${tableName}"`
    ) as [{ total: number }];

    const importaciones = await client.unsafe(`
      SELECT fecha_importacion::date AS fecha, COUNT(*)::int AS registros
      FROM "${tableName}"
      GROUP BY fecha_importacion::date
      ORDER BY fecha_importacion::date DESC
    `);

    let colStats = null;
    if (columna) {
      const safeCol = sanitizeColumnName(columna);
      try {
        const [stats] = await client.unsafe(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(DISTINCT "${safeCol}")::int AS valores_unicos,
            COUNT("${safeCol}")::int AS no_nulos
          FROM "${tableName}"
        `) as [Record<string, number>];

        const topValues = await client.unsafe(`
          SELECT "${safeCol}" AS valor, COUNT(*)::int AS cantidad
          FROM "${tableName}"
          WHERE "${safeCol}" IS NOT NULL
          GROUP BY "${safeCol}"
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `);

        colStats = { columna, ...stats, top_valores: topValues };
      } catch { /* columna no existe */ }
    }

    res.json({
      success: true,
      municipio: m.nombreMunicipio,
      tabla: tableType,
      stats: {
        total_registros: total,
        total_columnas: encabezados?.length ?? 0,
        encabezados,
        total_importaciones: importaciones.length,
        importaciones,
        ...(colStats ? { columna_stats: colStats } : {}),
      },
    });
  } catch (error) {
    const err = error as { message?: string };
    if (err.message?.includes("does not exist")) {
      res.status(404).json({ success: false, error: "No hay datos para este municipio aún" });
    } else {
      console.error(error);
      res.status(500).json({ success: false, error: "Error interno del servidor" });
    }
  }
});

export default router;
