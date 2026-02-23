import { Bot, session } from 'grammy';
import config from '../config/index.js';
import { SessionData } from '../types/index.js';
import { initNotificationService } from '../services/notification.js';

// 定义 BotContext 类型
export type BotContext = Context & SessionFlavor<SessionData>;

// 导入类型
import { Context, SessionFlavor } from 'grammy';

// 创建 Bot 实例
const bot = new Bot<BotContext>(config.telegram.botToken);

// 初始化会话
function initialSession(): SessionData {
  return {};
}

bot.use(session({ initial: initialSession }));

// 错误处理
bot.catch((err: Error) => {
  console.error('Bot error:', err);
});

// 初始化通知服务
initNotificationService(bot);

export default bot;
