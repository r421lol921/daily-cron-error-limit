# Automated Cleanup Cron Setup

This project includes automated cleanup functions that need to be run periodically using a cron job.

## Cleanup Functions

The `/api/cleanup` endpoint runs three automated tasks:

1. **Archive Old Posts** - Archives posts older than 2 days
2. **Mark Inactive Accounts** - Marks accounts as inactive after 3 days of no activity
3. **Delete Inactive Accounts** - Deletes accounts that have been inactive for 15 days

## Setup with Vercel Cron

To enable automated cleanup on Vercel:

1. Add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cleanup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

This runs the cleanup job daily at 2:00 AM UTC.

2. Set the `CRON_SECRET` environment variable in your Vercel project settings:
   - Go to your project settings on Vercel
   - Navigate to Environment Variables
   - Add `CRON_SECRET` with a secure random string

3. The endpoint is protected and will only run when called with the correct secret.

## Manual Testing

You can manually trigger the cleanup by making a POST request:

```bash
curl -X POST https://your-domain.com/api/cleanup \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## What Gets Cleaned Up

- **Posts**: Automatically archived after 2 days (not deleted, just marked as archived)
- **Accounts**: Marked inactive after 3 days of no activity, deleted after 15 days of inactivity
- **Activity Tracking**: User activity is tracked via `last_active_at` which updates on each page visit

## Database Functions

The following PostgreSQL functions power the cleanup:

- `archive_old_posts()` - Sets `is_archived = true` on old posts
- `mark_inactive_accounts()` - Sets `is_inactive = true` on inactive accounts  
- `delete_inactive_accounts()` - Removes accounts inactive for 15+ days

These are executed via the Supabase API from the cleanup endpoint.
