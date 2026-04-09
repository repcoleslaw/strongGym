# Proposed Data Model
- users
  - `_id`, `name`, `email`, `role` (`member` or `admin`), `loyaltyPoints`
- attendance
  - `_id`, `userId`, `date` (YYYY-MM-DD, UTC calendar day), `visitCount` (non‑negative integer; multiple logs the same day increment this). Legacy documents may still have `attended` (boolean) and are normalized on read.
- challenges
  - `_id`, `title`, `description`, `monthKey`, `status` (`open` or `closed`), `winnerUserId`, `submissions[]`
  - submission shape: `userId`, `userName`, `proofText`, `submittedAt`
- feed_posts
  - `_id`, `title`, `body`, `source`, `author`, `postedAt`
