FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

# Build stage
FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/backend/package.json ./packages/backend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY packages/backend ./packages/backend
COPY packages/shared ./packages/shared
RUN pnpm --filter backend build

# Production stage
FROM base AS production
WORKDIR /app
COPY --from=build /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/package.json ./
COPY --from=build /app/packages/backend/package.json ./packages/backend/
COPY --from=build /app/packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=build /app/packages/shared ./packages/shared
WORKDIR /app/packages/backend
EXPOSE 3000
CMD ["node", "dist/main.js"]
