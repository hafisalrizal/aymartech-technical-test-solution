FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.17.1 --activate

# Build stage
FROM base AS build
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile
COPY packages/frontend ./packages/frontend
COPY packages/shared ./packages/shared
RUN pnpm --filter frontend build

# Production stage (serve with nginx)
FROM nginx:alpine AS production
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
