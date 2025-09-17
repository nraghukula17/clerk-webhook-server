import express from 'express';
import { Webhook as SvixWebhook } from 'svix';
import { Clerk } from '@clerk/clerk-sdk-node';

const router = express.Router();

// ✅ Explicitly initialize Clerk client with your DEV secret key
const clerkClient = Clerk({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

router.post('/clerk-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('📬 Incoming webhook received');

  const payload = req.body;
  const headers = req.headers;

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("❌ Missing CLERK_WEBHOOK_SECRET env var");
    return res.status(500).send("Server misconfiguration");
  }

  const svixId = headers['svix-id'] as string | undefined;
  const svixTimestamp = headers['svix-timestamp'] as string | undefined;
  const svixSignature = headers['svix-signature'] as string | undefined;

  if (!svixId || !svixTimestamp || !svixSignature) {
    console.error("❗️ Missing Svix headers", { svixId, svixTimestamp, svixSignature });
    return res.status(400).send("Missing Svix headers");
  }

  let evt: any;

  try {
    const wh = new SvixWebhook(webhookSecret);
    evt = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });

    console.log("✅ Webhook verified:", evt.type);
  } catch (err) {
    console.error("❌ Webhook verification failed:", err);
    return res.status(400).send("Invalid signature");
  }

  if (evt?.type === 'user.created') {
    const userId = evt.data?.id;
    console.log("📥 Received user.created for user ID:", userId);

    if (!userId) {
      return res.status(400).send("User ID missing in event");
    }

    try {
      await clerkClient.users.updateUserMetadata(userId, {
        publicMetadata: {
          role: 'student',
        },
      });
      console.log(`✅ Role "student" assigned to user ${userId}`);
    } catch (err) {
      console.error("❌ Failed to update Clerk user metadata:", err);
      return res.status(500).send("Failed to update user metadata");
    }
  } else {
    console.log(`ℹ️ Ignored event type: ${evt?.type}`);
  }

  return res.status(200).json({ success: true });
});

export default router;
