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

# ── Dev target (HMR via bind mount) ──────────────────────────
FROM deps AS dev
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev:frontend"]

# ── Build stage (produces static bundle) ──────────────────────
FROM deps AS build
COPY shared/   ./shared/
COPY frontend/ ./frontend/
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN mkdir -p /build-logs && \
    npm run build -w frontend > /build-logs/frontend-build.log 2>&1 || \
    { cat /build-logs/frontend-build.log; exit 1; }

# ── Prod target (nginx serves static files + proxies API) ─────
FROM nginx:alpine AS prod
COPY --from=build /workspace/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]