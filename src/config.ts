function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  googleServiceAccountKey: required("GOOGLE_SERVICE_ACCOUNT_KEY"),
  googlePubsubTopic: required("GOOGLE_PUBSUB_TOPIC"),
  domain: required("GOOGLE_WORKSPACE_DOMAIN"),
  captureDir: process.env.CAPTURE_DIR ?? "./captured",
} as const;
