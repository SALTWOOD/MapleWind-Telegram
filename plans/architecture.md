# GitHub Bot 架构设计文档

## 项目概述

基于 TypeScript 的 GitHub Bot，通过 Telegram 接收命令，使用 GitHub App 接收仓库事件，并向用户/群聊推送通知。

## 技术栈

- **语言**: TypeScript
- **运行时**: Node.js
- **数据库**: PostgreSQL
- **Bot 框架**: grammy (Telegram Bot API)
- **GitHub 集成**: @octokit/webhooks + @octokit/rest
- **Web 框架**: Hono (用于接收 Webhooks 和 OAuth 回调)
- **ORM**: Prisma

## 系统架构图

```mermaid
flowchart TB
    subgraph Telegram
        TGUser[用户/群聊]
    end

    subgraph GitHubBot[GitHub Bot Service]
        TGBot[Telegram Bot Handler]
        WebServer[Web Server - Hono]
        GitHubHandler[GitHub Webhook Handler]
        OAuthHandler[OAuth Callback Handler]
        CommandHandler[Command Handler]
        NotificationService[Notification Service]
    end

    subgraph Database[(PostgreSQL)]
        UserBinding[用户绑定表]
        RepoSubscription[仓库订阅表]
        Installation[GitHub Installation 表]
    end

    subgraph GitHub
        GHApp[GitHub App]
        GHWebhook[GitHub Webhooks]
        GHOAuth[GitHub OAuth]
    end

    TGUser -->|命令| TGBot
    TGBot --> CommandHandler
    CommandHandler -->|/bind| OAuthHandler
    OAuthHandler -->|授权链接| TGUser
    TGUser -->|点击链接| GHOAuth
    GHOAuth -->|回调| OAuthHandler
    OAuthHandler --> UserBinding
    
    CommandHandler -->|/subscribe| RepoSubscription
    
    GHApp -->|安装事件| GHWebhook
    GHWebhook -->|推送| GitHubHandler
    GitHubHandler --> NotificationService
    NotificationService -->|推送通知| TGBot
    TGBot -->|消息| TGUser
```

## 数据库设计

### ER 图

```mermaid
erDiagram
    users {
        bigint id PK
        bigint telegram_id UK
        string github_id
        string github_username
        string github_access_token
        timestamp created_at
        timestamp updated_at
    }
    
    chat_subscriptions {
        bigint id PK
        bigint telegram_chat_id
        string chat_type
        string repo_owner
        string repo_name
        bigint repo_github_id
        boolean subscribe_commit
        boolean subscribe_issue
        boolean subscribe_pr
        bigint created_by_user_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    github_installations {
        bigint id PK
        bigint installation_id UK
        string account_login
        bigint account_id
        timestamp created_at
        timestamp updated_at
    }
    
    users ||--o{ chat_subscriptions : creates
```

### 表结构详细设计

#### users 表
存储 Telegram 用户与 GitHub 账户的绑定信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| telegram_id | BIGINT | Telegram 用户 ID (唯一) |
| github_id | VARCHAR(255) | GitHub 用户 ID |
| github_username | VARCHAR(255) | GitHub 用户名 |
| github_access_token | TEXT | GitHub OAuth Access Token (加密存储) |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### chat_subscriptions 表
存储群聊/私聊对仓库的订阅信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| telegram_chat_id | BIGINT | Telegram Chat ID |
| chat_type | VARCHAR(20) | private/group/supergroup |
| repo_owner | VARCHAR(255) | 仓库所有者 |
| repo_name | VARCHAR(255) | 仓库名称 |
| repo_github_id | BIGINT | GitHub 仓库 ID |
| subscribe_commit | BOOLEAN | 是否订阅 commit |
| subscribe_issue | BOOLEAN | 是否订阅 issue |
| subscribe_pr | BOOLEAN | 是否订阅 PR |
| created_by_user_id | BIGINT | 创建订阅的用户 ID (外键) |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### github_installations 表
存储 GitHub App 的安装信息。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 主键 |
| installation_id | BIGINT | GitHub Installation ID (唯一) |
| account_login | VARCHAR(255) | 安装目标的账户名 |
| account_id | BIGINT | 安装目标的账户 ID |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

## 项目目录结构

```
GitHubBot/
├── src/
│   ├── index.ts                 # 应用入口
│   ├── config/
│   │   └── index.ts             # 配置加载
│   ├── database/
│   │   ├── client.ts            # Prisma 客户端
│   │   └── migrations/          # 数据库迁移
│   ├── bot/
│   │   ├── index.ts             # Bot 入口
│   │   ├── commands/
│   │   │   ├── bind.ts          # /bind 命令
│   │   │   ├── subscribe.ts     # /subscribe 命令
│   │   │   └── help.ts          # /help 命令
│   │   └── middleware/
│   │       └── auth.ts          # 权限验证中间件
│   ├── github/
│   │   ├── oauth.ts             # GitHub OAuth 处理
│   │   ├── webhooks.ts          # Webhook 处理
│   │   ├── installation.ts      # Installation 管理
│   │   └── permissions.ts       # 权限验证
│   ├── web/
│   │   ├── server.ts            # Hono 服务器
│   │   └── routes/
│   │       ├── oauth.ts         # OAuth 回调路由
│   │       └── webhooks.ts      # Webhook 路由
│   ├── services/
│   │   ├── notification.ts      # 通知服务
│   │   └── subscription.ts      # 订阅服务
│   └── types/
│       └── index.ts             # 类型定义
├── prisma/
│   └── schema.prisma            # Prisma Schema
├── .env.example                 # 环境变量示例
├── package.json
├── tsconfig.json
└── README.md
```

