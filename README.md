# Strong Gym - MVP

First version of the Strong Gym web app built with Next.js (App Router), Next.js API routes, and MongoDB.

## Features included

- Session-based login (member/admin demo accounts)
- Member dashboard with:
  - attendance heatmap
  - competition of the month and submission flow
  - trainer social feed aggregation
  - loyalty points tally
- Admin panel with:
  - create/close monthly competition
  - assign challenge winner
  - publish trainer feed posts
- Role checks in API routes (member vs admin)

## Stack

- Next.js 14 + React 18 + TypeScript
- MongoDB Node driver
- Next.js Route Handlers for API endpoints

## Local setup

1. Copy `.env.example` to `.env.local`
2. Set `MONGODB_URI` and (optionally) `MONGODB_DB`
3. Install dependencies:

```bash
npm install
```

4. Run dev server:

```bash
npm run dev
```

## Demo accounts

- Member: `member@stronggym.local` / `member123`
- Admin: `admin@stronggym.local` / `admin123`

## Notes

- This MVP uses cookie-based sessions with seeded demo users to ship quickly.
- Replace with your production SSO provider (Auth0/Clerk/NextAuth + OIDC) before launch.
