import express from 'express';
import clerkWebhookRouter from './webhooks/clerkWebhook';

const app = express();

// Mount the webhook router
app.use(clerkWebhookRouter);

export default app;
