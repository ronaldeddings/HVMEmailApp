export interface PubSubNotification {
  emailAddress: string;
  historyId: number;
}

export function decodePubSubMessage(data: Buffer): PubSubNotification | null {
  try {
    const decoded = data.toString("utf-8");
    const parsed = JSON.parse(decoded) as PubSubNotification;
    if (!parsed.emailAddress || !parsed.historyId) return null;
    return parsed;
  } catch {
    return null;
  }
}