## 核心流程

### 1. 用户绑定流程 (/bind)

```mermaid
sequenceDiagram
    participant User as 用户
    participant Bot as Telegram Bot
    participant Server as Web Server
    participant GitHub as GitHub OAuth
    participant DB as PostgreSQL
    
    User->>Bot: /bind
    Bot->>DB: 检查是否已绑定
    alt 未绑定
        Bot->>Server: 生成 OAuth URL (带 state)
        Server->>DB: 存储 state -> telegram_id 映射
        Bot->>User: 私信发送绑定链接
        User->>GitHub: 点击链接授权
        GitHub->>Server: OAuth 回调 (code + state)
        Server->>DB: 验证 state，获取 telegram_id
        Server->>GitHub: 用 code 换取 access_token
        Server->>DB: 存储用户绑定信息
        Server->>User: 返回绑定成功页面
        Bot->>User: 发送绑定成功消息
    else 已绑定
        Bot->>User: 提示已绑定
    end
```

### 2. 订阅仓库流程 (/subscribe)

```mermaid
sequenceDiagram
    participant User as 用户/群聊
    participant Bot as Telegram Bot
    participant GitHub as GitHub API
    participant DB as PostgreSQL
    
    User->>Bot: /subscribe owner/repo commit,issue,pr
    Bot->>DB: 检查用户是否已绑定 GitHub
    
    alt 未绑定
        Bot->>User: 请先使用 /bind 绑定 GitHub
    else 已绑定
        alt 群聊
            Bot->>Bot: 检查用户是否为群管理员
            alt 非管理员
                Bot->>User: 只有群管理员可以订阅
            end
        end
        
        Bot->>GitHub: 检查用户对仓库的权限
        alt 无权限
            Bot->>User: 您没有此仓库的管理权限
        else 有权限
            Bot->>GitHub: 检查 GitHub App 是否安装
            alt 未安装
                Bot->>User: 请先安装 GitHub App: [链接]
            else 已安装
                Bot->>DB: 创建/更新订阅记录
                Bot->>User: 订阅成功
            end
        end
    end
```

### 3. GitHub Webhook 事件推送流程

```mermaid
sequenceDiagram
    participant GitHub as GitHub
    participant Server as Web Server
    participant Handler as Webhook Handler
    participant DB as PostgreSQL
    participant Bot as Telegram Bot
    participant User as 用户/群聊
    
    GitHub->>Server: Webhook Event (push/issue/PR)
    Server->>Handler: 处理事件
    Handler->>Handler: 验证签名
    Handler->>DB: 查询订阅此仓库的 chat
    loop 每个订阅的 chat
        Handler->>Handler: 检查事件类型是否在订阅范围内
        alt 匹配订阅
            Handler->>Bot: 发送通知消息
            Bot->>User: 推送通知
        end
    end
```

## 环境变量配置

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# GitHub App
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----
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

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/oauth/callback` | GET | GitHub OAuth 回调 |
| `/webhooks/github` | POST | GitHub Webhook 接收 |

## Telegram 命令

| 命令 | 说明 | 权限 |
|------|------|------|
| `/bind` | 绑定 GitHub 账户 | 所有用户 |
| `/subscribe <repo> <events>` | 订阅仓库事件 | 私聊: 所有用户; 群聊: 管理员 |
| `/unsubscribe <repo>` | 取消订阅 | 私聊: 所有用户; 群聊: 管理员 |
| `/list` | 列出当前订阅 | 所有用户 |
| `/help` | 显示帮助信息 | 所有用户 |

## 事件类型映射

| GitHub 事件 | 订阅参数 | 触发条件 |
|-------------|----------|----------|
| push | commit | 仓库有新的推送 |
| issues | issue | Issue 创建/更新/关闭 |
| pull_request | pr | PR 创建/更新/合并/关闭 |

## 安全考虑

1. **OAuth State 防护**: 使用随机 state 参数防止 CSRF 攻击
2. **Webhook 签名验证**: 验证 GitHub Webhook 的 X-Hub-Signature-256
3. **Token 加密存储**: GitHub access_token 加密后存储
4. **权限验证**: 订阅前验证用户对仓库的管理权限
5. **群管理员验证**: 群聊中只有管理员可以执行订阅命令

## 下一步实施计划

1. 初始化 TypeScript 项目，配置依赖
2. 设置 Prisma 和数据库 Schema
3. 实现配置加载模块
4. 实现 Web 服务器和 OAuth 流程
5. 实现 Telegram Bot 和命令处理
6. 实现 GitHub Webhook 处理
7. 实现通知推送逻辑
8. 测试和文档编写
