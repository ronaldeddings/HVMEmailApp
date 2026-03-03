import { getGmailClient } from "./client";
import { config } from "../config";

export async function registerWatch(userEmail: string): Promise<{ historyId: string; expiration: string }> {
  const gmail = await getGmailClient(userEmail);
  const res = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: config.googlePubsubTopic,
      labelIds: ["INBOX"],
    },
  });

  return {
    historyId: res.data.historyId!,
    expiration: res.data.expiration!,
  };
}

export async function stopWatch(userEmail: string): Promise<void> {
  const gmail = await getGmailClient(userEmail);
  await gmail.users.stop({ userId: "me" });
}
