# syntax=docker/dockerfile:1.6

# ---------- Stage 1: build del frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY frontend/ ./
RUN pnpm run build


# ---------- Stage 2: dependencias del backend ----------
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY backend/package.json backend/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY backend/ ./


# ---------- Stage 3: imagen final ----------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3001 \
    FRONTEND_PORT=5000

RUN corepack enable && corepack prepare pnpm@latest --activate \
    && pnpm add -g concurrently serve

COPY --from=backend-deps  /app/backend          ./backend
COPY --from=frontend-build /app/frontend/dist   ./frontend/dist

EXPOSE 3001 5000

CMD ["sh", "-c", "concurrently -n BACK,FRONT -c cyan,magenta \"cd backend && node_modules/.bin/tsx src/index.ts\" \"serve -s frontend/dist -l ${FRONTEND_PORT}\""]
