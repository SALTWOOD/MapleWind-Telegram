import { Hono } from 'hono';
import { verifyOAuthState, exchangeCodeForToken, saveUserBinding } from '../../github/oauth.js';

const oauthRouter = new Hono();

// OAuth 回调端点
oauthRouter.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  
  if (!code || !state) {
    return c.html(`
      <html>
        <head><title>绑定失败</title></head>
        <body>
          <h1>❌ 绑定失败</h1>
          <p>缺少必要的参数，请重试。</p>
        </body>
      </html>
    `, 400);
  }
  
  // 验证 state
  const telegramId = await verifyOAuthState(state);
  if (!telegramId) {
    return c.html(`
      <html>
        <head><title>绑定失败</title></head>
        <body>
          <h1>❌ 绑定失败</h1>
          <p>授权已过期或无效，请重新使用 /bind 命令。</p>
        </body>
      </html>
    `, 400);
  }
  
  try {
    // 用 code 换取 token
    const { accessToken, githubId, githubUsername } = await exchangeCodeForToken(code);
    
    // 保存绑定信息
    await saveUserBinding(telegramId, githubId, githubUsername, accessToken);
    
    console.log(`User ${telegramId} bound to GitHub account ${githubUsername}`);
    
    return c.html(`
      <html>
        <head>
          <title>绑定成功</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .card {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
            }
            .icon { font-size: 64px; }
            h1 { color: #333; margin: 16px 0; }
            p { color: #666; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">✅</div>
            <h1>绑定成功！</h1>
            <p>您的 GitHub 账户 <strong>@${githubUsername}</strong> 已成功绑定。</p>
            <p>请返回 Telegram 继续使用 Bot。</p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    
    return c.html(`
      <html>
        <head><title>绑定失败</title></head>
        <body>
          <h1>❌ 绑定失败</h1>
          <p>发生错误，请稍后重试。</p>
        </body>
      </html>
    `, 500);
  }
});

export default oauthRouter;
