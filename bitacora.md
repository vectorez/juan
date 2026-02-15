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

### Columnas dinámicas y detección automática al subir archivos
- `backend/src/db/schema.ts` — Tabla `municipios` con campos internos:
  - `columnas_facturacion` (INTEGER, default 25) y `columnas_recaudos` (INTEGER, default 23)
  - Se actualizan automáticamente al subir archivo (no editables manualmente)
- `backend/src/db/dynamic-tables.ts`:
  - `createMunicipioTables` crea tablas con columnas genéricas `col_1, col_2, ... col_N` (TEXT)
  - **Nueva función `ensureTableColumns`**: verifica columnas existentes en la tabla y agrega las faltantes con `ALTER TABLE` si el archivo tiene más columnas que la tabla
- `backend/src/routes/upload.ts` — **Refactorizado completamente**:
  - Eliminadas funciones `mapFacturacionRow` y `mapRecaudosRow` (mapeo a nombres fijos)
  - Nueva función `mapGenericRow`: mapea valores CSV a `col_1, col_2, ...` en orden
  - Endpoints `/upload` y `/upload-data` ahora:
    - Detectan número de columnas del archivo automáticamente
    - Llaman `ensureTableColumns` para ajustar estructura de tabla si es necesario
    - Actualizan `columnasFacturacion`/`columnasRecaudos` en BD automáticamente
- `backend/src/routes/municipios.ts` — POST `/api/municipios` simplificado:
  - Ya no requiere `columnasFacturacion`/`columnasRecaudos` en el body
  - Usa defaults del esquema para crear tablas iniciales
- `frontend/src/components/MunicipiosManager.tsx` — **Formulario simplificado**:
  - Eliminados campos manuales de columnas, refs de archivos y función de detección
  - Solo campos básicos: código/nombre departamento, código/nombre municipio
  - Las columnas se configuran automáticamente al subir el primer archivo

### Botón Ver datos desde tarjeta de municipio
- `frontend/src/components/TableStats.tsx`:
  - Nuevo botón **"Ver"** con ícono Eye en cada card de municipio
  - Abre modal fullscreen (`max-w-7xl`) con `DataViewer` integrado
  - Modal con header, botón cerrar y scroll interno
- `frontend/src/components/DataViewer.tsx`:
  - Nuevo prop opcional `initialSlug` para preseleccionar municipio
  - Oculta selector de municipio cuando viene preseleccionado (uso en modal)
- `frontend/src/App.tsx`:
  - Eliminada tab "Ver Datos" (ahora se accede desde botón "Ver" en cards)
  - Solo queda tab "Municipios"

### Encabezados de columnas, validación y plantillas Excel
- `backend/src/db/schema.ts` — Nuevos campos JSON en tabla `municipios`:
  - `encabezados_facturacion` (JSON, array de strings) — nombres de columnas
  - `encabezados_recaudos` (JSON, array de strings) — nombres de columnas
  - `columnas_facturacion` y `columnas_recaudos` ahora default 0 (se configuran al crear)
- `backend/src/routes/municipios.ts`:
  - POST requiere `encabezadosFacturacion` y `encabezadosRecaudos` (arrays detectados del archivo)
  - Calcula `columnasFacturacion`/`columnasRecaudos` automáticamente desde la longitud del array
  - PUT permite actualizar encabezados opcionalmente
- `backend/src/routes/upload.ts` — **Refactorizado**:
  - Eliminadas funciones `mapFacturacionRow` y `mapRecaudosRow` (mapeo fijo)
  - Nueva función `mapGenericRow`: mapea valores a `col_1, col_2, ...` en orden
  - **Validación de columnas**: al subir archivo, valida que tenga el número exacto de columnas configuradas
  - Si no coincide, rechaza con error descriptivo sugiriendo descargar la plantilla
  - Endpoint `/api/tables` ahora devuelve `encabezadosFacturacion` y `encabezadosRecaudos`
- `frontend/src/components/MunicipiosManager.tsx` — **Formulario con detección de encabezados**:
  - Al crear municipio, obligatorio subir archivo de ejemplo para facturación y recaudos
  - Botones "Subir archivo de ejemplo" con estados visuales (vacío → leyendo → detectado)
  - Muestra encabezados detectados como tags coloreados (indigo para facturación, purple para recaudos)
  - Spinner de carga mientras lee el archivo con SheetJS
  - Validación: no permite crear sin ambos conjuntos de encabezados
  - Envía arrays de encabezados al backend al crear
- `frontend/src/components/TableStats.tsx` — **Botón descarga de plantilla y prevalidación**:
  - Ícono Download junto a cada tipo de tabla en las cards
  - Genera archivo Excel con una fila de encabezados usando SheetJS
  - Nombre del archivo: `plantilla_{slug}_{tipo}.xlsx`
  - Solo visible si el municipio tiene encabezados configurados
  - **Prevalidación al seleccionar archivo en modal de subida**:
    - Al cargar archivo, valida inmediatamente número de columnas contra lo esperado
    - Si no coincide, muestra alerta roja con ícono de advertencia
    - Mensaje descriptivo: "El archivo tiene X columnas pero se esperan Y"
    - Botón "Descargar plantilla correcta" dentro de la alerta para obtener el formato correcto
    - Botón "Subir" se deshabilita automáticamente si hay error de validación
    - Evita intentos de subida con archivos incorrectos

