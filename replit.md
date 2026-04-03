# Gestor CSV → PostgreSQL

Aplicación full-stack para cargar, gestionar y procesar datos CSV de facturación y recaudos municipales. Incluye un constructor visual de pipelines de datos.

## Arquitectura

El proyecto tiene tres componentes en carpetas separadas, orquestados desde la raíz:

```
/
├── package.json          ← Raíz: orquesta frontend + backend con concurrently
├── backend/              ← Express + Drizzle ORM + PostgreSQL (puerto 3001)
├── frontend/             ← React + Vite + Tailwind + XYFlow (puerto 5000)
└── python-service/       ← FastAPI + Pandas (puerto 8000, opcional)
```

## Cómo arrancar

Un solo comando desde la raíz:
```bash
npm run dev
```

Esto levanta simultáneamente:
- **Frontend** en `http://localhost:5000` (Vite dev server)
- **Backend** en `http://localhost:3001` (Express)

El frontend ya está configurado para hacer proxy de `/api` → backend (3001) y `/analyze` → python-service (8000).

## Workflow configurado

- **"Start application"** → `npm run dev` → espera puerto 5000 (webview)

## Base de datos

PostgreSQL provista por Replit. Variables de entorno: `DATABASE_URL`, `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`.

Para aplicar cambios al esquema:
```bash
cd backend && node_modules/.bin/drizzle-kit push
```

## Stack tecnológico

### Frontend
- React 19 + TypeScript
- Vite 7 (puerto 5000)
- Tailwind CSS v4
- @xyflow/react (constructor de pipelines visual)
- SheetJS (parseo CSV/Excel en el navegador)
- Axios + Lucide React

### Backend
- Node.js + Express
- Drizzle ORM + postgres.js
- Multer (upload de archivos)
- Puerto 3001

### Python Service (opcional)
- FastAPI + Pandas
- Detección de encoding y tipos SQL
- Puerto 8000

## Funcionalidades principales

1. **Gestión de municipios** — CRUD con tablas dinámicas por municipio (`{slug}_facturacion`, `{slug}_recaudos`)
2. **Carga de archivos** — CSV/Excel con preview editable, validación de columnas, subida por lotes
3. **Visor de datos** — Tabla estilo spreadsheet con filtro por importación y eliminación selectiva
4. **Constructor de pipelines** — Drag & drop visual con nodos: Source, Filter, Aggregate, Transform, Conditional, Output
5. **Plantillas Excel** — Descarga de plantilla con encabezados correctos por municipio

## Scripts disponibles

```bash
# Raíz
npm run dev          # Arranca frontend + backend juntos
npm run dev:frontend # Solo frontend
npm run dev:backend  # Solo backend
npm run build        # Build del frontend

# Backend
cd backend && npm run push    # Aplica esquema Drizzle a la BD
cd backend && npm run studio  # Drizzle Studio (explorador de BD)
```
