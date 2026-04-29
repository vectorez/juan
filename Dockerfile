# syntax=docker/dockerfile:1.7

############################
# Stage 1: build frontend
############################
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

############################
# Stage 2: install backend deps
############################
FROM node:20-alpine AS backend-deps
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

############################
# Stage 3: runtime image
############################
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    BACKEND_PORT=3001 \
    FRONTEND_PORT=5000

RUN apk add --no-cache tini

COPY package.json package-lock.json ./
RUN npm ci

COPY backend/ ./backend/
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules

COPY frontend/package.json frontend/package-lock.json frontend/vite.config.ts ./frontend/
RUN cd frontend && npm ci --omit=dev --ignore-scripts || npm install --omit=dev --ignore-scripts

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/backend/uploads

EXPOSE 3001 5000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "node_modules/.bin/concurrently -n BACK,FRONT -c cyan,magenta \"cd backend && node_modules/.bin/tsx src/index.ts\" \"cd frontend && node_modules/.bin/vite preview --host 0.0.0.0 --port ${FRONTEND_PORT} --strictPort\""]
