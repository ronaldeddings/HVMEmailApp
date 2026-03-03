function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const config = {
  googleServiceAccountKey: required("GOOGLE_SERVICE_ACCOUNT_KEY"),
  googlePubsubTopic: required("GOOGLE_PUBSUB_TOPIC"),
  googlePubsubSubscription: required("GOOGLE_PUBSUB_SUBSCRIPTION"),
  domain: required("GOOGLE_WORKSPACE_DOMAIN"),
  adminEmail: required("GOOGLE_ADMIN_EMAIL"),
  captureDir: process.env.CAPTURE_DIR ?? "./captured",
} as const;
