# Build the browser application first. Its API calls use the same origin that
# serves the app, so no Render hostname is baked into the bundle.
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Install only production API dependencies.
FROM node:20-alpine AS backend-dependencies

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --omit=dev

# The final image runs Express, which also serves the prebuilt React app.
FROM node:20-alpine

WORKDIR /app

COPY --from=backend-dependencies /app/node_modules ./node_modules
COPY backend/ ./
COPY --from=frontend-build /app/frontend/dist ./public

ENV NODE_ENV=production
ENV SERVE_FRONTEND=true

EXPOSE 5000

CMD ["node", "server.js"]
