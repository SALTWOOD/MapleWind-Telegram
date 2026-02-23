import { Octokit } from '@octokit/rest';
import prisma from '../database/client.js';

// 创建用户 Octokit 实例
export function createUserOctokit(accessToken: string): Octokit {
  return new Octokit({
    auth: accessToken,
  });
}

// 检查用户对仓库的权限
export async function checkRepoPermission(
  accessToken: string,
  owner: string,
  repo: string
): Promise<'admin' | 'write' | 'read' | 'none'> {
  const octokit = createUserOctokit(accessToken);
  
  try {
    const { data } = await octokit.repos.get({
      owner,
      repo,
    });
    
    // permissions 字段在响应中
    const permissions = (data as unknown as { permissions?: { admin?: boolean; push?: boolean; pull?: boolean } }).permissions;
    
    if (permissions?.admin) {
      return 'admin';
    }
    if (permissions?.push) {
      return 'write';
    }
    if (permissions?.pull) {
      return 'read';
    }
    
    return 'none';
  } catch {
    return 'none';
  }
}

// 检查用户是否有仓库管理权限
export async function hasAdminPermission(
  accessToken: string,
  owner: string,
  repo: string
): Promise<boolean> {
  const permission = await checkRepoPermission(accessToken, owner, repo);
  return permission === 'admin' || permission === 'write';
}

// 检查 GitHub App 是否已安装在仓库
export async function isAppInstalled(owner: string): Promise<boolean> {
  const installation = await prisma.githubInstallation.findFirst({
    where: { accountLogin: owner },
  });
  return !!installation;
}

// 获取安装的 Octokit 实例
export async function getInstallationOctokit(installationId: bigint): Promise<Octokit> {
  // 使用 GitHub App 认证
  const { createAppAuth } = await import('@octokit/auth-app');
  
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    installationId: Number(installationId),
  });
  
  const { token } = await auth({ type: 'installation' });
  
  return new Octokit({
    auth: token,
  });
}

// 获取仓库的安装 ID
export async function getRepoInstallationId(owner: string): Promise<bigint | null> {
  const installation = await prisma.githubInstallation.findFirst({
    where: { accountLogin: owner },
  });
  return installation?.installationId || null;
}
