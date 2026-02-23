import { nanoid } from 'nanoid';
import config from '../config/index.js';
import prisma from '../database/client.js';

// 生成 OAuth 授权 URL
export function generateOAuthUrl(telegramId: bigint): { url: string; state: string } {
  const state = nanoid(32);
  const redirectUri = encodeURIComponent(config.oauth.redirectUrl);
  
  const url = `https://github.com/login/oauth/authorize?client_id=${config.github.clientId}&redirect_uri=${redirectUri}&state=${state}&scope=repo,read:org`;
  
  return { url, state };
}

// 存储 OAuth state
export async function storeOAuthState(state: string, telegramId: bigint): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 分钟过期
  
  await prisma.oAuthState.create({
    data: {
      state,
      telegramId,
      expiresAt,
    },
  });
}

// 验证并获取 OAuth state
export async function verifyOAuthState(state: string): Promise<bigint | null> {
  const oauthState = await prisma.oAuthState.findUnique({
    where: { state },
  });
  
  if (!oauthState) {
    return null;
  }
  
  // 检查是否过期
  if (oauthState.expiresAt < new Date()) {
    await prisma.oAuthState.delete({ where: { state } });
    return null;
  }
  
  // 删除已使用的 state
  await prisma.oAuthState.delete({ where: { state } });
  
  return oauthState.telegramId;
}

// 用 code 换取 access token
export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  githubId: string;
  githubUsername: string;
}> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: config.github.clientId,
      client_secret: config.github.clientSecret,
      code,
    }),
  });
  
  const data = await response.json() as { access_token?: string; error?: string };
  
  if (data.error || !data.access_token) {
    throw new Error(`GitHub OAuth error: ${data.error || 'No access token'}`);
  }
  
  const accessToken = data.access_token;
  
  // 获取用户信息
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });
  
  const userData = await userResponse.json() as { id: number; login: string };
  
  return {
    accessToken,
    githubId: userData.id.toString(),
    githubUsername: userData.login,
  };
}

// 保存用户绑定信息
export async function saveUserBinding(
  telegramId: bigint,
  githubId: string,
  githubUsername: string,
  accessToken: string
): Promise<void> {
  await prisma.user.upsert({
    where: { telegramId },
    update: {
      githubId,
      githubUsername,
      githubAccessToken: accessToken,
    },
    create: {
      telegramId,
      githubId,
      githubUsername,
      githubAccessToken: accessToken,
    },
  });
}

// 检查用户是否已绑定
export async function isUserBound(telegramId: bigint): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });
  return !!user && !!user.githubAccessToken;
}

// 获取用户绑定信息
export async function getUserBinding(telegramId: bigint): Promise<{
  githubId: string;
  githubUsername: string;
  githubAccessToken: string;
} | null> {
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });
  
  if (!user || !user.githubAccessToken) {
    return null;
  }
  
  return {
    githubId: user.githubId!,
    githubUsername: user.githubUsername!,
    githubAccessToken: user.githubAccessToken,
  };
}
