# Yusuf's Daily News Briefings

Yusuf will read across Bangladeshi online news sites (Bangla + English, including smaller tabloid-style outlets) twice a day, prepare a digest focused on **corruption, money laundering, and financial irregularities**, and deliver it both inside the app and to your email inbox at **8:00 AM and 3:00 PM Asia/Dhaka (GMT+6)**.

## What you'll see

Each briefing is a card list. Each item has:
- **Headline** (clickable, opens source article)
- **3-sentence summary** in your language (English by default, Bangla on request)
- **Image** from the article when available (video embed when the source provides one)
- **Source + timestamp**

A new **Briefings** tab will appear in the app next to Chat / Todos / Goals / Vault / Files. Past briefings are kept so you can scroll back.

## How it works

1. **Sources** — Yusuf scans a curated list of Bangladeshi news sites (Prothom Alo, Daily Star, Bangla Tribune, Jugantor, Kaler Kantho, BDNews24, Dhaka Tribune, New Age, Samakal, Manab Zamin, Inqilab, Janakantha, plus smaller tabloid outlets like Daily Sangram, Amader Shomoy, Bhorer Kagoj). You can add/remove sources from a **Briefing Settings** panel.
2. **Topic filter** — keywords across Bangla + English: corruption, ঘুষ, দুর্নীতি, money laundering, অর্থ পাচার, hundi, bank loan default, খেলাপি ঋণ, ACC / দুদক, financial irregularities, etc. Editable.
3. **Crawl & extract** — uses Firecrawl to search/scrape these sites for the last 12 hours of matching coverage, deduplicates near-identical stories.
4. **Summarize** — Lovable AI (Gemini) groups stories, writes a 3-sentence summary per item, picks the lead image, ranks by importance, caps at ~10 items per briefing.
5. **Deliver** — saves the briefing to your library, then emails you the same digest from your Lovable email domain.

## Schedule

- **Morning briefing:** 8:00 AM Dhaka  →  pg_cron `0 2 * * *` (UTC)
- **Afternoon briefing:** 3:00 PM Dhaka  →  pg_cron `0 9 * * *` (UTC)

Calls `POST /api/public/hooks/generate-briefings` with an `apikey` header. The route fans out per user who has briefings enabled.

## Technical scope

### Database
- `briefing_preferences` — user_id, enabled (bool), sources (text[]), topics (text[]), language ('en'|'bn'|'auto'), timezone, max_items
- `briefings` — id, user_id, slot ('morning'|'afternoon'), local_date, items (jsonb: `{headline, summary, url, image_url, source, published_at}[]`), created_at
- RLS: each user reads/writes only their own rows; service_role for the cron route

### Backend
- `src/lib/briefings.functions.ts` — `getPreferences`, `updatePreferences`, `listBriefings`, `getBriefing`, `generateBriefingNow` (manual trigger / test)
- `src/routes/api/public/hooks/generate-briefings.ts` — cron entry; verifies apikey, iterates enabled users, calls the generator
- `src/lib/briefings.server.ts` — Firecrawl search/scrape + Gemini summarization + dedupe + image pick
- Email send via the Lovable Emails app-email path (template: `daily-briefing`)

### Frontend
- New **Briefings** tab in `src/components/app-page.tsx`
- `<BriefingsView>` — list of past briefings, current one pinned at top, item cards with image + headline + 3-sentence summary + source link
- `<BriefingSettings>` dialog — toggle on/off, edit sources, edit topic keywords, language, max items, "Run a test briefing now" button

## What I need from you before this can fully run

These are one-time setup steps you have to click through; the rest I'll build:

1. **Firecrawl connector** — Yusuf needs Firecrawl to read news sites reliably (it handles JS-rendered pages and bot blocks). You'll click "Connect Firecrawl" and authenticate; no API key to copy.
2. **Email domain** — for the 8am/3pm email digest. You'll go through the email setup dialog and add DNS records for a subdomain like `notify.yusuf.ltd`. Emails will send from that.

If you don't want email yet, I can ship the in-app feed first and add email after the domain is set up.

## Out of scope (can add later)
- Push notifications (would need a PWA + push setup)
- Per-topic separate briefings (e.g. a separate "stock market" digest)
- WhatsApp / Telegram delivery
- Auto-translation of every Bangla article into English (currently summary is one language per briefing, your choice)

Approve and I'll start building. I'll ask you to click Connect Firecrawl and Set up email domain at the right moments.
