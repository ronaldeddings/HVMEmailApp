// Run via cron every 6 days: 0 0 */6 * * bun run renew-watches
import { getAdminClient } from "../src/gmail/client";
import { registerWatch } from "../src/gmail/watch";
import { config } from "../src/config";

console.log(`[renew] Renewing Gmail watches for ${config.domain}...`);

const admin = await getAdminClient();

const res = await admin.users.list({
  domain: config.domain,
  maxResults: 500,
});

const users = res.data.users ?? [];
let succeeded = 0;
let failed = 0;

for (const user of users) {
  const email = user.primaryEmail!;
  try {
    await registerWatch(email);
    succeeded++;
  } catch (error) {
    console.error(
      `[renew] Failed for ${email}:`,
      error instanceof Error ? error.message : error,
    );
    failed++;
  }
}

console.log(`[renew] Complete: ${succeeded} renewed, ${failed} failed`);
