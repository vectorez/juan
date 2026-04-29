import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import fs from "fs";
import uploadRouter from "./routes/upload.js";
import municipiosRouter from "./routes/municipios.js";
import pipelinesRouter from "./routes/pipelines.js";
import reportesRouter from "./routes/reportes.js";
import publicRouter from "./routes/public.js";
import authRouter from "./routes/auth.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "100mb" }));

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use("/api", uploadRouter);
app.use("/api", municipiosRouter);
app.use("/api", pipelinesRouter);
app.use("/api", reportesRouter);
app.use("/api", authRouter);
app.use("/api/public", publicRouter);

app.get("/docs", (_req, res) => {
  res.sendFile(path.join(__dirname, "docs.html"));
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api|\/docs|\/health|\/analyze).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
  console.log(`Sirviendo frontend desde ${frontendDist}`);
}

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
