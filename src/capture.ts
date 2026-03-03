import type { gmail_v1 } from "googleapis";
import { config } from "./config";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export interface CapturedEmail {
  id: string;
  threadId: string;
  userEmail: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml: string;
  snippet: string;
  labels: string[];
  capturedAt: string;
}

function getHeader(message: gmail_v1.Schema$Message, name: string): string {
  return (
    message.payload?.headers?.find(
      (h) => h.name?.toLowerCase() === name.toLowerCase(),
    )?.value ?? ""
  );
}

function decodeBody(data: string | undefined | null): string {
  if (!data) return "";
  return Buffer.from(data, "base64url").toString("utf-8");
}

function extractBody(
  payload: gmail_v1.Schema$MessagePart | undefined,
): { text: string; html: string } {
  if (!payload) return { text: "", html: "" };

  let text = "";
  let html = "";

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    text = decodeBody(payload.body.data);
  } else if (payload.mimeType === "text/html" && payload.body?.data) {
    html = decodeBody(payload.body.data);
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested.text && !text) text = nested.text;
      if (nested.html && !html) html = nested.html;
    }
  }

  return { text, html };
}

export function extractEmail(
  message: gmail_v1.Schema$Message,
  userEmail: string,
): CapturedEmail {
  const body = extractBody(message.payload);

  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    userEmail,
    from: getHeader(message, "From"),
    to: getHeader(message, "To"),
    subject: getHeader(message, "Subject"),
    date: getHeader(message, "Date"),
    bodyText: body.text,
    bodyHtml: body.html,
    snippet: message.snippet ?? "",
    labels: message.labelIds ?? [],
    capturedAt: new Date().toISOString(),
  };
}

export async function saveCapture(captured: CapturedEmail): Promise<string> {
  const dir = join(config.captureDir, captured.userEmail);
  await mkdir(dir, { recursive: true });

  const filename = `${captured.date ? new Date(captured.date).toISOString().replace(/[:.]/g, "-") : captured.id}.json`;
  const filepath = join(dir, filename);

  await Bun.write(filepath, JSON.stringify(captured, null, 2));
  console.log(`[capture] Saved ${captured.userEmail}/${filename} — "${captured.subject}"`);

  return filepath;
}
