// src/webhooks/clerkWebhook.ts

import express, { Request, Response } from "express";
import { Webhook } from "svix";
import { createClerkClient, WebhookEvent } from "@clerk/backend";

const router = express.Router();

// Create Clerk client using the backend SDK
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
});

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
if (!CLERK_WEBHOOK_SECRET) {
  console.error("❌ Missing CLERK_WEBHOOK_SECRET in env vars");
}

// Normalize headers for Svix verification
function normalizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      out[key] = value.join(",");
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

// Webhook route
router.post(
  "/webhooks/clerk",
  express.raw({ type: "application/json" }), // raw body required for svix
  async (req: Request, res: Response) => {
    try {
      if (!CLERK_WEBHOOK_SECRET) {
        return res.status(500).json({ error: "Missing Clerk webhook secret" });
      }

      const payload = req.body.toString("utf8");
      const headers = normalizeHeaders(req.headers);

      const wh = new Webhook(CLERK_WEBHOOK_SECRET);
      const evt = wh.verify(payload, headers) as WebhookEvent;

      console.log("🔔 Clerk Webhook Received:", evt.type);

      if (evt.type === "user.created") {
        const userId = evt.data.id;
        console.log("👤 New Clerk user created:", userId);

        await clerkClient.users.updateUser(userId, {
          publicMetadata: { role: "student" },
        });

        console.log("✅ Assigned role 'student' to", userId);
      }

      res.status(200).json({ success: true });
    } catch (err) {
      console.error("❌ Clerk webhook error:", err);
      res.status(400).json({ error: "Invalid webhook" });
    }
  }
);

export default router;
