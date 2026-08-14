FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# 開発環境
FROM base AS development

RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ビルドステージ
FROM base AS builder

RUN npm ci

COPY . .

# 環境変数（src/lib/axios.ts が参照する変数名に合わせる）
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL:-http://localhost:8000/api}

RUN npm run build

# 本番環境
FROM nginx:alpine AS production

# ビルド成果物をコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# 非rootユーザーで実行
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]