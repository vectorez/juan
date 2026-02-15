import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";
import { municipios } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { createMunicipioTables, dropMunicipioTables } from "../db/dynamic-tables.js";

const router = Router();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

router.get("/municipios", async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(municipios).orderBy(municipios.nombreDepartamento, municipios.nombreMunicipio);
    res.json({ data });
  } catch (error) {
    console.error("Error al obtener municipios:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/municipios/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [municipio] = await db.select().from(municipios).where(eq(municipios.id, id));
    if (!municipio) {
      res.status(404).json({ error: "Municipio no encontrado" });
      return;
    }
    res.json({ data: municipio });
  } catch (error) {
    console.error("Error al obtener municipio:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/municipios", async (req: Request, res: Response) => {
  try {
    const { codDepartamento, nombreDepartamento, codMunicipio, nombreMunicipio, encabezadosFacturacion, encabezadosRecaudos } = req.body;

    if (!codDepartamento || !nombreDepartamento || !codMunicipio || !nombreMunicipio) {
      res.status(400).json({ error: "Todos los campos son requeridos: codDepartamento, nombreDepartamento, codMunicipio, nombreMunicipio" });
      return;
    }

    if (!Array.isArray(encabezadosFacturacion) || encabezadosFacturacion.length === 0) {
      res.status(400).json({ error: "Debes subir un archivo de facturación para detectar los encabezados" });
      return;
    }
    if (!Array.isArray(encabezadosRecaudos) || encabezadosRecaudos.length === 0) {
      res.status(400).json({ error: "Debes subir un archivo de recaudos para detectar los encabezados" });
      return;
    }

    const slug = generateSlug(nombreMunicipio);

    const [created] = await db.insert(municipios).values({
      codDepartamento: Number(codDepartamento),
      nombreDepartamento,
      codMunicipio: Number(codMunicipio),
      nombreMunicipio,
      slug,
      activo: true,
      columnasFacturacion: encabezadosFacturacion.length,
      columnasRecaudos: encabezadosRecaudos.length,
      encabezadosFacturacion,
      encabezadosRecaudos,
    }).returning();

    await createMunicipioTables(slug, encabezadosFacturacion.length, encabezadosRecaudos.length);

    res.status(201).json({ data: created });
  } catch (error) {
    console.error("Error al crear municipio:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.put("/municipios/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { codDepartamento, nombreDepartamento, codMunicipio, nombreMunicipio, activo, encabezadosFacturacion, encabezadosRecaudos } = req.body;

    const updateData: Record<string, unknown> = {};
    if (codDepartamento !== undefined) updateData.codDepartamento = Number(codDepartamento);
    if (nombreDepartamento !== undefined) updateData.nombreDepartamento = nombreDepartamento;
    if (codMunicipio !== undefined) updateData.codMunicipio = Number(codMunicipio);
    if (nombreMunicipio !== undefined) updateData.nombreMunicipio = nombreMunicipio;
    if (activo !== undefined) updateData.activo = activo;
    if (Array.isArray(encabezadosFacturacion)) {
      updateData.encabezadosFacturacion = encabezadosFacturacion;
      updateData.columnasFacturacion = encabezadosFacturacion.length;
    }
    if (Array.isArray(encabezadosRecaudos)) {
      updateData.encabezadosRecaudos = encabezadosRecaudos;
      updateData.columnasRecaudos = encabezadosRecaudos.length;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "No se proporcionaron campos para actualizar" });
      return;
    }

    const [updated] = await db.update(municipios).set(updateData).where(eq(municipios.id, id)).returning();

    if (!updated) {
      res.status(404).json({ error: "Municipio no encontrado" });
      return;
    }

    res.json({ data: updated });
  } catch (error) {
    console.error("Error al actualizar municipio:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/municipios/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [deleted] = await db.delete(municipios).where(eq(municipios.id, id)).returning();

    if (!deleted) {
      res.status(404).json({ error: "Municipio no encontrado" });
      return;
    }

    await dropMunicipioTables(deleted.slug);

    res.json({ data: deleted, message: "Municipio y sus tablas eliminados" });
  } catch (error) {
    console.error("Error al eliminar municipio:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
