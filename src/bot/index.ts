import { Bot, session, Context } from 'grammy';
import config from '../config/index.js';
import { SessionData } from '../types/index.js';
import { handleBindCommand } from './commands/bind.js';
import { handleSubscribeCommand, handleUnsubscribeCommand, handleListCommand } from './commands/subscribe.js';
import { handleHelpCommand, handleStartCommand } from './commands/help.js';

// 定义 BotContext 类型
export type BotContext = Context & SessionFlavor<SessionData>;

// 导入 SessionFlavor
import { SessionFlavor } from 'grammy';

// 创建 Bot 实例
const bot = new Bot<BotContext>(config.telegram.botToken);

// 初始化会话
function initialSession(): SessionData {
  return {};
}

bot.use(session({ initial: initialSession }));

// 注册命令
bot.command('start', handleStartCommand);
bot.command('help', handleHelpCommand);
bot.command('bind', handleBindCommand);
bot.command('subscribe', handleSubscribeCommand);
bot.command('unsubscribe', handleUnsubscribeCommand);
bot.command('list', handleListCommand);

// 错误处理
bot.catch((err: Error) => {
  console.error('Bot error:', err);
});

export default bot;
