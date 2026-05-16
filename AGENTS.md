# AGENTS.md

## Project

Album Trader Chile is a responsive PWA for collectors in Chile to manage and discover sticker trading opportunities for the 2026 football album season.

Users can register the stickers they own, repeated stickers they can offer, and stickers they are looking for. The app does not handle the exchange transaction itself. If two users have a match, they coordinate externally through WhatsApp and optionally Instagram.

## Product Decisions

- Product name: Album Trader Chile.
- Domain: `albumtraderchile.com`.
- Market scope: Chile only.
- Platform: Web app/PWA for desktop, mobile, and tablets.
- Native mobile apps are out of scope.
- The exchange action is out of scope; users coordinate outside the platform.
- UI language: Spanish Latino.
- Code language: English.

## Stack

- Frontend: React + Vite + TypeScript.
- Styling: Tailwind CSS.
- Package manager: npm.
- Backend/database/realtime: Convex Free plan.
- Authentication: Google OAuth through Convex Auth if possible.
- Payments: out of scope for the initial production launch.
- Hosting/domain: Hostinger deploy from GitHub for the Vite app + domain.

Do not introduce additional infrastructure such as VPS, Oracle Cloud, DigitalOcean, Supabase, Firebase, or a custom Node backend unless the user explicitly changes the infrastructure decision.

## Hosting Constraints

The frontend must be deployable from GitHub to Hostinger as a Vite app.

Avoid designs that require server-side rendering, server routes, or a persistent custom backend. All backend logic should live in Convex functions.

## Authentication

Use email and password as the primary authentication method.

Do not send verification emails for the initial production launch. Users create an account with email and password, then sign in with those credentials.

After first login, users must complete an Album Trader profile before using core matching features.

Required profile fields:

- Display name.
- Region.
- Commune.
- WhatsApp contact.

Optional profile fields:

- Instagram handle.

## Chile Location Data

The app must support all Chilean regions and communes.

Region and commune data should be modeled explicitly and consistently. Prefer a local typed constant/list for MVP unless there is a strong reason to store it in Convex.

## Contact Privacy

WhatsApp is required, Instagram is optional.

Contacts must only be visible when there is a match between users.

Do not expose WhatsApp or Instagram publicly on non-matched profiles.

A match means there is trading compatibility between two users, such as one user having repeated stickers the other user wants. Prefer showing contact access only when the current user and target user have a meaningful sticker overlap.

## Core MVP Scope

Implement these features first:

- Landing page.
- Google login/logout.
- User profile onboarding.
- Region and commune selection for Chile.
- Sticker catalog.
- User-owned stickers.
- Repeated stickers.
- Wanted stickers.
- Matching between users.
- Match details showing what each user can offer.
- Contact buttons visible only for matched users.
- PWA metadata and installability.
- Responsive layout for desktop, mobile, and tablets.

## Out Of Scope

- In-app exchange acceptance flow.
- Shipping, delivery, or escrow.
- Native iOS/Android apps.
- Chat system.
- Manual moderation dashboard unless requested.
- SMS/WhatsApp OTP verification.
- Instagram verification.
- Multi-country support.
- Official Panini/FIFA branding, logos, or copyrighted album assets.

## Legal And Brand Safety

Avoid using official Panini or FIFA logos, images, trademarks, or protected album artwork.

Use neutral wording such as sticker collectors and album trading.

Include a disclaimer in public-facing legal/about content when relevant:

`Album Trader Chile is an independent project and is not affiliated with Panini, FIFA, or related brands.`

## Data Modeling Guidelines

Use clear English names in code and database schema.

Suggested Convex entities:

- `users` or auth-managed users.
- `profiles`.
- `stickers`.
- `ownedStickers`.
- `duplicateStickers`.
- `wantedStickers`.
- `featuredProfiles`.
- `payments`.
- `reports`.

Prefer simple, queryable relationships over premature abstractions.

Sticker identifiers should be stable strings, for example `ARG-001`, `CHI-012`, or another consistent catalog format once the album structure is defined.

## Implementation Guidelines

- Keep changes minimal and pragmatic.
- Prefer simple components and straightforward Convex functions.
- Use TypeScript types for app data and UI props.
- Keep UI copy in Spanish Latino.
- Keep variable, function, file, and schema names in English.
- Build mobile-first, then adapt to tablet and desktop.
- Do not add unnecessary dependencies.
- Do not introduce server-side-only framework features incompatible with static Hostinger hosting.

## Verification

Before considering a task complete, prefer running:

- `npm run lint` if available.
- `npm run build` if available.

If commands are unavailable, report that clearly and do not invent results.

## Environment Variables

Expected environment variables will likely include:

- Convex deployment URL/configuration.
- Google OAuth client credentials if required by the selected auth setup.

Never commit real secrets. Use `.env.example` for placeholders when needed.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
