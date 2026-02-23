import type { Context } from 'grammy';
import type { ChatType } from '../../../types/index.js';
import { getUserBinding } from '../../../github/oauth.js';
import { hasAdminPermission, isAppInstalled } from '../../../github/permissions.js';
import { upsertSubscription, getChatSubscriptions, deleteSubscription } from '../../../services/subscription.js';
import config from '../../../config/index.js';

// 解析仓库参数
function parseRepo(repoStr: string): { owner: string; repo: string } | null {
  const match = repoStr.match(/^([^/]+)\/([^/]+)$/);
  if (!match) {
    return null;
  }
  return { owner: match[1], repo: match[2] };
}

// 解析事件参数
function parseEvents(eventsStr: string): { commit: boolean; issue: boolean; pr: boolean } | null {
  const events = eventsStr.toLowerCase().split(',').map(e => e.trim());
  const result = { commit: false, issue: false, pr: false };
  
  for (const event of events) {
    if (event === 'commit') {
      result.commit = true;
    } else if (event === 'issue') {
      result.issue = true;
    } else if (event === 'pr') {
      result.pr = true;
    } else {
      return null; // 无效的事件类型
    }
  }
  
  // 至少要订阅一个事件
  if (!result.commit && !result.issue && !result.pr) {
    return null;
  }
  
  return result;
}

// 检查用户是否为群管理员
async function isGroupAdmin(ctx: Context): Promise<boolean> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  
  if (!userId || !chatId) {
    return false;
  }
  
  // 私聊直接返回 true
  if (ctx.chat?.type === 'private') {
    return true;
  }
  
  try {
    const chatMember = await ctx.api.getChatMember(chatId.toString(), userId);
    return ['creator', 'administrator'].includes(chatMember.status);
  } catch {
    return false;
  }
}

export async function handleSubscribeCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type as ChatType;
  
  if (!userId || !chatId) {
    await ctx.reply('无法获取聊天信息，请重试。');
    return;
  }
  
  // 解析参数
  const text = ctx.message?.text || '';
  const args = text.split(/\s+/).slice(1);
  
  if (args.length < 2) {
    await ctx.reply(
      '用法: /subscribe <owner/repo> <events>\n\n' +
      '事件类型: commit, issue, pr (多个用逗号分隔)\n\n' +
      '示例: /subscribe owner/repo commit,issue,pr'
    );
    return;
  }
  
  const repo = parseRepo(args[0]);
  if (!repo) {
    await ctx.reply('❌ 无效的仓库名称格式。请使用 owner/repo 格式。');
    return;
  }
  
  const events = parseEvents(args[1]);
  if (!events) {
    await ctx.reply('❌ 无效的事件类型。可用: commit, issue, pr');
    return;
  }
  
  // 检查用户是否已绑定
  const userBinding = await getUserBinding(BigInt(userId));
  if (!userBinding) {
    await ctx.reply('❌ 您还未绑定 GitHub 账户，请先使用 /bind 命令绑定。');
    return;
  }
  
  // 群聊检查管理员权限
  if (chatType !== 'private') {
    const isAdmin = await isGroupAdmin(ctx);
    if (!isAdmin) {
      await ctx.reply('❌ 只有群管理员可以订阅仓库。');
      return;
    }
  }
  
  // 检查用户对仓库的权限
  const hasPermission = await hasAdminPermission(
    userBinding.githubAccessToken,
    repo.owner,
    repo.repo
  );
  
  if (!hasPermission) {
    await ctx.reply(`❌ 您没有 ${repo.owner}/${repo.repo} 仓库的管理权限。`);
    return;
  }
  
  // 检查 GitHub App 是否已安装
  const appInstalled = await isAppInstalled(repo.owner);
  if (!appInstalled) {
    const installUrl = `https://github.com/apps/your-app-name/installations/new?state=${repo.owner}`;
    await ctx.reply(
      `❌ GitHub App 尚未安装在 ${repo.owner} 账户下。\n\n` +
      `请先安装 GitHub App: ${installUrl}`
    );
    return;
  }
  
  // 创建订阅
  await upsertSubscription(
    BigInt(chatId),
    chatType,
    repo.owner,
    repo.repo,
    events,
    BigInt(userId)
  );
  
  const subscribedEvents = [];
  if (events.commit) subscribedEvents.push('commit');
  if (events.issue) subscribedEvents.push('issue');
  if (events.pr) subscribedEvents.push('pr');
  
  await ctx.reply(
    `✅ 订阅成功！\n\n` +
    `仓库: ${repo.owner}/${repo.repo}\n` +
    `事件: ${subscribedEvents.join(', ')}\n` +
    `推送位置: ${chatType === 'private' ? '私聊' : '当前群聊'}`
  );
}

export async function handleUnsubscribeCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const chatType = ctx.chat?.type as ChatType;
  
  if (!userId || !chatId) {
    await ctx.reply('无法获取聊天信息，请重试。');
    return;
  }
  
  // 解析参数
  const text = ctx.message?.text || '';
  const args = text.split(/\s+/).slice(1);
  
  if (args.length < 1) {
    await ctx.reply('用法: /unsubscribe <owner/repo>');
    return;
  }
  
  const repo = parseRepo(args[0]);
  if (!repo) {
    await ctx.reply('❌ 无效的仓库名称格式。请使用 owner/repo 格式。');
    return;
  }
  
  // 群聊检查管理员权限
  if (chatType !== 'private') {
    const isAdmin = await isGroupAdmin(ctx);
    if (!isAdmin) {
      await ctx.reply('❌ 只有群管理员可以取消订阅。');
      return;
    }
  }
  
  // 删除订阅
  const deleted = await deleteSubscription(BigInt(chatId), repo.owner, repo.repo);
  
  if (deleted) {
    await ctx.reply(`✅ 已取消订阅 ${repo.owner}/${repo.repo}`);
  } else {
    await ctx.reply(`❌ 未找到 ${repo.owner}/${repo.repo} 的订阅。`);
  }
}

export async function handleListCommand(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  
  if (!chatId) {
    await ctx.reply('无法获取聊天信息，请重试。');
    return;
  }
  
  const subscriptions = await getChatSubscriptions(BigInt(chatId));
  
  if (subscriptions.length === 0) {
    await ctx.reply('当前没有订阅任何仓库。');
    return;
  }
  
  let message = '<b>📋 当前订阅列表</b>\n\n';
  
  for (const sub of subscriptions) {
    const events = [];
    if (sub.subscribeCommit) events.push('commit');
    if (sub.subscribeIssue) events.push('issue');
    if (sub.subscribePr) events.push('pr');
    
    message += `<b>${sub.repoOwner}/${sub.repoName}</b>\n`;
    message += `  事件: ${events.join(', ')}\n\n`;
  }
  
  await ctx.reply(message, { parse_mode: 'HTML' });
}
