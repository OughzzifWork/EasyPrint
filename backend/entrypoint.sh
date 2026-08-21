#!/bin/sh
set -e

echo "[Backend] Running Prisma migrations..."
npx prisma migrate deploy

echo "[Backend] Seeding database..."
node dist/prisma/seed.js 2>/dev/null || true

echo "[Backend] Starting server..."
exec node dist/index.js
