# Bitácora de Cambios - Gestor CSV → PostgreSQL

## 2026-02-15

### Estructura del proyecto creada
- `.env` — Variable `DATABASE_URL` para conexión a PostgreSQL
- `.gitignore` — Excluye node_modules, dist, .env, __pycache__

### Backend (Node.js + Express + Drizzle ORM)
- `backend/package.json` — Dependencias: express, drizzle-orm, postgres, multer, cors, dotenv
- `backend/tsconfig.json` — Config TypeScript ESM
- `backend/drizzle.config.ts` — Config Drizzle Kit apuntando al .env raíz
- `backend/src/db/schema.ts` — Esquemas Drizzle para tablas `ap_apartado` (25 cols) y `ap_apartado_recaudos` (23 cols)
- `backend/src/db/connection.ts` — Conexión PostgreSQL con postgres.js + drizzle
- `backend/src/routes/upload.ts` — Endpoints:
  - `POST /api/upload` — Recibe CSV + tableType, parsea e inserta por lotes de 1000
  - `GET /api/tables` — Retorna conteo de registros por tabla
  - `GET /api/data/:table` — Retorna datos paginados de una tabla
- `backend/src/index.ts` — Servidor Express en puerto 3001

### Microservicio Python (FastAPI)
- `python-service/requirements.txt` — fastapi, uvicorn, pandas, python-multipart
- `python-service/main.py` — Endpoints:
  - `POST /analyze` — Recibe CSV, detecta codificación, infiere tipos SQL, retorna metadata y preview
  - `GET /health` — Health check

### Frontend (React + Vite + TailwindCSS)
- Creado con `pnpm create vite` (React + TypeScript)
- `frontend/vite.config.ts` — Plugins: react + tailwindcss, proxy a backend (3001) y python (8000)
- `frontend/src/index.css` — Import de TailwindCSS v4
- `frontend/src/App.tsx` — Layout principal con tabs: Subir CSV / Ver Datos
- `frontend/src/components/FileUploader.tsx` — Drag-and-drop, análisis vía Python, subida al backend por lotes
- `frontend/src/components/TableStats.tsx` — Muestra conteo de registros por tabla
- `frontend/src/components/DataViewer.tsx` — Tabla paginada para visualizar datos en PostgreSQL

### Base de datos
- Creada base de datos `juan_db` en PostgreSQL local
- Ejecutado `drizzle-kit push` para crear tablas `ap_apartado` y `ap_apartado_recaudos`

### Comando Drizzle Studio
- Añadido script `studio` en `backend/package.json` para abrir Drizzle Studio

### Módulo de Municipios (CRUD)
- `backend/src/db/schema.ts` — Nueva tabla `municipios` (id, cod_departamento, nombre_departamento, cod_municipio, nombre_municipio, activo)
- `backend/src/routes/municipios.ts` — Endpoints CRUD:
  - `GET /api/municipios` — Listar todos
  - `GET /api/municipios/:id` — Obtener uno
  - `POST /api/municipios` — Crear
  - `PUT /api/municipios/:id` — Editar (parcial)
  - `DELETE /api/municipios/:id` — Eliminar
- `backend/src/index.ts` — Registrada ruta de municipios
- `backend/src/routes/upload.ts` — Endpoint `/api/tables` ahora incluye conteo de municipios
- `frontend/src/components/MunicipiosManager.tsx` — Componente CRUD completo con formulario crear/editar, toggle activo/inactivo, eliminar
- `frontend/src/App.tsx` — Nueva tab "Municipios" con ícono MapPin
- Ejecutado `drizzle-kit push` para crear tabla `municipios` en PostgreSQL

### Tablas dinámicas por municipio (reestructuración completa)
- **Eliminadas** tablas fijas `ap_apartado` y `ap_apartado_recaudos` del esquema y de la DB
- `backend/src/db/schema.ts` — Solo queda tabla `municipios` con nuevo campo `slug` (unique)
- `backend/src/db/dynamic-tables.ts` — **Nuevo archivo** con funciones:
  - `createMunicipioTables(slug)` → crea `{slug}_facturacion` y `{slug}_recaudos` con SQL raw
  - `dropMunicipioTables(slug)` → elimina ambas tablas dinámicas
  - `getTableCount(slug, tipo)` → count de registros
  - `getTableData(slug, tipo, limit, offset)` → datos paginados
  - `insertBatch(slug, tipo, rows)` → inserción por lotes en tabla dinámica
