import { config } from "./config";
import { decodePubSubMessage } from "./pubsub/handler";
import { getNewMessages } from "./gmail/history";
import { extractEmail, saveCapture } from "./capture";

// Track last known historyId per user
const historyIds = new Map<string, string>();

async function processNotification(emailAddress: string, historyId: number) {
  const lastHistoryId = historyIds.get(emailAddress) ?? String(historyId);
  historyIds.set(emailAddress, String(historyId));

  try {
    const messages = await getNewMessages(emailAddress, lastHistoryId);
    console.log(`[process] ${emailAddress}: ${messages.length} new message(s)`);

    for (const message of messages) {
      if (!message.id) continue;

      const captured = extractEmail(message, emailAddress);
      await saveCapture(captured);
    }
  } catch (error) {
    console.error(`[process] Error for ${emailAddress}:`, error);
  }
}

const server = Bun.serve({
  port: config.port,

  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: new Date().toISOString() });
    }

    if (url.pathname === "/webhook/gmail" && req.method === "POST") {
      const body = await req.json();
      const notification = decodePubSubMessage(body);

      if (!notification) {
        return new Response("Invalid notification", { status: 400 });
      }

      // Process async — respond to Pub/Sub immediately to avoid retries
      processNotification(notification.emailAddress, notification.historyId).catch(
        (err) => console.error("[webhook] Processing error:", err),
      );

      return new Response("OK", { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`[hvm-email] Server running on http://localhost:${server.port}`);
console.log(`[hvm-email] Webhook: POST /webhook/gmail`);
console.log(`[hvm-email] Health:  GET /health`);
console.log(`[hvm-email] Capture: ${config.captureDir}`);
