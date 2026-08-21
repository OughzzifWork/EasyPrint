FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma/
RUN npm ci

RUN npx prisma generate

COPY backend/tsconfig.json ./
COPY backend/src ./src/
RUN npx tsc --noEmit false --outDir dist --rootDir src --esModuleInterop --module commonjs --moduleResolution node --target ES2017 --lib esnext --resolveJsonModule --strict --skipLibCheck
RUN npx tsc --project prisma/tsconfig.json --outDir dist/prisma --esModuleInterop --module commonjs --moduleResolution node --target ES2017 --lib esnext --resolveJsonModule --strict --skipLibCheck 2>/dev/null || npx tsc prisma/seed.ts --outDir dist/prisma --esModuleInterop --module commonjs --moduleResolution node --target ES2017 --lib esnext --resolveJsonModule --strict --skipLibCheck

RUN npm prune --omit=dev

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma/
COPY backend/entrypoint.sh ./
RUN chmod +x entrypoint.sh

RUN mkdir -p /app/frontend/public/templates

EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

CMD ["./entrypoint.sh"]
