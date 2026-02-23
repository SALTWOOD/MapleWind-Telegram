import { BotContext } from '../../types/index.js';

export async function handleHelpCommand(ctx: BotContext): Promise<void> {
  const message = `<b>🤖 GitHub Bot 帮助</b>

<b>可用命令:</b>

<b>/bind</b> - 绑定 GitHub 账户
  首次使用需要绑定您的 GitHub 账户

<b>/subscribe <owner/repo> <events></b> - 订阅仓库事件
  订阅指定仓库的更新通知
  事件类型: commit, issue, pr (多个用逗号分隔)
  示例: /subscribe owner/repo commit,issue,pr

<b>/unsubscribe <owner/repo></b> - 取消订阅
  取消对指定仓库的订阅

<b>/list</b> - 查看订阅列表
  显示当前聊天中的所有订阅

<b>/help</b> - 显示帮助信息

<b>注意事项:</b>
• 群聊中只有管理员可以执行订阅命令
• 订阅前需要先绑定 GitHub 账户
• 需要对仓库有管理权限才能订阅
• GitHub App 需要安装在仓库所属账户下

<b>事件说明:</b>
• <b>commit</b> - 代码推送通知
• <b>issue</b> - Issue 创建/更新/关闭通知
• <b>pr</b> - Pull Request 创建/合并/关闭通知`;

  await ctx.reply(message, { parse_mode: 'HTML' });
}

export async function handleStartCommand(ctx: BotContext): Promise<void> {
  const userName = ctx.from?.first_name || '用户';
  
  const message = `<b>👋 欢迎使用 GitHub Bot, ${userName}!</b>

这个 Bot 可以帮助您在 Telegram 中接收 GitHub 仓库的更新通知。

<b>快速开始:</b>
1. 使用 /bind 命令绑定您的 GitHub 账户
2. 使用 /subscribe 命令订阅仓库事件
3. 当仓库有更新时，您将收到通知

使用 /help 查看完整命令列表。`;

  await ctx.reply(message, { parse_mode: 'HTML' });
}
