import { Router, Request, Response } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db } from "../db/connection.js";
import { apApartado, apApartadoRecaudos } from "../db/schema.js";
import { sql } from "drizzle-orm";

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

function mapApartadoRow(values: string[], headers: string[]) {
  const get = (name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? values[idx] : "";
  };
  return {
    ciclo: parseNumber(get("Ciclo")),
    servicioSuscritoDependiente: parseNumber(get("ServicioSuscritoDependiente")),
    servicioSuscritoPadre: parseNumber(get("ServicioSuscritoPadre")),
    tipoServicio: parseNumber(get("TipoServicio")),
    descripcionServicio: get("DescripcionServicio") || null,
    suscripcion: parseNumber(get("Suscripcion")),
    fechaGeneracionFactura: get("FechaGeneracionFactura") || null,
    anoMesFactura: parseNumber(get("AnoMesFactura")),
    nroFactura: parseNumber(get("NroFactura")),
    categoria: parseNumber(get("Categoria")),
    subCategoria: parseNumber(get("SubCategoria")),
    valorImpuesto: parseDecimal(get("ValorImpuesto")),
    valorCartera: parseDecimal(get("ValorCartera")),
    interesesMora: parseDecimal(get("InteresesMora")),
    valorReconocimiento: parseDecimal(get("ValorReconocimiento")),
    valorSeparacion: parseDecimal(get("ValorSeparacion")),
    valorFinanciacion: parseDecimal(get("ValorFinanciacion")),
    valorTotalFacturado: parseDecimal(get("ValorTotalFacturado")),
    direccion: get("Direccion") || null,
    nroInstalacion: get("NroInstalacion") || null,
    sujetoPasivoPdtoDependiente: get("SujetoPasivoPdtoDependiente") || null,
    identificacionSujetoPasivo: get("IdentificacionSujetoPasivo") || null,
    codDepartamento: parseNumber(get("CodDepartamento")),
    codMunicipio: parseNumber(get("CodMunicipio")),
    consumoEnergia: parseDecimal(get("ConsumoEnergia")),
  };
}

function mapRecaudosRow(values: string[], headers: string[]) {
  const get = (name: string) => {
    const idx = headers.indexOf(name);
    return idx >= 0 ? values[idx] : "";
  };
  return {
    servicioSuscritoDependiente: parseNumber(get("ServicioSuscritoDependiente")),
    servicioSuscritoPadre: parseNumber(get("ServicioSuscritoPadre")),
    tipoServicio: parseNumber(get("TipoServicio")),
    descripcionServicio: get("DescripcionServicio") || null,
    suscripcion: parseNumber(get("Suscripcion")),
    anoMesFactura: parseNumber(get("AnoMesFactura")),
    nroFactura: parseNumber(get("NroFactura")),
    categoria: parseNumber(get("Categoria")),
    subCategoria: parseNumber(get("SubCategoria")),
    valorRecaudoImpuesto: parseDecimal(get("ValorRecaudoImpuesto")),
    valorRecaudoIntereses: parseDecimal(get("ValorRecaudoIntereses")),
    valorRecaudoSeparacion: parseDecimal(get("ValorRecaudoSeparacion")),
    valorReconocimiento: parseDecimal(get("ValorReconocimiento")),
    valorOtrosRecaudos: parseDecimal(get("ValorOtrosRecaudos")),
    valorTotalRecaudos: parseDecimal(get("ValorTotalRecaudos")),
    fechaPago: get("FechaPago") || null,
    direccion: get("Direccion") || null,
    nroInstalacion: get("NroInstalacion") || null,
    sujetoPasivoPdtoDependiente: get("SujetoPasivoPdtoDependiente") || null,
    identificacionSujetoPasivo: get("IdentificacionSujetoPasivo") || null,
    codDepartamento: parseNumber(get("CodDepartamento")),
    codMunicipio: parseNumber(get("CodMunicipio")),
    valorReconocimientoCovid: parseDecimal(get("ValorReconocimientoCOVID")),
  };
}

router.post("/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const tableType = req.body?.tableType as string;
    if (!tableType || !["apartado", "recaudos"].includes(tableType)) {
      res.status(400).json({ error: "tableType debe ser 'apartado' o 'recaudos'" });
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
        return tableType === "apartado"
          ? mapApartadoRow(values, headers)
          : mapRecaudosRow(values, headers);
      });

      try {
        if (tableType === "apartado") {
          await db.insert(apApartado).values(rows as any[]);
        } else {
          await db.insert(apApartadoRecaudos).values(rows as any[]);
        }
        inserted += rows.length;
      } catch (err) {
        console.error(`Error en lote ${Math.floor(i / BATCH_SIZE)}:`, err);
        errors += rows.length;
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      table: tableType === "apartado" ? "ap_apartado" : "ap_apartado_recaudos",
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
    const [apartadoCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apApartado);
    const [recaudosCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(apApartadoRecaudos);

    res.json({
      tables: [
        { name: "ap_apartado", count: apartadoCount.count },
        { name: "ap_apartado_recaudos", count: recaudosCount.count },
      ],
    });
  } catch (error) {
    console.error("Error al obtener tablas:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/data/:table", async (req: Request, res: Response) => {
  try {
    const { table } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (table === "ap_apartado") {
      const data = await db.select().from(apApartado).limit(limit).offset(offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(apApartado);
      res.json({ data, total: count });
    } else if (table === "ap_apartado_recaudos") {
      const data = await db.select().from(apApartadoRecaudos).limit(limit).offset(offset);
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(apApartadoRecaudos);
      res.json({ data, total: count });
    } else {
      res.status(400).json({ error: "Tabla no válida" });
    }
  } catch (error) {
    console.error("Error al obtener datos:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
