import { getAdminClient } from "../src/gmail/client";
import { registerWatch } from "../src/gmail/watch";
import { config } from "../src/config";

const admin = await getAdminClient();

const res = await admin.users.list({
  domain: config.domain,
  maxResults: 500,
});

const users = res.data.users ?? [];
console.log(`Registering Gmail watch for ${users.length} users...\n`);

let succeeded = 0;
let failed = 0;

for (const user of users) {
  const email = user.primaryEmail!;
  try {
    const watch = await registerWatch(email);
    succeeded++;
    console.log(`  + ${email} (expires: ${new Date(Number(watch.expiration)).toISOString()})`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    failed++;
    console.error(`  x ${email}: ${msg}`);
  }
}

console.log(`\nDone: ${succeeded} succeeded, ${failed} failed`);
