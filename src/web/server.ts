import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import config from '../config/index.js';
import oauthRouter from './routes/oauth.js';
import webhooksRouter from './routes/webhooks.js';

const app = new Hono();

// CORS 中间件
app.use('/*', cors());

// 健康检查
app.get('/', (c) => {
  return c.json({ status: 'ok', service: 'GitHub Bot' });
});

// 注册路由
app.route('/oauth', oauthRouter);
app.route('/webhooks', webhooksRouter);

// 启动服务器
export function startServer() {
  const port = config.webhook.port;
  
  serve({
    fetch: app.fetch,
    port,
  });
  
  console.log(`🌐 Web server started on port ${port}`);
  console.log(`📡 Webhook URL: ${config.server.url}/webhooks/github`);
  console.log(`🔐 OAuth Callback URL: ${config.server.url}/oauth/callback`);
  
  return app;
}

export default app;
