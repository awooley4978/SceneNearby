# Scene Nearby API — Fly.io image
# Bun runtime; same code as the sandbox API (:3001), driven by env vars.
FROM oven/bun:1
WORKDIR /app

# Install dependencies (frozen against bun.lock)
COPY package.json bun.lock package-lock.json ./
RUN bun install --frozen-lockfile

# Application source
COPY src ./src

ENV PORT=8080
EXPOSE 8080

# DB_DRIVER=libsql is set via fly.toml [env]; secrets via `fly secrets set`.
CMD ["bun", "run", "src/server.ts"]
