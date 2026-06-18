# Stage 1: Build the application
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve the application
FROM node:24-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh
RUN chmod +x ./scripts/docker-entrypoint.sh

EXPOSE 3000
CMD ["sh", "./scripts/docker-entrypoint.sh"]
