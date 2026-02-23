# GitHub Bot

基于 TypeScript 的 GitHub Bot，通过 Telegram 接收命令，使用 GitHub App 接收仓库事件，并向用户/群聊推送通知。

## 功能特性

- 🔗 **GitHub 账户绑定**：通过 OAuth 将 Telegram 账户与 GitHub 账户关联
- 📬 **仓库订阅**：订阅仓库的 commit、issue、pull request 事件
- 📢 **群聊支持**：支持在群聊中订阅，只有管理员可以执行订阅命令
- 🔔 **实时通知**：通过 GitHub Webhooks 接收事件并推送通知

## 快速开始

### 1. 前置要求

- Node.js 18+
- PostgreSQL 数据库
- Telegram Bot Token
- GitHub App

### 2. 创建 Telegram Bot

1. 在 Telegram 中找到 [@BotFather](https://t.me/botfather)
2. 发送 `/newbot` 命令
3. 按提示设置 Bot 名称
4. 保存返回的 Bot Token

### 3. 创建 GitHub App

1. 访问 GitHub Settings > Developer settings > GitHub Apps
2. 点击 "New GitHub App"
3. 填写以下信息：
   - **GitHub App name**: 你的 App 名称
   - **Homepage URL**: 你的服务器地址
   - **Webhook URL**: `https://your-domain/webhooks/github`
   - **Webhook secret**: 自定义一个密钥
4. 设置权限：
   - **Repository permissions**:
     - Contents: Read-only
     - Issues: Read-only
     - Pull requests: Read-only
   - **Subscribe to events**:
     - Push
     - Issues
     - Pull request
5. 创建后，记录以下信息：
   - App ID
   - Client ID
   - Client Secret（需要生成）
   - Private Key（需要生成）

### 4. 安装依赖

```bash
npm install
```

### 5. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# GitHub App
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_CLIENT_ID=your_github_app_client_id
GITHUB_APP_CLIENT_SECRET=your_github_app_client_secret

# OAuth
OAUTH_REDIRECT_URL=http://your-domain/oauth/callback

# Webhook
WEBHOOK_SECRET=your_webhook_secret
WEBHOOK_PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/github_bot

# Server
SERVER_URL=http://your-domain
```

### 6. 初始化数据库

```bash
# 生成 Prisma 客户端
npm run db:generate

# 推送数据库 Schema
npm run db:push
```

### 7. 启动服务

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 使用说明

### Bot 命令

| 命令 | 说明 | 示例 |
|------|------|------|
| `/start` | 开始使用 Bot | `/start` |
| `/bind` | 绑定 GitHub 账户 | `/bind` |
| `/subscribe` | 订阅仓库事件 | `/subscribe owner/repo commit,issue,pr` |
| `/unsubscribe` | 取消订阅 | `/unsubscribe owner/repo` |
| `/list` | 查看订阅列表 | `/list` |
| `/help` | 显示帮助信息 | `/help` |

### 事件类型

| 事件 | 说明 |
|------|------|
| `commit` | 代码推送通知 |
| `issue` | Issue 创建/更新/关闭通知 |
| `pr` | Pull Request 创建/合并/关闭通知 |

### 使用流程

1. **绑定账户**：发送 `/bind` 命令，点击私聊中的链接完成 GitHub OAuth 授权
2. **订阅仓库**：发送 `/subscribe owner/repo commit,issue,pr` 订阅感兴趣的仓库和事件
3. **接收通知**：当仓库有更新时，Bot 会自动推送通知到订阅的聊天

## 项目结构

```
GitHubBot/
├── src/
│   ├── index.ts                 # 应用入口
│   ├── config/                  # 配置加载
│   ├── database/                # 数据库连接
│   ├── bot/                     # Telegram Bot
│   │   ├── commands/            # 命令处理
│   │   └── index.ts             # Bot 入口
│   ├── github/                  # GitHub 集成
│   │   ├── oauth.ts             # OAuth 处理
│   │   ├── webhooks.ts          # Webhook 处理
│   │   ├── installation.ts      # Installation 管理
│   │   └── permissions.ts       # 权限验证
│   ├── services/                # 业务服务
│   │   ├── notification.ts      # 通知服务
│   │   └── subscription.ts      # 订阅服务
│   ├── web/                     # Web 服务器
│   │   ├── server.ts            # Hono 服务器
│   │   └── routes/              # 路由
│   └── types/                   # 类型定义
├── prisma/
│   └── schema.prisma            # 数据库 Schema
├── plans/
│   └── architecture.md          # 架构设计文档
├── .env.example                 # 环境变量示例
├── package.json
├── tsconfig.json
└── README.md
```

## 部署

### Docker 部署

使用 Docker Compose 一键启动：

```bash
# 构建并启动
docker-compose -f docker-compose.dev.yml up -d --build

# 查看日志
docker-compose -f docker-compose.dev.yml logs -f

# 停止服务
docker-compose -f docker-compose.dev.yml down
```

服务包含：
- **app**: GitHub Bot 应用（端口 3000）
- **db**: PostgreSQL 数据库（端口 5432）

### 注意事项

1. 确保服务器可以被 GitHub 访问（用于接收 Webhooks）
2. 配置 HTTPS（GitHub Webhooks 需要）
3. 定期备份数据库

## License

MIT