### Módulo Pipeline Visual con React Flow
- **Librería**: `@xyflow/react v12.10.0` instalada en frontend
- **Estructura creada**: `frontend/src/components/FlowBuilder/`
- `types.ts` — Tipos TypeScript: FlowNodeType, datos por nodo, DataRow, NodeResult, SavedPipeline, MunicipioOption
- **6 nodos personalizados** en `nodes/`:
  - `SourceNode` (verde) — Fuente de datos: selecciona municipio y tipo de tabla
  - `FilterNode` (azul) — Filtro: múltiples condiciones con AND/OR, operadores =, !=, >, <, contains, etc.
  - `AggregateNode` (ámbar) — Agregación: sum, avg, count, min, max con agrupación opcional
  - `TransformNode` (púrpura) — Transformación: parseNumber, toUpperCase, toLowerCase, trim, concat, substring
  - `ConditionalNode` (rosa) — Condicional: bifurca flujo en dos salidas (Sí/No)
  - `OutputNode` (gris) — Salida: muestra resultados en formato tabla, JSON o conteo
- `engine.ts` — Motor de ejecución del pipeline:
  - Ordenamiento topológico de nodos
  - Ejecución secuencial con soporte para bifurcaciones condicionales
  - Obtención de datos via API (`/api/data/:slug/:tableType`)
  - Callbacks onNodeStart/onNodeDone para progreso en tiempo real
- `FlowSidebar.tsx` — Panel lateral con nodos arrastrables (drag & drop)
- `panels/NodeConfigPanel.tsx` — Panel de configuración dinámico por tipo de nodo
- `panels/ResultsPanel.tsx` — Panel de resultados expandible con tabla por nodo
- `FlowBuilder.tsx` — Componente principal:
  - Canvas React Flow con drag & drop, zoom, pan, minimap, controles
  - Toolbar con: nombre, Ejecutar, Guardar, Cargar, Limpiar
  - Lista desplegable de pipelines guardados
  - Panel de configuración al seleccionar nodo
  - Panel de resultados al ejecutar
- **Backend** (`backend/src/db/schema.ts`):
  - Nueva tabla `pipelines` (id, nombre, descripcion, flow_data JSONB, created_at, updated_at)
- **Backend** (`backend/src/routes/pipelines.ts`):
  - `GET /api/pipelines` — Listar pipelines
  - `GET /api/pipelines/:id` — Obtener pipeline
  - `POST /api/pipelines` — Crear pipeline
  - `PUT /api/pipelines/:id` — Actualizar pipeline
  - `DELETE /api/pipelines/:id` — Eliminar pipeline
- **Backend** (`backend/src/index.ts`): Registrado pipelinesRouter
- **Frontend** (`frontend/src/App.tsx`):
  - Nueva tab "Pipeline" con ícono Workflow
  - Layout full-width para pipeline, max-w-7xl para municipios
- Ejecutado `drizzle-kit push` para crear tabla pipelines en PostgreSQL
- Compilación frontend y backend verificada sin errores

### Nombres reales de columnas en tablas dinámicas
- `backend/src/db/dynamic-tables.ts`:
  - Nueva función `sanitizeColumnName`: normaliza nombres de encabezados a nombres SQL válidos (minúsculas, sin acentos, sin caracteres especiales, máx 63 chars)
  - `createMunicipioTables` ahora recibe arrays de encabezados (`string[]`) en vez de números
  - Las tablas se crean con los nombres reales sanitizados (ej: `"ciclo"`, `"servicio_suscrito_dependiente"`) en vez de `col_1`, `col_2`
- `backend/src/routes/municipios.ts`:
  - POST pasa arrays de encabezados a `createMunicipioTables`
- `backend/src/routes/upload.ts`:
  - `mapGenericRow` reemplazada por `mapRowWithHeaders` que usa nombres sanitizados del municipio
  - **Los encabezados SIEMPRE se obtienen de la BD** (campos `encabezadosFacturacion`/`encabezadosRecaudos` del municipio)
  - Los headers del CSV se ignoran completamente - solo se usa la primera línea para validar el número de columnas
  - Garantiza consistencia: los nombres de columna nunca cambian, sin importar qué encabezados tenga el CSV subido
  - Ambos endpoints (`/upload` y `/upload-data`) obtienen encabezados del municipio y los sanitizan para mapear datos
  - Import de `sanitizeColumnName` desde dynamic-tables

### Campo fecha_importacion en tablas dinámicas
- `backend/src/db/dynamic-tables.ts`:
  - Columna `fecha_importacion TIMESTAMPTZ NOT NULL DEFAULT NOW()` agregada a tablas `_facturacion` y `_recaudos`
  - Nueva función `ensureFechaImportacion`: migra tablas existentes agregando la columna si no existe
  - Nueva función `getImportDates`: retorna **timestamp completo** (fecha + hora) de cada importación con conteo de registros
  - `getTableData` ahora acepta parámetro opcional `fechaImportacion` (timestamp completo) para filtrar por importación exacta
  - **Múltiples importaciones en el mismo día son independientes**: cada subida tiene su propio timestamp único
- `backend/src/routes/upload.ts`:
  - Ambos endpoints (`/upload` y `/upload-data`) asignan `fecha_importacion` con timestamp ISO del momento exacto de importación
  - Llaman `ensureFechaImportacion` antes de insertar para migrar tablas existentes
  - Nuevo endpoint `GET /api/import-dates/:slug/:tableType` retorna timestamps únicos de importación
  - Endpoint `GET /api/data/:slug/:tableType` acepta query param `?fecha=TIMESTAMP` para filtrar por importación específica
- `frontend/src/components/DataViewer.tsx`:
  - Nuevo selector con ícono Calendar para filtrar por importación específica
  - Opciones: "Todas las importaciones" + cada timestamp con formato legible (DD/MM/YYYY HH:MM:SS) y conteo de registros
  - Permite ver hasta 3 o más importaciones del mismo día de forma **independiente**
  - Indicador visual en el conteo cuando hay filtro activo mostrando fecha y hora
  - Se resetea filtro al cambiar municipio o tipo de tabla
