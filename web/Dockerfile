# syntax=docker/dockerfile:1

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# O npm às vezes pula o binário nativo do Rolldown (Vite 8) no Alpine (npm/cli#4828), mesmo estando
# no lockfile. Se faltar, instala a mesma versão que o Rolldown pede.
RUN npm ci \
 && (node -e "require('@rolldown/binding-linux-x64-musl')" 2>/dev/null \
  || npm i --no-save "@rolldown/binding-linux-x64-musl@$(node -p "require('./node_modules/rolldown/package.json').version")")

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
