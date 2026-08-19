FROM node:20-alpine AS base

RUN apk add --no-cache sh

WORKDIR /app

COPY backend/package.json backend/package-lock.json ./
RUN npm ci

COPY backend/prisma ./prisma/
RUN npx prisma generate

COPY backend/tsconfig.json ./
COPY backend/src ./src/
COPY backend/entrypoint.sh ./
RUN chmod +x entrypoint.sh

RUN mkdir -p /app/frontend/public/templates

EXPOSE 4000

CMD ["./entrypoint.sh"]
