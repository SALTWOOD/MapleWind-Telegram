import type { Context } from 'grammy';
import type { Hono } from 'hono';
import type { Config } from '../config/index.js';
import type prisma from '../database/client.js';

// PrismaClient 类型
type PrismaClient = typeof prisma;

// Bot 类型（使用 any 以支持不同的 Context 类型）
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Bot = import('grammy').Bot<any>;

// 日志接口
export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

// 插件上下文
export interface PluginContext {
  bot: Bot;
  app: Hono;
  prisma: PrismaClient;
  config: Config;
  logger: Logger;
}

// 命令处理器
export type CommandHandler = (ctx: Context) => Promise<void> | void;

// 插件命令
export interface PluginCommand {
  command: string;
  description: string;
  handler: CommandHandler;
}

// 路由处理器
export type RouteHandler = (c: unknown) => Promise<Response> | Response;

// 插件路由
export interface PluginRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  handler: RouteHandler;
}

// Webhook 处理器
export type WebhookHandler = (payload: unknown, event: string) => Promise<void> | void;

// 插件 Webhook
export interface PluginWebhook {
  path: string;
  handler: WebhookHandler;
}

// 插件元信息
export interface PluginMeta {
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  license?: string;
}

// 插件接口
export interface Plugin {
  // 插件元信息
  meta: PluginMeta;
  
  // 生命周期钩子
  onLoad?(context: PluginContext): Promise<void> | void;
  onEnable?(context: PluginContext): Promise<void> | void;
  onDisable?(context: PluginContext): Promise<void> | void;
  onUnload?(context: PluginContext): Promise<void> | void;
  
  // 功能注册
  commands?: PluginCommand[];
  routes?: PluginRoute[];
  webhooks?: PluginWebhook[];
}

// 插件状态
export enum PluginState {
  LOADED = 'loaded',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error',
}

// 插件信息
export interface PluginInfo {
  plugin: Plugin;
  state: PluginState;
  error?: Error;
}
