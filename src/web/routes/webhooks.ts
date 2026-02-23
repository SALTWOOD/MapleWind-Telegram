import { Hono } from 'hono';
import webhooks from '../../github/webhooks.js';

const webhooksRouter = new Hono();

// GitHub Webhook 端点
webhooksRouter.post('/github', async (c) => {
  const signature = c.req.header('x-hub-signature-256');
  const eventName = c.req.header('x-github-event');
  const payloadId = c.req.header('x-github-delivery');
  
  if (!signature || !eventName) {
    return c.text('Missing required headers', 400);
  }
  
  try {
    const body = await c.req.text();
    
    // 验证签名并处理事件
    await webhooks.receive({
      id: payloadId || '',
      name: eventName as never,
      payload: JSON.parse(body),
    });
    
    return c.text('OK', 200);
  } catch (error) {
    if ((error as Error).message === 'signature does not match') {
      return c.text('Invalid signature', 401);
    }
    
    console.error('Webhook processing error:', error);
    return c.text('Error processing webhook', 500);
  }
});

export default webhooksRouter;