- `backend/src/routes/municipios.ts` — Al crear municipio genera slug automático y crea tablas; al eliminar, dropea tablas
- `backend/src/routes/upload.ts` — Reescrito: recibe `municipioSlug` + `tableType` (facturacion/recaudos), inserta en tabla dinámica
  - `GET /api/tables` → conteo por municipio (facturación + recaudos)
  - `GET /api/data/:slug/:tableType` → datos paginados de tabla dinámica
- `frontend/src/components/FileUploader.tsx` — Selector de municipio obligatorio + tipo de datos (Facturación/Recaudos)
- `frontend/src/components/DataViewer.tsx` — Filtro por municipio + tipo de tabla
- `frontend/src/components/TableStats.tsx` — Cards con conteo facturación/recaudos por municipio

### Preview editable con SheetJS (xlsx)
- Instalado `xlsx` (SheetJS) en el frontend vía `pnpm add xlsx`
- `frontend/src/components/FileUploader.tsx` — **Reescrito completamente**:
  - Parseo client-side con `XLSX.read()` (soporta CSV y Excel, codepage latin1)
  - Tabla editable inline: clic en celda para editar, Enter/Tab para confirmar, Escape para cancelar
  - Navegación con Tab entre celdas
  - Botón eliminar fila por fila (ícono Trash2)
  - Paginación de vista previa (50 filas por página)
  - Botón "Limpiar" para resetear
  - Soporta archivos `.csv`, `.xlsx`, `.xls`
  - Ya no requiere servicio Python para analizar — parseo 100% en el navegador
- `backend/src/routes/upload.ts` — Nuevo endpoint `POST /api/upload-data`:
  - Recibe `{ municipioSlug, tableType, headers, rows }` como JSON
  - Mapea filas con las mismas funciones de conversión existentes
  - Inserta por lotes de 1000 en tablas dinámicas
- `backend/src/index.ts` — `express.json()` con `limit: "100mb"` para CSV grandes como JSON

### Vaciar tabla (truncate) con confirmación
- `backend/src/db/dynamic-tables.ts` — Nueva función `truncateTable(slug, tableType)` con `TRUNCATE TABLE ... RESTART IDENTITY`
- `backend/src/routes/upload.ts` — Nuevo endpoint `DELETE /api/truncate/:slug/:tableType`
- `frontend/src/components/TableStats.tsx` — Botón 🗑️ en cada celda de conteo (solo visible si count > 0), modal de confirmación con advertencia antes de vaciar

### Dependencias actualizadas
- `drizzle-orm` actualizado de 0.34.1 → 0.45.1
- `drizzle-kit` actualizado de 0.28.1 → 0.31.9 (compatibilidad)

### Modal de subida en TableStats con preview editable
- `frontend/src/components/TableStats.tsx` — Botón **"Subir"** en cada card de municipio que abre modal completo:
  - Select de tipo de datos (Facturación/Recaudos) con opción vacía inicial obligatoria
  - File picker para CSV/Excel (solo visible tras seleccionar tipo)
  - Parseo client-side con SheetJS (mismo que tenía FileUploader)
  - **Tabla preview editable** con botón toggle "Preview/Ocultar":
    - Edición inline de celdas (clic → Enter/Tab/Escape)
    - Navegación con Tab entre celdas
    - Botón eliminar fila por fila
    - Paginación de 50 filas por página
    - Modal se expande a `max-w-6xl` cuando preview está abierto
  - Botón "Subir" envía datos editados a `/api/upload-data`
  - Muestra resultado de carga con estadísticas
- `frontend/src/App.tsx` — **Eliminada tab "Subir CSV"**, solo quedan "Ver Datos" y "Municipios"
- `frontend/src/components/FileUploader.tsx` — **Archivo eliminado** (funcionalidad migrada a TableStats)
- `TableStats` ahora siempre visible, maneja toda la subida de archivos desde cards de municipio
