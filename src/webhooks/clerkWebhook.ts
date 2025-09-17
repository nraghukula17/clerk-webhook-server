import express, { Request, Response } from "express";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/backend";

const router = express.Router();

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || "";

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

const handler = async (req: Request, res: Response) => {
  try {
    const payload = req.body.toString("utf8");
    const headers = normalizeHeaders(req.headers);

    const wh = new Webhook(CLERK_WEBHOOK_SECRET);
    const evt = wh.verify(payload, headers) as WebhookEvent;

    console.log("✅ Clerk Webhook Event:", evt.type, evt.data);

    if (evt.type === "user.created") {
      const userId = (evt.data as any).id;
      console.log("New user created:", userId);
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("❌ Error verifying webhook:", err);
    res.status(400).json({ success: false, error: "Invalid webhook" });
  }
};

// Support both routes
router.post("/webhooks/clerk", express.raw({ type: "application/json" }), handler);
router.post("/clerk-webhook", express.raw({ type: "application/json" }), handler);

export default router;
