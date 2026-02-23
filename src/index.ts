import 'dotenv/config';
import bot from './bot/index.js';
import { startServer } from './web/server.js';
import prisma from './database/client.js';
import config from './config/index.js';

async function main() {
  console.log('🚀 Starting GitHub Bot...');
  
  // 测试数据库连接
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }
  
  // 启动 Web 服务器
  startServer();
  
  // 启动 Bot
  try {
    await bot.start();
    console.log('🤖 Telegram Bot started');
    console.log(`Bot username: @${bot.botInfo.username}`);
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
  
  // 优雅关闭
  const shutdown = async () => {
    console.log('\n🛑 Shutting down...');
    await bot.stop();
    await prisma.$disconnect();
    console.log('👋 Goodbye!');
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
