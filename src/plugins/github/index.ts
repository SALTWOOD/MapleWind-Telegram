import type { Plugin, PluginContext } from '../../core/plugin-interface.js';
import { handleBindCommand } from './commands/bind.js';
import { handleSubscribeCommand, handleUnsubscribeCommand, handleListCommand } from './commands/subscribe.js';
import { handleHelpCommand, handleStartCommand } from './commands/help.js';
import { setupWebhooks } from './webhooks.js';
import { setupRoutes } from './routes.js';

export const githubPlugin: Plugin = {
  meta: {
    name: 'github',
    version: '1.0.0',
    description: 'GitHub notification plugin for Telegram Bot',
    author: 'GitHub Bot',
    license: 'MIT',
  },
  
  async onEnable(context: PluginContext) {
    context.logger.info('GitHub plugin enabling...');
    
    // 设置 Webhooks
    setupWebhooks(context);
    
    // 设置路由
    setupRoutes(context);
    
    context.logger.info('GitHub plugin enabled successfully');
  },
  
  async onDisable(context: PluginContext) {
    context.logger.info('GitHub plugin disabled');
  },
  
  commands: [
    {
      command: 'start',
      description: '开始使用 Bot',
      handler: handleStartCommand,
    },
    {
      command: 'help',
      description: '显示帮助信息',
      handler: handleHelpCommand,
    },
    {
      command: 'bind',
      description: '绑定 GitHub 账户',
      handler: handleBindCommand,
    },
    {
      command: 'subscribe',
      description: '订阅仓库事件 (用法: /subscribe owner/repo commit,issue,pr)',
      handler: handleSubscribeCommand,
    },
    {
      command: 'unsubscribe',
      description: '取消订阅仓库',
      handler: handleUnsubscribeCommand,
    },
    {
      command: 'list',
      description: '查看订阅列表',
      handler: handleListCommand,
    },
  ],
};

export default githubPlugin;
