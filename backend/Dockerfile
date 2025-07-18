# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && \
    corepack prepare pnpm@8.15.4 --activate && \
    npm install -g typescript

# 1. Copy only package files first (better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

# 2. Install all dependencies
RUN pnpm install --frozen-lockfile

# 3. Copy only necessary source code
COPY backend ./backend
COPY shared ./shared

# 4. Build the application
RUN pnpm --filter @trackflow/shared run build && \
    pnpm --filter backend run build

# Stage 2: Create production image
FROM node:20-alpine

WORKDIR /app

# 1. Copy only necessary files for production
# Copy root + backend + shared metadata
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/backend/package.json ./backend/
COPY --from=builder /app/shared/package.json ./shared/

# Copy built artifacts
COPY --from=builder /app/backend/dist ./dist

# 2. Install only production dependencies for backend
RUN corepack enable && \
    corepack prepare pnpm@8.15.4 --activate && \
    pnpm install --prod --frozen-lockfile --filter ./backend...

# 3. Set up non-root user
RUN addgroup -S appgroup && \
    adduser -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

# 4. Set environment and run
ENV NODE_ENV=production PORT=8000 NODE_PATH=./backend/node_modules:./node_modules
EXPOSE 8000
USER appuser
CMD ["node", "dist/backend/src/main.js"]
# CMD ["sh", "-c", "tree -L 2 /app"]
