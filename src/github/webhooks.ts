import { Webhooks, createNodeMiddleware } from '@octokit/webhooks';
import config from '../config/index.js';
import { handleInstallation, handleInstallationRepositories } from './installation.js';
import { getRepoSubscribers } from '../services/subscription.js';
import { sendPushNotification, sendIssueNotification, sendPullRequestNotification } from '../services/notification.js';
import { PushPayload, IssuePayload, PullRequestPayload, InstallationPayload } from '../types/index.js';

const webhooks = new Webhooks({
  secret: config.webhook.secret,
});

// 处理 push 事件
webhooks.on('push', async (event) => {
  const payload = event.payload as PushPayload;
  const { repository } = payload;
  
  if (!repository) return;
  
  console.log(`Received push event for ${repository.full_name}`);
  
  // 获取订阅此仓库 commit 事件的聊天
  const subscribers = await getRepoSubscribers(
    repository.owner.login,
    repository.name,
    'commit'
  );
  
  // 向所有订阅者发送通知
  for (const subscriber of subscribers) {
    await sendPushNotification(subscriber.telegramChatId, payload);
  }
});

// 处理 issues 事件
webhooks.on('issues', async (event) => {
  const payload = event.payload as IssuePayload;
  const { repository, action } = payload;
  
  if (!repository) return;
  
  console.log(`Received issues ${action} event for ${repository.full_name}`);
  
  // 只处理特定 action
  const validActions = ['opened', 'closed', 'reopened', 'edited'];
  if (!validActions.includes(action)) {
    return;
  }
  
  // 获取订阅此仓库 issue 事件的聊天
  const subscribers = await getRepoSubscribers(
    repository.owner.login,
    repository.name,
    'issue'
  );
  
  // 向所有订阅者发送通知
  for (const subscriber of subscribers) {
    await sendIssueNotification(subscriber.telegramChatId, payload);
  }
});

// 处理 pull_request 事件
webhooks.on('pull_request', async (event) => {
  const payload = event.payload as PullRequestPayload;
  const { repository, action } = payload;
  
  if (!repository) return;
  
  console.log(`Received pull_request ${action} event for ${repository.full_name}`);
  
  // 只处理特定 action
  const validActions = ['opened', 'closed', 'reopened', 'edited'];
  if (!validActions.includes(action)) {
    return;
  }
  
  // 获取订阅此仓库 pr 事件的聊天
  const subscribers = await getRepoSubscribers(
    repository.owner.login,
    repository.name,
    'pr'
  );
  
  // 向所有订阅者发送通知
  for (const subscriber of subscribers) {
    await sendPullRequestNotification(subscriber.telegramChatId, payload);
  }
});

// 处理 installation 事件
webhooks.on('installation', async (event) => {
  const payload = event.payload as unknown as InstallationPayload;
  await handleInstallation(payload);
});

// 处理 installation_repositories 事件
webhooks.on('installation_repositories', async (event) => {
  const payload = event.payload as unknown as InstallationPayload;
  await handleInstallationRepositories(payload);
});

// 错误处理
webhooks.onError((error) => {
  console.error('Webhook error:', error);
});

export default webhooks;
export { createNodeMiddleware };
