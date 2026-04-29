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
    PORT=5000

RUN apk add --no-cache tini

COPY backend/ ./backend/
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules

COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN mkdir -p /app/backend/uploads

EXPOSE 5000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "cd backend && node_modules/.bin/tsx src/index.ts"]
