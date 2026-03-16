# ── Base ──────────────────────────────────────────────────────
FROM node:22-alpine AS base
WORKDIR /workspace

# ── Dependencies (all workspaces) ─────────────────────────────
FROM base AS deps
COPY package.json package-lock.json ./
COPY backend/package.json  ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json   ./shared/
RUN npm ci --workspaces

# ── Dev target (hot-reload via bind mount) ────────────────────
FROM deps AS dev
COPY . .
EXPOSE 86 9229
CMD ["npm", "run", "dev:backend"]

# ── Prod target ───────────────────────────────────────────────
FROM base AS prod

# Install production deps only, then add tsx for TS runtime
COPY package.json package-lock.json ./
COPY backend/package.json  ./backend/
COPY frontend/package.json ./frontend/
COPY shared/package.json   ./shared/
RUN npm ci --workspaces --omit=dev && npm install tsx -w backend

# Copy only the source code needed at runtime
COPY shared/  ./shared/
COPY backend/ ./backend/

ENV NODE_ENV=production
EXPOSE 86
CMD ["npm", "run", "start:backend"]