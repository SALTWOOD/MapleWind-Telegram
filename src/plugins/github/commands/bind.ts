import type { Context } from 'grammy';
import { generateOAuthUrl, storeOAuthState, isUserBound } from '../../../github/oauth.js';

export async function handleBindCommand(ctx: Context): Promise<void> {
  const telegramId = ctx.from?.id;
  
  if (!telegramId) {
    await ctx.reply('无法获取您的 Telegram ID，请重试。');
    return;
  }
  
  // 检查是否已绑定
  const bound = await isUserBound(BigInt(telegramId));
  if (bound) {
    await ctx.reply('您已经绑定了 GitHub 账户。如需重新绑定，请先联系管理员解绑。');
    return;
  }
  
  // 生成 OAuth URL
  const { url, state } = generateOAuthUrl(BigInt(telegramId));
  
  // 存储 state
  await storeOAuthState(state, BigInt(telegramId));
  
  // 私信发送绑定链接
  try {
    await ctx.api.sendMessage(
      telegramId,
      `🔗 <b>绑定 GitHub 账户</b>\n\n` +
      `请点击以下链接绑定您的 GitHub 账户：\n\n` +
      `<a href="${url}">${url}</a>\n\n` +
      `此链接 10 分钟内有效。`,
      {
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
      }
    );
    
    // 如果是在群聊中触发的命令，给出提示
    if (ctx.chat?.type !== 'private') {
      await ctx.reply('绑定链接已通过私信发送给您，请查收。');
    }
  } catch (error) {
    // 如果私信失败，可能用户没有启动与 bot 的对话
    await ctx.reply(
      '❌ 无法发送私信给您。请先点击 Bot 的"开始"按钮启动对话，然后再使用 /bind 命令。'
    );
  }
}
