# HVM Email App Setup Guide

Passive email content capture for Google Workspace. Reads every email across your org without disrupting mail flow.

## Architecture

```
Inbound Email
  -> Google Workspace (delivered to user's inbox normally)
  -> Gmail Pub/Sub Push Notification (~1-3s after delivery)
  -> HVM Email App (Bun server, read-only)
  -> Captures email content to JSON files
```

**Key point:** This is a read-only tap. Emails flow to users normally with zero delay or disruption. Your server reads a copy of each email after delivery.

## Prerequisites

- Google Workspace admin access
- Google Cloud Platform account
- Bun runtime installed
- A publicly accessible URL for the webhook (e.g., Railway, Fly.io, Cloudflare Tunnel)

---

## Step 1: Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project (e.g., "hvm-email-app")
3. Enable these APIs:
   - Gmail API
   - Google Cloud Pub/Sub API
   - Admin SDK API

## Step 2: Service Account

1. Go to IAM & Admin > Service Accounts
2. Create a service account (e.g., "hvm-email-processor")
3. Grant no project-level roles (delegation handles permissions)
4. Create a JSON key and download it
5. Save the key file as `service-account-key.json` in the project root

## Step 3: Domain-Wide Delegation

1. Go to Google Workspace Admin Console: https://admin.google.com
2. Navigate to Security > Access and data control > API controls
3. Click "Manage Domain Wide Delegation"
4. Add new:
   - Client ID: (from service account details page)
   - OAuth scopes (comma-separated):
     ```
     https://www.googleapis.com/auth/gmail.readonly,https://www.googleapis.com/auth/admin.directory.user.readonly
     ```

## Step 4: Pub/Sub Topic

1. Go to Google Cloud Console > Pub/Sub
2. Create a topic (e.g., "gmail-notifications")
3. Grant publish permission to `gmail-api-push@system.gserviceaccount.com`:
   - Go to the topic's Permissions tab
   - Add member: `gmail-api-push@system.gserviceaccount.com`
   - Role: Pub/Sub Publisher
4. Create a push subscription:
   - Endpoint URL: `https://your-server.example.com/webhook/gmail`
   - Acknowledgement deadline: 30 seconds

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

# Start the server
bun run dev
```

Captured emails are saved as JSON files in `./captured/{user-email}/`.

## Step 6: Cron for Watch Renewal

Gmail watches expire every 7 days. Set up a cron job to renew every 6 days:

```bash
# crontab -e
0 0 */6 * * cd /path/to/HVMEmailApp && bun run renew-watches
```

---

## Verification Checklist

- [ ] `bun run list-users` shows all workspace users
- [ ] `bun run setup-watch` registers watches without errors
- [ ] `curl http://localhost:3000/health` returns `{"status":"ok"}`
- [ ] Send a test email to a user
- [ ] Check server logs for capture output
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
- Ensure your webhook URL is publicly accessible

**Auth errors:**
- Verify domain-wide delegation is configured with correct scopes
- Ensure the admin email in config matches an actual admin account
- Check that the service account key file is valid JSON

**No captured files appearing:**
- Check the `CAPTURE_DIR` path exists and is writable
- Look at server logs for processing errors
- Verify the history ID tracking is working (first notification after restart may miss messages)
