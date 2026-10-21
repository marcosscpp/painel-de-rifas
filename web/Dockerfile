# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── dev: Vite com hot reload ──
FROM deps AS dev
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── build ──
FROM deps AS build
COPY . .
RUN npm run build

# ── prod: estático servido pelo Nginx ──
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
