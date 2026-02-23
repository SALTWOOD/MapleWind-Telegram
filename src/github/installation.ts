import prisma from '../database/client.js';
import { InstallationPayload } from '../types/index.js';

// 处理 GitHub App 安装事件
export async function handleInstallation(payload: InstallationPayload): Promise<void> {
  const { action, installation, repositories } = payload;
  
  if (action === 'created') {
    // 新安装
    await prisma.githubInstallation.create({
      data: {
        installationId: BigInt(installation.id),
        accountLogin: installation.account.login,
        accountId: BigInt(installation.account.id),
      },
    });
    
    console.log(`GitHub App installed for ${installation.account.login}`);
  } else if (action === 'deleted') {
    // 卸载
    await prisma.githubInstallation.deleteMany({
      where: {
        installationId: BigInt(installation.id),
      },
    });
    
    // 同时删除相关的订阅
    // 注意：这里需要根据 account_login 来删除订阅
    const subscriptions = await prisma.chatSubscription.findMany({
      where: {
        repoOwner: installation.account.login,
      },
    });
    
    if (subscriptions.length > 0) {
      console.log(`Deleting ${subscriptions.length} subscriptions for ${installation.account.login}`);
    }
    
    console.log(`GitHub App uninstalled for ${installation.account.login}`);
  }
}

// 处理安装仓库变更事件
export async function handleInstallationRepositories(payload: InstallationPayload): Promise<void> {
  const { action, installation } = payload;
  
  console.log(`Installation repositories ${action} for ${installation.account.login}`);
  // 可以在这里添加更细粒度的仓库级别跟踪
}

// 获取所有安装
export async function getAllInstallations(): Promise<Array<{
  installationId: bigint;
  accountLogin: string;
}>> {
  const installations = await prisma.githubInstallation.findMany();
  return installations.map(i => ({
    installationId: i.installationId,
    accountLogin: i.accountLogin,
  }));
}
