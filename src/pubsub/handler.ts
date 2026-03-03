export interface PubSubNotification {
  emailAddress: string;
  historyId: number;
}

export function decodePubSubMessage(body: unknown): PubSubNotification | null {
  const msg = body as { message?: { data?: string } };
  if (!msg?.message?.data) return null;

  try {
    const decoded = Buffer.from(msg.message.data, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded) as PubSubNotification;
    if (!parsed.emailAddress || !parsed.historyId) return null;
    return parsed;
  } catch {
    return null;
  }
}
