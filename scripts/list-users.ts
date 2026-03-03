import { getAdminClient } from "../src/gmail/client";
import { config } from "../src/config";

const admin = await getAdminClient();

const res = await admin.users.list({
  domain: config.domain,
  maxResults: 500,
  orderBy: "email",
});

const users = res.data.users ?? [];
console.log(`Found ${users.length} users in ${config.domain}:\n`);

for (const user of users) {
  console.log(`  ${user.primaryEmail} (${user.name?.fullName ?? "no name"})`);
}
