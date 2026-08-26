FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY backend/package.json ./backend/package.json
COPY packages/catalog-contracts ./packages/catalog-contracts
RUN npm install --workspace @transporte-seguro/api --workspace @transporte-seguro/catalog-contracts
COPY backend ./backend
RUN npm run build --workspace @transporte-seguro/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/src/db/migrations ./backend/dist/db/migrations
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/packages ./packages
RUN mkdir -p /data/public /data/private
EXPOSE 3001
CMD ["sh", "-c", "node backend/dist/db/migrate.js && node backend/dist/main.js"]
