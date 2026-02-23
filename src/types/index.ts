import { Context, SessionFlavor } from 'grammy';

// 会话数据类型
export interface SessionData {
  userId?: bigint;
  githubUsername?: string;
}

// 自定义 Context 类型
export type BotContext = Context & SessionFlavor<SessionData>;

// 聊天类型
export type ChatType = 'private' | 'group' | 'supergroup';

// 订阅事件类型
export interface SubscriptionEvents {
  commit: boolean;
  issue: boolean;
  pr: boolean;
}

// GitHub Webhook 事件类型
export type GitHubEventType = 
  | 'push'
  | 'issues'
  | 'pull_request'
  | 'installation'
  | 'installation_repositories';

// Webhook 事件载荷基础类型
export interface WebhookPayload {
  action?: string;
  repository?: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
      id: number;
    };
  };
  sender?: {
    login: string;
    id: number;
  };
}

// Push 事件
export interface PushPayload extends WebhookPayload {
  ref: string;
  commits: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    url: string;
  }>;
  head_commit?: {
    id: string;
    message: string;
    author: {
      name: string;
    };
    url: string;
  };
}

// Issue 事件
export interface IssuePayload extends WebhookPayload {
  action: 'opened' | 'edited' | 'closed' | 'reopened' | 'assigned' | 'labeled';
  issue: {
    number: number;
    title: string;
    html_url: string;
    state: string;
    user: {
      login: string;
    };
  };
}

// Pull Request 事件
export interface PullRequestPayload extends WebhookPayload {
  action: 'opened' | 'edited' | 'closed' | 'reopened' | 'assigned' | 'labeled' | 'merged';
  pull_request: {
    number: number;
    title: string;
    html_url: string;
    state: string;
    user: {
      login: string;
    };
    merged?: boolean;
  };
}

// Installation 事件
export interface InstallationPayload extends WebhookPayload {
  action: 'created' | 'deleted' | 'suspend' | 'unsuspend' | 'added' | 'removed' | 'new_permissions_accepted';
  installation: {
    id: number;
    account: {
      login: string;
      id: number;
    };
  };
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
  }>;
}
