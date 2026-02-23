import { Bot } from 'grammy';
import { PushPayload, IssuePayload, PullRequestPayload } from '../types/index.js';

let bot: Bot | null = null;

// 初始化通知服务
export function initNotificationService(botInstance: Bot): void {
  bot = botInstance;
}

// 发送推送通知
export async function sendPushNotification(
  chatId: bigint,
  payload: PushPayload
): Promise<void> {
  if (!bot) {
    console.error('Bot not initialized');
    return;
  }
  
  const { repository, commits, sender, ref } = payload;
  const branch = ref.replace('refs/heads/', '');
  const commitCount = commits.length;
  
  let message = `<b>📤 New Push</b>\n\n`;
  message += `<b>Repository:</b> ${repository?.full_name}\n`;
  message += `<b>Branch:</b> ${branch}\n`;
  message += `<b>Commits:</b> ${commitCount}\n`;
  message += `<b>By:</b> ${sender?.login}\n`;
  
  if (payload.head_commit) {
    message += `\n<b>Latest commit:</b>\n`;
    message += `<a href="${payload.head_commit.url}">${payload.head_commit.id.substring(0, 7)}</a>: ${payload.head_commit.message.split('\n')[0]}`;
  }
  
  try {
    await bot.api.sendMessage(chatId.toString(), message, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  } catch (error) {
    console.error(`Failed to send push notification to ${chatId}:`, error);
  }
}

// 发送 Issue 通知
export async function sendIssueNotification(
  chatId: bigint,
  payload: IssuePayload
): Promise<void> {
  if (!bot) {
    console.error('Bot not initialized');
    return;
  }
  
  const { repository, issue, action, sender } = payload;
  
  const actionEmoji: Record<string, string> = {
    opened: '🆕',
    closed: '✅',
    reopened: '🔄',
    edited: '✏️',
    assigned: '👤',
    labeled: '🏷️',
  };
  
  const emoji = actionEmoji[action] || '📝';
  
  let message = `<b>${emoji} Issue ${action}</b>\n\n`;
  message += `<b>Repository:</b> ${repository?.full_name}\n`;
  message += `<b>Issue:</b> <a href="${issue.html_url}">#${issue.number} ${issue.title}</a>\n`;
  message += `<b>State:</b> ${issue.state}\n`;
  message += `<b>By:</b> ${sender?.login}\n`;
  
  try {
    await bot.api.sendMessage(chatId.toString(), message, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  } catch (error) {
    console.error(`Failed to send issue notification to ${chatId}:`, error);
  }
}

// 发送 Pull Request 通知
export async function sendPullRequestNotification(
  chatId: bigint,
  payload: PullRequestPayload
): Promise<void> {
  if (!bot) {
    console.error('Bot not initialized');
    return;
  }
  
  const { repository, pull_request, action, sender } = payload;
  
  const actionEmoji: Record<string, string> = {
    opened: '🆕',
    closed: pull_request.merged ? '🔀' : '❌',
    reopened: '🔄',
    edited: '✏️',
    assigned: '👤',
    labeled: '🏷️',
    merged: '🔀',
  };
  
  const emoji = actionEmoji[action] || '📝';
  const actionText = pull_request.merged ? 'merged' : action;
  
  let message = `<b>${emoji} Pull Request ${actionText}</b>\n\n`;
  message += `<b>Repository:</b> ${repository?.full_name}\n`;
  message += `<b>PR:</b> <a href="${pull_request.html_url}">#${pull_request.number} ${pull_request.title}</a>\n`;
  message += `<b>State:</b> ${pull_request.state}\n`;
  message += `<b>By:</b> ${sender?.login}\n`;
  
  try {
    await bot.api.sendMessage(chatId.toString(), message, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  } catch (error) {
    console.error(`Failed to send PR notification to ${chatId}:`, error);
  }
}

// 发送安装提示
export async function sendInstallPrompt(
  chatId: bigint,
  repoOwner: string,
  installUrl: string
): Promise<void> {
  if (!bot) {
    console.error('Bot not initialized');
    return;
  }
  
  const message = `<b>⚠️ GitHub App 未安装</b>\n\n` +
    `请在 <b>${repoOwner}</b> 组织/账户下安装 GitHub App 以接收事件通知。\n\n` +
    `<a href="${installUrl}">点击此处安装</a>`;
  
  try {
    await bot.api.sendMessage(chatId.toString(), message, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  } catch (error) {
    console.error(`Failed to send install prompt to ${chatId}:`, error);
  }
}
