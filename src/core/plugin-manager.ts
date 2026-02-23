import type { Context } from 'grammy';
import type { Hono } from 'hono';
import type { Plugin, PluginContext, PluginInfo, PluginCommand, Bot } from './plugin-interface.js';
import { PluginState } from './plugin-interface.js';
import { createLogger, logger } from './logger.js';
import config from '../config/index.js';
import prisma from '../database/client.js';

// 插件管理器
export class PluginManager {
  private plugins: Map<string, PluginInfo> = new Map();
  private bot: Bot | null = null;
  private app: Hono | null = null;
  
  // 注册插件
  register(plugin: Plugin): void {
    if (this.plugins.has(plugin.meta.name)) {
      logger.warn(`Plugin ${plugin.meta.name} is already registered`);
      return;
    }
    
    this.plugins.set(plugin.meta.name, {
      plugin,
      state: PluginState.LOADED,
    });
    
    logger.info(`Plugin registered: ${plugin.meta.name} v${plugin.meta.version}`);
  }
  
  // 设置 Bot 和 App 实例
  setInstances(bot: Bot, app: Hono): void {
    this.bot = bot;
    this.app = app;
  }
  
  // 创建插件上下文
  private createContext(pluginName: string): PluginContext {
    return {
      bot: this.bot!,
      app: this.app!,
      prisma,
      config,
      logger: createLogger(pluginName),
    };
  }
  
  // 启用插件
  async enable(pluginName: string): Promise<boolean> {
    const info = this.plugins.get(pluginName);
    if (!info) {
      logger.error(`Plugin ${pluginName} not found`);
      return false;
    }
    
    if (info.state === PluginState.ENABLED) {
      logger.warn(`Plugin ${pluginName} is already enabled`);
      return true;
    }
    
    try {
      const context = this.createContext(pluginName);
      
      // 调用 onEnable 钩子
      if (info.plugin.onEnable) {
        await info.plugin.onEnable(context);
      }
      
      // 注册命令
      if (info.plugin.commands) {
        for (const cmd of info.plugin.commands) {
          this.registerCommand(cmd);
        }
      }
      
      // 注册路由
      if (info.plugin.routes && this.app) {
        for (const route of info.plugin.routes) {
          this.registerRoute(route);
        }
      }
      
      info.state = PluginState.ENABLED;
      info.error = undefined;
      
      logger.info(`Plugin ${pluginName} enabled`);
      return true;
    } catch (error) {
      info.state = PluginState.ERROR;
      info.error = error as Error;
      logger.error(`Failed to enable plugin ${pluginName}:`, error);
      return false;
    }
  }
  
  // 禁用插件
  async disable(pluginName: string): Promise<boolean> {
    const info = this.plugins.get(pluginName);
    if (!info) {
      logger.error(`Plugin ${pluginName} not found`);
      return false;
    }
    
    if (info.state !== PluginState.ENABLED) {
      logger.warn(`Plugin ${pluginName} is not enabled`);
      return true;
    }
    
    try {
      const context = this.createContext(pluginName);
      
      // 调用 onDisable 钩子
      if (info.plugin.onDisable) {
        await info.plugin.onDisable(context);
      }
      
      // 注意：命令和路由无法动态注销，需要重启服务
      
      info.state = PluginState.DISABLED;
      logger.info(`Plugin ${pluginName} disabled`);
      return true;
    } catch (error) {
      info.state = PluginState.ERROR;
      info.error = error as Error;
      logger.error(`Failed to disable plugin ${pluginName}:`, error);
      return false;
    }
  }
  
  // 注册命令
  private registerCommand(cmd: PluginCommand): void {
    if (!this.bot) {
      logger.error('Bot instance not set');
      return;
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.bot.command(cmd.command, async (ctx: any) => {
      try {
        await cmd.handler(ctx);
      } catch (error) {
        logger.error(`Error in command /${cmd.command}:`, error);
        await ctx.reply('An error occurred while processing your command.');
      }
    });
    
    logger.debug(`Command registered: /${cmd.command}`);
  }
  
  // 注册路由
  private registerRoute(route: { method: string; path: string; handler: unknown }): void {
    if (!this.app) {
      logger.error('App instance not set');
      return;
    }
    
    const path = `/plugins${route.path}`;
    
    switch (route.method) {
      case 'GET':
        this.app.get(path, (c) => (route.handler as (c: unknown) => Promise<Response> | Response)(c));
        break;
      case 'POST':
        this.app.post(path, (c) => (route.handler as (c: unknown) => Promise<Response> | Response)(c));
        break;
      case 'PUT':
        this.app.put(path, (c) => (route.handler as (c: unknown) => Promise<Response> | Response)(c));
        break;
      case 'DELETE':
        this.app.delete(path, (c) => (route.handler as (c: unknown) => Promise<Response> | Response)(c));
        break;
      case 'PATCH':
        this.app.patch(path, (c) => (route.handler as (c: unknown) => Promise<Response> | Response)(c));
        break;
    }
    
    logger.debug(`Route registered: ${route.method} ${path}`);
  }
  
  // 启用所有已注册的插件
  async enableAll(): Promise<void> {
    const enabledPlugins = config.plugins.enabled;
    
    for (const [name, info] of this.plugins) {
      // 如果配置了启用列表，只启用列表中的插件
      if (enabledPlugins.length > 0 && !enabledPlugins.includes(name)) {
        logger.debug(`Skipping plugin ${name} (not in enabled list)`);
        continue;
      }
      
      await this.enable(name);
    }
  }
  
  // 获取插件信息
  getPlugin(name: string): PluginInfo | undefined {
    return this.plugins.get(name);
  }
  
  // 获取所有插件
  getAllPlugins(): PluginInfo[] {
    return Array.from(this.plugins.values());
  }
  
  // 获取插件状态
  getState(name: string): PluginState | undefined {
    return this.plugins.get(name)?.state;
  }
}

// 全局插件管理器实例
export const pluginManager = new PluginManager();
