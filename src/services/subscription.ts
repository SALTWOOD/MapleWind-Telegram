import prisma from '../database/client.js';
import { ChatType } from '../types/index.js';

// 创建或更新订阅
export async function upsertSubscription(
  telegramChatId: bigint,
  chatType: ChatType,
  repoOwner: string,
  repoName: string,
  events: { commit: boolean; issue: boolean; pr: boolean },
  createdById: bigint
): Promise<void> {
  await prisma.chatSubscription.upsert({
    where: {
      telegramChatId_repoOwner_repoName: {
        telegramChatId,
        repoOwner,
        repoName,
      },
    },
    update: {
      subscribeCommit: events.commit,
      subscribeIssue: events.issue,
      subscribePr: events.pr,
    },
    create: {
      telegramChatId,
      chatType,
      repoOwner,
      repoName,
      subscribeCommit: events.commit,
      subscribeIssue: events.issue,
      subscribePr: events.pr,
      createdById,
    },
  });
}

// 删除订阅
export async function deleteSubscription(
  telegramChatId: bigint,
  repoOwner: string,
  repoName: string
): Promise<boolean> {
  try {
    await prisma.chatSubscription.delete({
      where: {
        telegramChatId_repoOwner_repoName: {
          telegramChatId,
          repoOwner,
          repoName,
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

// 获取聊天的所有订阅
export async function getChatSubscriptions(telegramChatId: bigint): Promise<Array<{
  repoOwner: string;
  repoName: string;
  subscribeCommit: boolean;
  subscribeIssue: boolean;
  subscribePr: boolean;
}>> {
  const subscriptions = await prisma.chatSubscription.findMany({
    where: { telegramChatId },
  });
  
  return subscriptions.map(s => ({
    repoOwner: s.repoOwner,
    repoName: s.repoName,
    subscribeCommit: s.subscribeCommit,
    subscribeIssue: s.subscribeIssue,
    subscribePr: s.subscribePr,
  }));
}

// 获取订阅某仓库的所有聊天
export async function getRepoSubscribers(
  repoOwner: string,
  repoName: string,
  eventType: 'commit' | 'issue' | 'pr'
): Promise<Array<{
  telegramChatId: bigint;
  chatType: string;
}>> {
  const whereClause: Record<string, unknown> = {
    repoOwner,
    repoName,
  };
  
  if (eventType === 'commit') {
    whereClause.subscribeCommit = true;
  } else if (eventType === 'issue') {
    whereClause.subscribeIssue = true;
  } else if (eventType === 'pr') {
    whereClause.subscribePr = true;
  }
  
  const subscriptions = await prisma.chatSubscription.findMany({
    where: whereClause,
    select: {
      telegramChatId: true,
      chatType: true,
    },
  });
  
  return subscriptions.map(s => ({
    telegramChatId: s.telegramChatId,
    chatType: s.chatType,
  }));
}

// 检查订阅是否存在
export async function subscriptionExists(
  telegramChatId: bigint,
  repoOwner: string,
  repoName: string
): Promise<boolean> {
  const count = await prisma.chatSubscription.count({
    where: {
      telegramChatId,
      repoOwner,
      repoName,
    },
  });
  return count > 0;
}
