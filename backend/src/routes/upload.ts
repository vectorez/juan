import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db } from "../db/connection.js";
import { municipios } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { insertBatch, getTableCount, getTableData } from "../db/dynamic-tables.js";

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

function parseNumber(val: string): number | null {
  if (!val || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function parseDecimal(val: string): string | null {
  if (!val || val === "") return null;
  return val.replace(",", ".");
}

function mapFacturacionRow(values: string[], headers: string[]) {
  const get = (name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? values[idx] : "";
  };
  return {
    ciclo: parseNumber(get("Ciclo")),
    servicio_suscrito_dependiente: parseNumber(get("ServicioSuscritoDependiente")),
    servicio_suscrito_padre: parseNumber(get("ServicioSuscritoPadre")),
    tipo_servicio: parseNumber(get("TipoServicio")),
    descripcion_servicio: get("DescripcionServicio") || null,
    suscripcion: parseNumber(get("Suscripcion")),
    fecha_generacion_factura: get("FechaGeneracionFactura") || null,
    ano_mes_factura: parseNumber(get("AnoMesFactura")),
    nro_factura: parseNumber(get("NroFactura")),
    categoria: parseNumber(get("Categoria")),
    sub_categoria: parseNumber(get("SubCategoria")),
    valor_impuesto: parseDecimal(get("ValorImpuesto")),
    valor_cartera: parseDecimal(get("ValorCartera")),
    intereses_mora: parseDecimal(get("InteresesMora")),
    valor_reconocimiento: parseDecimal(get("ValorReconocimiento")),
    valor_separacion: parseDecimal(get("ValorSeparacion")),
    valor_financiacion: parseDecimal(get("ValorFinanciacion")),
    valor_total_facturado: parseDecimal(get("ValorTotalFacturado")),
    direccion: get("Direccion") || null,
    nro_instalacion: get("NroInstalacion") || null,
    sujeto_pasivo_pdto_dependiente: get("SujetoPasivoPdtoDependiente") || null,
    identificacion_sujeto_pasivo: get("IdentificacionSujetoPasivo") || null,
    cod_departamento: parseNumber(get("CodDepartamento")),
    cod_municipio: parseNumber(get("CodMunicipio")),
    consumo_energia: parseDecimal(get("ConsumoEnergia")),
  };
}

function mapRecaudosRow(values: string[], headers: string[]) {
  const get = (name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? values[idx] : "";
  };
  return {
    servicio_suscrito_dependiente: parseNumber(get("ServicioSuscritoDependiente")),
    servicio_suscrito_padre: parseNumber(get("ServicioSuscritoPadre")),
    tipo_servicio: parseNumber(get("TipoServicio")),
    descripcion_servicio: get("DescripcionServicio") || null,
    suscripcion: parseNumber(get("Suscripcion")),
    ano_mes_factura: parseNumber(get("AnoMesFactura")),
    nro_factura: parseNumber(get("NroFactura")),
    categoria: parseNumber(get("Categoria")),
    sub_categoria: parseNumber(get("SubCategoria")),
    valor_recaudo_impuesto: parseDecimal(get("ValorRecaudoImpuesto")),
    valor_recaudo_intereses: parseDecimal(get("ValorRecaudoIntereses")),
    valor_recaudo_separacion: parseDecimal(get("ValorRecaudoSeparacion")),
    valor_reconocimiento: parseDecimal(get("ValorReconocimiento")),
    valor_otros_recaudos: parseDecimal(get("ValorOtrosRecaudos")),
    valor_total_recaudos: parseDecimal(get("ValorTotalRecaudos")),
    fecha_pago: get("FechaPago") || null,
    direccion: get("Direccion") || null,
    nro_instalacion: get("NroInstalacion") || null,
    sujeto_pasivo_pdto_dependiente: get("SujetoPasivoPdtoDependiente") || null,
    identificacion_sujeto_pasivo: get("IdentificacionSujetoPasivo") || null,
    cod_departamento: parseNumber(get("CodDepartamento")),
    cod_municipio: parseNumber(get("CodMunicipio")),
    valor_reconocimiento_covid: parseDecimal(get("ValorReconocimientoCOVID")),
  };
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

    const headers = parseCsvLine(lines[0]);
    const BATCH_SIZE = 1000;
    let inserted = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i += BATCH_SIZE) {
      const batch = lines.slice(i, i + BATCH_SIZE);
      const rows = batch.map((line) => {
        const values = parseCsvLine(line);
        return tableType === "facturacion"
          ? mapFacturacionRow(values, headers)
          : mapRecaudosRow(values, headers);
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

    if (!tableType || !["facturacion", "recaudos"].includes(tableType as string)) {
      res.status(400).json({ error: "tableType debe ser 'facturacion' o 'recaudos'" });
      return;
    }

    const [municipio] = await db.select().from(municipios).where(eq(municipios.slug, slug as string));
    if (!municipio) {
      res.status(400).json({ error: "Municipio no encontrado" });
      return;
    }

    const result = await getTableData(slug as string, tableType as "facturacion" | "recaudos", limit, offset);
    res.json(result);
  } catch (error) {
    console.error("Error al obtener datos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
