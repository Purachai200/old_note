# ============================================================
# Multi-Stage Dockerfile for RealSync Notes & Checklist App
# Compiles Vue 3 (iOS 9 legacy transpilation) & runs Express + SQLite
# ============================================================

# --- Stage 1: Build Frontend ---
FROM node:20-bookworm-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Production Backend Server ---
FROM node:20-bookworm-slim AS runner
WORKDIR /app/backend

# Install compilation tools required by better-sqlite3 native bindings
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm install --production

# Copy backend source code
COPY backend/src ./src

# Copy compiled frontend assets from Stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Setup persistent directory for SQLite database
RUN mkdir -p /app/backend/data
VOLUME /app/backend/data

# Environment configuration
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/backend/data
ENV FRONTEND_DIST=/app/frontend/dist

EXPOSE 3000

CMD ["node", "src/server.js"]
