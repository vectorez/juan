import { Router, Request, Response } from "express";
import { db } from "../db/connection.js";
import { pipelines } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/pipelines", async (_req: Request, res: Response) => {
  try {
    const data = await db.select().from(pipelines).orderBy(desc(pipelines.updatedAt));
    res.json({ data });
  } catch (error) {
    console.error("Error al obtener pipelines:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.get("/pipelines/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, id));
    if (!pipeline) {
      res.status(404).json({ error: "Pipeline no encontrado" });
      return;
    }
    res.json({ data: pipeline });
  } catch (error) {
    console.error("Error al obtener pipeline:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.post("/pipelines", async (req: Request, res: Response) => {
  try {
    const { nombre, descripcion, flowData } = req.body;

    if (!nombre || !flowData) {
      res.status(400).json({ error: "nombre y flowData son requeridos" });
      return;
    }

    const [created] = await db
      .insert(pipelines)
      .values({
        nombre,
        descripcion: descripcion || "",
        flowData,
      })
      .returning();

    res.status(201).json({ data: created });
  } catch (error) {
    console.error("Error al crear pipeline:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.put("/pipelines/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const { nombre, descripcion, flowData } = req.body;

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (nombre !== undefined) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (flowData !== undefined) updateData.flowData = flowData;

    const [updated] = await db
      .update(pipelines)
      .set(updateData)
      .where(eq(pipelines.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Pipeline no encontrado" });
      return;
    }

    res.json({ data: updated });
  } catch (error) {
    console.error("Error al actualizar pipeline:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

router.delete("/pipelines/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string);
    const [deleted] = await db.delete(pipelines).where(eq(pipelines.id, id)).returning();

    if (!deleted) {
      res.status(404).json({ error: "Pipeline no encontrado" });
      return;
    }

    res.json({ data: deleted, message: "Pipeline eliminado" });
  } catch (error) {
    console.error("Error al eliminar pipeline:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
