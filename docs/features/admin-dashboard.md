# Admin Dashboard Feature

## Goal
Provide a secure admin-only area in the Strong Gym web app where administrators can manage challenges, publish feed content, and monitor core gym activity at a glance.

## Who This Is For
- **Admin users** with `role: "admin"`.
- **Non-admin users** must not be able to access admin pages or admin APIs.

## Access and Security
- Admin routes must be protected with role-based access control.
- API endpoints used by the dashboard must validate admin role before any read/write action.
- Unauthenticated users should be redirected to login.
- Authenticated non-admin users should receive unauthorized responses (or be redirected away from admin routes).

## Dashboard Scope (v1)
The admin dashboard includes the following capabilities:

1. **Challenge management**
   - Create a new monthly challenge.
   - Update challenge metadata (title, description, month).
   - Open/close challenge status.
   - Select and store a winner once challenge is closed.
   - Review submissions for the active challenge.

2. **Feed publishing**
   - Publish a trainer/admin post to the member feed.
   - Required fields: `title`, `body`, `source`.
   - Author should be captured from current admin session.
   - On successful form submit, return to admin view with the latest data.

3. **Operational overview**
   - Display basic stats for quick monitoring:
     - total users
     - total admins
     - current open challenge
     - submissions count for current month
     - recent feed posts

## Data Model Dependencies
This feature relies on the following collections:

- `users`
  - `_id`, `name`, `email`, `role`, `loyaltyPoints`
- `challenges`
  - `_id`, `title`, `description`, `monthKey`, `status`, `winnerUserId`, `submissions[]`
- `feed_posts`
  - `_id`, `title`, `body`, `source`, `author`, `postedAt`
- `attendance` (read-only in v1 dashboard)
  - `_id`, `userId`, `date`, `visitCount` (legacy: `attended`)

## API and Server Behavior (Current)
- `POST /api/admin/feed`
  - Requires admin role.
  - Supports both JSON and form-data payloads.
  - Validates `title`, `body`, and `source`.
  - Stores post with session admin name as author.
  - Returns:
    - `201` JSON for JSON requests
    - redirect to `/admin` for form submissions
    - `400` when required fields are missing

## Suggested UI Layout
- **Header**
  - page title (`Admin Dashboard`)
  - current admin identity
  - logout action
- **Stats cards**
  - key counts and challenge status
- **Challenge section**
  - form/actions for create/edit/open/close/winner
  - submissions table
- **Feed section**
  - create post form
  - recent posts list

## Acceptance Criteria
- Admin can open `/admin` and view dashboard widgets.
- Non-admin users cannot access `/admin` or admin APIs.
- Admin can create a feed post with required fields and see it reflected in recent posts.
- Admin can create/update/close a monthly challenge and assign a winner.
- Dashboard loads without exposing private admin controls to member users.

## Out of Scope (v1)
- Advanced analytics dashboards
- Bulk editing tools
- Multi-step moderation workflows
- Audit trail/history view
