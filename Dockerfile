# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 生成 Prisma 客户端
RUN npx prisma generate

# 构建 TypeScript
RUN npm run build

# 生产阶段
FROM node:18-alpine AS runner

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production

# 复制必要文件
COPY package*.json ./
COPY prisma ./prisma/

# 安装生产依赖和 prisma CLI（用于迁移）
RUN npm ci --only=production && \
    npm install prisma --save-dev

# 生成 Prisma 客户端
RUN npx prisma generate

# 从构建阶段复制编译后的代码
COPY --from=builder /app/dist ./dist

# 复制入口脚本
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# 暴露端口
EXPOSE 3000

# 使用入口脚本
ENTRYPOINT ["docker-entrypoint.sh"]
