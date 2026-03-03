import { PubSub } from "@google-cloud/pubsub";
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

// Set up Pub/Sub pull subscriber
const credentials = JSON.parse(config.googleServiceAccountKey);
const pubsub = new PubSub({
  projectId: credentials.project_id,
  credentials,
});

const subscription = pubsub.subscription(config.googlePubsubSubscription);

subscription.on("message", async (message) => {
  const notification = decodePubSubMessage(message.data);

  if (!notification) {
    console.warn("[subscriber] Invalid message, acking to discard");
    message.ack();
    return;
  }

  try {
    await processNotification(notification.emailAddress, notification.historyId);
    message.ack();
  } catch (err) {
    console.error("[subscriber] Processing failed, nacking for retry:", err);
    message.nack();
  }
});

subscription.on("error", (error) => {
  console.error("[subscriber] Subscription error:", error);
});

// Graceful shutdown
async function shutdown() {
  console.log("[hvm-email] Shutting down...");
  await subscription.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log(`[hvm-email] Pull subscriber connected`);
console.log(`[hvm-email] Subscription: ${config.googlePubsubSubscription}`);
console.log(`[hvm-email] Capture dir: ${config.captureDir}`);
console.log(`[hvm-email] Waiting for messages... (Ctrl+C to stop)`);
