import { google } from "googleapis";
import { JWT } from "google-auth-library";
import { config } from "../config";

let _key: { client_email: string; private_key: string } | null = null;

function getKey() {
  if (!_key) {
    _key = JSON.parse(config.googleServiceAccountKey);
  }
  return _key!;
}

export async function getGmailClient(userEmail: string) {
  const key = getKey();
  const auth = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
    subject: userEmail,
  });
  return google.gmail({ version: "v1", auth });
}

export async function getAdminClient() {
  const key = getKey();
  const auth = new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: [
      "https://www.googleapis.com/auth/admin.directory.user.readonly",
    ],
    subject: config.adminEmail,
  });
  return google.admin({ version: "directory_v1", auth });
}
