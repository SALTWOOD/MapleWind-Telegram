import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import http from 'http';
import https from 'https';
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

// 获取 app 实例供插件使用
export function getApp(): Hono {
  return app;
}

// 启动服务器
export function startServer() {
  const port = config.webhook.port;
  const sslConfig = config.ssl;
  
  if (sslConfig.enabled && sslConfig.cert && sslConfig.key) {
    // HTTPS 模式
    const server = https.createServer({
      cert: sslConfig.cert,
      key: sslConfig.key,
    });
    
    server.on('request', async (req, res) => {
      try {
        // 将 Node.js请求转换为 Fetch Request
        const url = `https://${req.headers.host}${req.url}`;
        const chunks: Uint8Array[] = [];
        
        for await (const chunk of req) {
          chunks.push(chunk);
        }
        
        const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
        
        const request = new Request(url, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body: body,
        });
        
        const response = await app.fetch(request);
        
        res.statusCode = response.status;
        response.headers.forEach((value: string, key: string) => {
          res.setHeader(key, value);
        });
        
        const responseBody = await response.arrayBuffer();
        res.end(Buffer.from(responseBody));
      } catch (error) {
        console.error('Request handling error:', error);
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });
    
    server.listen(port, () => {
      console.log(`🔒 HTTPS Web server started on port ${port}`);
      console.log(`📡 Webhook URL: ${config.server.url}/webhooks/github`);
      console.log(`🔐 OAuth Callback URL: ${config.server.url}/oauth/callback`);
    });
  } else {
    // HTTP 模式
    serve({
      fetch: app.fetch,
      port,
    });
    
    console.log(`🌐 HTTP Web server started on port ${port}`);
    console.log(`📡 Webhook URL: ${config.server.url}/webhooks/github`);
    console.log(`🔐 OAuth Callback URL: ${config.server.url}/oauth/callback`);
  }
  
  return app;
}

export default app;
