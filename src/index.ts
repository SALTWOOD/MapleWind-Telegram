import 'dotenv/config';
import bot from './bot/index.js';
import { startServer, getApp } from './web/server.js';
import prisma from './database/client.js';
import config from './config/index.js';
import { pluginManager } from './core/plugin-manager.js';
import { githubPlugin } from './plugins/index.js';
import { logger } from './core/logger.js';

async function main() {
  logger.info('Starting GitHub Bot...');
  
  // 测试数据库连接
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    process.exit(1);
  }
  
  // 启动 Web 服务器
  startServer();
  
  // 获取 app 实例
  const app = getApp();
  
  // 设置插件管理器的 Bot 和 App 实例
  pluginManager.setInstances(bot, app);
  
  // 注册插件
  pluginManager.register(githubPlugin);
  
  // 启用所有插件
  await pluginManager.enableAll();
  
  // 启动 Bot
  try {
    await bot.start();
    logger.info('Telegram Bot started');
    logger.info(`Bot username: @${bot.botInfo.username}`);
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
  
  // 优雅关闭
  const shutdown = async () => {
    logger.info('Shutting down...');
    await bot.stop();
    await prisma.$disconnect();
    logger.info('Goodbye!');
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
