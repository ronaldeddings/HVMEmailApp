# HVM Email App Setup Guide

Passive email content capture for Google Workspace. Reads every email across your org without disrupting mail flow.

## Architecture

```
Inbound Email
  -> Google Workspace (delivered to user's inbox normally)
  -> Gmail Pub/Sub Notification (~1-3s after delivery)
  -> Pub/Sub Topic (messages queue up)
  -> HVM Email App (Bun pull subscriber, runs locally)
  -> Captures email content to JSON files
```

**Key points:**
- Read-only tap. Emails flow to users normally with zero delay or disruption.
- Pull-based — no public URL or server needed. Runs anywhere with internet access.
- If the app stops, messages queue in Pub/Sub (retained up to 7 days by default). When you restart, it picks up where it left off.

## Prerequisites

- Google Workspace admin access
- Google Cloud Platform account
- Bun runtime installed

---

## Step 1: Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project (or use an existing one)
3. Enable these APIs:
   - Gmail API
   - Google Cloud Pub/Sub API
   - Admin SDK API

## Step 2: Service Account

1. Go to IAM & Admin > Service Accounts
2. Create a service account (e.g., "hvm-email-processor")
3. Enable "Domain-wide Delegation" on the service account
4. Create a JSON key and download it
5. You'll paste the JSON contents into the `GOOGLE_SERVICE_ACCOUNT_KEY` env var

## Step 3: Domain-Wide Delegation

1. Go to Google Workspace Admin Console: https://admin.google.com
2. Navigate to Security > Access and data control > API controls
3. Click "Manage Domain Wide Delegation"
4. Add new:
   - Client ID: (the numeric Client ID from service account details)
   - OAuth scopes (comma-separated):
     ```
     https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/admin.directory.user.readonly
     ```

## Step 4: Pub/Sub Topic + Pull Subscription

1. Go to Google Cloud Console > Pub/Sub
2. Create a topic (e.g., "AIPipeline")
3. Grant publish permission to `gmail-api-push@system.gserviceaccount.com`:
   - Go to the topic's Permissions tab
   - Add member: `gmail-api-push@system.gserviceaccount.com`
   - Role: Pub/Sub Publisher
4. Create a **pull** subscription:
   - Click "Create Subscription"
   - Subscription ID: `gmail-pull`
   - Delivery type: **Pull**
   - Acknowledgement deadline: 60 seconds
   - Message retention: 7 days (default)
5. Grant your service account `Pub/Sub Subscriber` role on the subscription

## Step 5: Configure and Run

```bash
# Install dependencies
bun install

# Copy and edit environment config
cp .env.example .env
# Edit .env with your values

# List all workspace users (verify delegation works)
bun run list-users

# Register Gmail watch for all users
bun run setup-watch

# Start the pull subscriber
bun run start
```

Captured emails are saved as JSON files in `./captured/{user-email}/`.

## Step 6: Cron for Watch Renewal

Gmail watches expire every 7 days. Set up a cron job to renew every 6 days:

```bash
# crontab -e
0 0 */6 * * cd /path/to/HVMEmailApp && bun run renew-watches
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Yes | Full JSON contents of service account key |
| `GOOGLE_PUBSUB_TOPIC` | Yes | `projects/{id}/topics/{name}` |
| `GOOGLE_PUBSUB_SUBSCRIPTION` | Yes | `projects/{id}/subscriptions/{name}` |
| `GOOGLE_WORKSPACE_DOMAIN` | Yes | Your Workspace domain (e.g., `hackervalley.com`) |
| `GOOGLE_ADMIN_EMAIL` | Yes | Admin email for user listing delegation |
| `CAPTURE_DIR` | No | Output directory (default: `./captured`) |

## Verification Checklist

- [ ] `bun run list-users` shows all workspace users
- [ ] `bun run setup-watch` registers watches without errors
- [ ] `bun run start` connects to Pub/Sub subscription
- [ ] Send a test email to a user
- [ ] Check console for capture output
- [ ] Verify JSON file created in `./captured/{user-email}/`

## Captured Email Format

Each email is saved as a JSON file:

```json
{
  "id": "message-id",
  "threadId": "thread-id",
  "userEmail": "user@hackervalley.com",
  "from": "sender@example.com",
  "to": "user@hackervalley.com",
  "subject": "Email subject line",
  "date": "Mon, 3 Mar 2026 10:00:00 -0600",
  "bodyText": "Plain text body...",
  "bodyHtml": "<html>HTML body...</html>",
  "snippet": "Preview snippet...",
  "labels": ["INBOX", "UNREAD"],
  "capturedAt": "2026-03-03T16:00:00.000Z"
}
```

## Troubleshooting

**Pub/Sub not receiving notifications:**
- Verify the topic has the correct publisher permission
- Check that watches are registered (run setup-watch again)
- Ensure your service account has Pub/Sub Subscriber role

**Auth errors:**
- Verify domain-wide delegation is configured with correct scopes
- Ensure the admin email in config matches an actual admin account
- Check that the service account key JSON is valid

**No captured files appearing:**
- Check the `CAPTURE_DIR` path exists and is writable
- Look at console logs for processing errors
- Verify the history ID tracking is working (first notification after restart may miss messages)

**App stops receiving after 7 days:**
- Gmail watches expire every 7 days
- Run `bun run renew-watches` or set up the cron job
