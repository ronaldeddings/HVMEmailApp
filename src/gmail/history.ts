import type { gmail_v1 } from "googleapis";
import { getGmailClient } from "./client";

export async function getNewMessages(
  userEmail: string,
  startHistoryId: string,
): Promise<gmail_v1.Schema$Message[]> {
  const gmail = await getGmailClient(userEmail);

  const res = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
  });

  if (!res.data.history) return [];

  const messageIds = new Set<string>();
  for (const h of res.data.history) {
    for (const added of h.messagesAdded ?? []) {
      if (added.message?.id) messageIds.add(added.message.id);
    }
  }

  const messages: gmail_v1.Schema$Message[] = [];
  for (const id of messageIds) {
    const msg = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });
    messages.push(msg.data);
  }

  return messages;
}
