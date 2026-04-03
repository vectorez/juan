import { Router } from "express";
import { db } from "../db/connection.js";
import { reportes } from "../db/schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/reportes", async (_req, res) => {
  try {
    const list = await db
      .select()
      .from(reportes)
      .orderBy(reportes.updatedAt);
    res.json(list);
  } catch (err) {
    console.error("Error al listar reportes:", err);
    res.status(500).json({ error: "Error al listar reportes" });
  }
});

router.get("/reportes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [reporte] = await db.select().from(reportes).where(eq(reportes.id, id));
    if (!reporte) return res.status(404).json({ error: "Reporte no encontrado" });
    res.json(reporte);
  } catch (err) {
    console.error("Error al obtener reporte:", err);
    res.status(500).json({ error: "Error al obtener reporte" });
  }
});

router.post("/reportes", async (req, res) => {
  try {
    const { nombre, descripcion, pipelineId, config } = req.body;
    if (!nombre) return res.status(400).json({ error: "El nombre es requerido" });
    const [nuevo] = await db
      .insert(reportes)
      .values({ nombre, descripcion: descripcion || "", pipelineId: pipelineId || null, config: config || {} })
      .returning();
    res.status(201).json(nuevo);
  } catch (err) {
    console.error("Error al crear reporte:", err);
    res.status(500).json({ error: "Error al crear reporte" });
  }
});

router.put("/reportes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { nombre, descripcion, pipelineId, config } = req.body;
    const [actualizado] = await db
      .update(reportes)
      .set({
        ...(nombre !== undefined && { nombre }),
        ...(descripcion !== undefined && { descripcion }),
        ...(pipelineId !== undefined && { pipelineId: pipelineId || null }),
        ...(config !== undefined && { config }),
        updatedAt: new Date(),
      })
      .where(eq(reportes.id, id))
      .returning();
    if (!actualizado) return res.status(404).json({ error: "Reporte no encontrado" });
    res.json(actualizado);
  } catch (err) {
    console.error("Error al actualizar reporte:", err);
    res.status(500).json({ error: "Error al actualizar reporte" });
  }
});

router.delete("/reportes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(reportes).where(eq(reportes.id, id));
    res.json({ success: true });
  } catch (err) {
    console.error("Error al eliminar reporte:", err);
    res.status(500).json({ error: "Error al eliminar reporte" });
  }
});

export default router;
