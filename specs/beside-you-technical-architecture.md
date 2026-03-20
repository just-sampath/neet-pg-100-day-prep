# Beside You - Technical Architecture Document

**For: AI Agent Implementation**
**Version:** 1.0
**Date:** March 20, 2026
**Companion Document:** `beside-you-prd.md` (read this first for product context)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Target Devices and Optimization](#3-target-devices-and-optimization)
4. [Project Folder Structure](#4-project-folder-structure)
5. [Environment Variables](#5-environment-variables)
6. [Database Schema](#6-database-schema)
7. [Authentication](#7-authentication)
8. [Schedule Engine](#8-schedule-engine)
9. [Morning Revision Queue (Dynamic Recalculation)](#9-morning-revision-queue)
10. [Today View (Home Screen)](#10-today-view)
11. [Traffic Light System](#11-traffic-light-system)
12. [Backlog Queue System (All Branches)](#12-backlog-queue-system)
13. [Schedule Shift Mechanism](#13-schedule-shift-mechanism)
14. [Wind-Down Prompt System](#14-wind-down-prompt-system)
15. [MCQ Tracker](#15-mcq-tracker)
16. [GT Tracker](#16-gt-tracker)
17. [Weekly Auto-Summary](#17-weekly-auto-summary)
18. [Motivational Quotes System](#18-motivational-quotes-system)
19. [Schedule Browser](#19-schedule-browser)
20. [Cron Jobs](#20-cron-jobs)
21. [Real-Time Sync](#21-real-time-sync)
22. [PWA Configuration](#22-pwa-configuration)
23. [Dark/Light Mode](#23-dark-light-mode)
24. [Easter Egg](#24-easter-egg)
25. [Settings](#25-settings)
26. [Performance Requirements](#26-performance-requirements)
27. [Deployment](#27-deployment)
28. [Reference Data](#28-reference-data)

---

## 1. Project Overview

**Beside You** is a mobile-first Progressive Web App for a single NEET PG 2026 aspirant to follow a pre-built 100-day study schedule. The app handles scheduling, tracking, backlog management, MCQ logging, GT analysis, and motivation.

**Key Constraints:**

- Zero ongoing infrastructure cost (free tiers only)
- Single user, two devices (iPhone 12 + Samsung Galaxy Tab S9)
- Online-only (no offline mode)
- Zero push notifications (the app is intentionally silent)
- Schedule is seeded from an Excel file at initial setup
- App duration: ~100 days (May-August 2026)
- Exam date: August 30, 2026

---

## 2. Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 15+ (App Router) | Framework, SSR, routing |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| shadcn/ui | latest | Component library (cards, toggles, sheets, dropdowns, charts) |
| Recharts | 2.x | Charts for MCQ/GT analytics (bundled with shadcn/ui charts) |
| React | 19+ | UI library (comes with Next.js) |

### Backend / Database

| Technology | Purpose | Tier |
|---|---|---|
| Supabase | Postgres DB, Auth, Realtime, Edge Functions, pg_cron | Free tier |
| `@supabase/ssr` | Cookie-based auth for Next.js App Router | - |
| `@supabase/supabase-js` | Client SDK for browser-side operations | - |

### Hosting / Deployment

| Technology | Purpose | Tier |
|---|---|---|
| Vercel | Hosting, auto-deploy from GitHub, CDN | Hobby (free) |
| GitHub | Source control, CI/CD trigger | Free |

### PWA

| Technology | Purpose |
|---|---|
| Native Next.js PWA support | `app/manifest.ts` + basic service worker |
| Serwist | NOT needed for V1 (no offline mode). Only add if offline caching is needed in V2. |

### What We Are NOT Using

- No Redux, Zustand, or external state management (React state + Supabase client is sufficient)
- No next-pwa package (deprecated, use native Next.js PWA support)
- No Serwist (no offline mode required)
- No Firebase, no external auth providers
- No Telegram bot (deferred to V2)
- No AI/LLM features

---

## 3. Target Devices and Optimization

### Device Specifications

#### iPhone 12 (Primary Phone)

| Spec | Value |
|---|---|
| Screen size | 6.1" Super Retina XDR OLED |
| Physical resolution | 1170 x 2532 px |
| CSS viewport (portrait) | **390 x 844 px** |
| Device Pixel Ratio | 3x |
| Aspect ratio | 19.5:9 |
| Browser | Safari (iOS 16.4+ for PWA support) |
| Refresh rate | 60Hz |
| PWA mode | Standalone via "Add to Home Screen" in Safari |
| Notch | Yes (requires safe area insets) |
| Usable viewport height (standalone) | ~800px (status bar takes ~44px) |

#### Samsung Galaxy Tab S9 (Base Model, Primary Tablet)

| Spec | Value |
|---|---|
| Screen size | 11.0" Dynamic AMOLED 2X |
| Physical resolution | 1600 x 2560 px |
| CSS viewport (portrait) | **~800 x 1280 px** |
| Device Pixel Ratio | 2x |
| Aspect ratio | 16:10 |
| Browser | Chrome (Android 13+) |
| Refresh rate | 120Hz |
| PWA mode | Standalone via Chrome "Install app" |
| Notch | Camera hole (minimal impact) |

### Responsive Design Strategy

**Mobile-first approach. Design for iPhone 12 (390px) as default, then enhance for Tab S9 (800px+).**

#### Tailwind Breakpoints

```typescript
// tailwind.config.ts
const config = {
  theme: {
    screens: {
      // Only two breakpoints needed
      'tab': '768px',   // Galaxy Tab S9 in portrait (~800px viewport)
      'tab-lg': '1024px', // Tab S9 in landscape (~1280px viewport)
    },
  },
};
```

#### Layout Rules

**iPhone 12 (default, < 768px):**

- Single column layout, full width
- Block cards stack vertically
- MCQ form fields stack vertically
- Traffic light buttons are full-width row
- Morning revision checklist is single column
- Charts are full-width, horizontally scrollable if needed
- Touch targets minimum 44x44px (132 physical pixels at 3x DPR)
- Body text 16px minimum (Safari auto-zooms inputs below 16px)
- Block card titles: 16-18px, time slots: 14px, day counter: 20-24px
- Padding: 16px horizontal, 12px vertical on cards

**Galaxy Tab S9 (>= 768px):**

- Wider single-column cards with more horizontal padding
- Morning revision checklist can show items in a 2-column grid
- MCQ optional fields can show inline (2 per row) instead of stacked
- GT section breakdown can show 2-3 sections side by side
- Charts get more horizontal space, no scrolling needed
- Block cards show time + description + checkbox in a single row
- Backlog queue items show all metadata in one row
- Weekly summary shows metrics in a 2x2 or 3x2 grid

#### Safe Area Handling (iPhone 12)

```html
<!-- In app/layout.tsx, set viewport-fit=cover -->
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

```css
/* Root layout padding for notch and home indicator */
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

#### OLED Optimization

Both devices have AMOLED/OLED displays. Dark mode should use true black (`#000000` or `hsl(0, 0%, 0%)`) for the main background to save battery. Use very dark gray (`#0a0a0f` or similar dark navy) for card backgrounds to create subtle depth without losing the OLED benefit.

#### Font Sizing Reference

| Element | iPhone 12 | Tab S9 |
|---|---|---|
| Day counter badge | 22px / bold | 28px / bold |
| Phase name | 14px / medium | 16px / medium |
| Quote text | 15px / italic | 17px / italic |
| Block card title | 16px / semibold | 18px / semibold |
| Block time slot | 14px / regular | 15px / regular |
| Block description | 15px / regular | 16px / regular |
| Form labels | 14px / medium | 15px / medium |
| Form inputs | 16px / regular | 16px / regular |
| Button text | 15px / semibold | 16px / semibold |
| Chart labels | 12px / regular | 13px / regular |

#### Touch Target Sizes

| Element | Minimum Size | Notes |
|---|---|---|
| Block completion checkbox | 48x48px | Larger than Apple HIG 44px for easier tapping |
| Traffic light buttons | 44px height, full-width third | Three buttons in a row |
| MCQ result buttons (Right/Wrong/Guessed) | 48px height, equal-width thirds | Big tap targets |
| Skip button on block card | 44x44px | Secondary action, smaller is ok |
| Backlog action buttons | 44x36px | Compact but tappable |
| Navigation tabs/icons | 48x48px | Bottom nav if used |

---

## 4. Project Folder Structure

```
beside-you/
├── .github/
│   └── workflows/
│       └── keep-alive.yml              # GitHub Actions to ping Supabase (prevent pause)
├── public/
│   ├── icons/
│   │   ├── icon-192x192.png            # PWA icon
│   │   ├── icon-512x512.png            # PWA icon
│   │   ├── icon-maskable-192x192.png   # Maskable PWA icon (Android)
│   │   └── apple-touch-icon.png        # iOS home screen icon (180x180)
│   ├── splash/
│   │   ├── apple-splash-1170x2532.png  # iPhone 12 splash
│   │   └── apple-splash-1600x2560.png  # Tab S9 splash (optional, Chrome handles this)
│   └── sw.js                           # Minimal service worker (installability only)
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (providers, fonts, metadata, safe areas)
│   │   ├── manifest.ts                 # Dynamic PWA manifest
│   │   ├── page.tsx                    # Redirect to /today or /login
│   │   ├── globals.css                 # Tailwind imports, CSS variables, dark mode defaults
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx            # Login page (email + secret phrase)
│   │   │   └── layout.tsx              # Auth layout (no nav, centered)
│   │   ├── (app)/
│   │   │   ├── layout.tsx              # App layout (bottom nav, auth guard)
│   │   │   ├── today/
│   │   │   │   └── page.tsx            # TODAY VIEW - Home screen (Section 10)
│   │   │   ├── backlog/
│   │   │   │   └── page.tsx            # Backlog queue view (Section 12)
│   │   │   ├── mcq/
│   │   │   │   ├── page.tsx            # MCQ entry page (bulk + one-by-one tabs)
│   │   │   │   └── analytics/
│   │   │   │       └── page.tsx        # MCQ analytics/charts
│   │   │   ├── gt/
│   │   │   │   ├── page.tsx            # GT log form
│   │   │   │   └── analytics/
│   │   │   │       └── page.tsx        # GT analytics/charts
│   │   │   ├── schedule/
│   │   │   │   ├── page.tsx            # Full 100-day schedule browser
│   │   │   │   └── [day]/
│   │   │   │       └── page.tsx        # Single day detail view (past days editable)
│   │   │   ├── weekly/
│   │   │   │   ├── page.tsx            # Weekly summaries list
│   │   │   │   └── [week]/
│   │   │   │       └── page.tsx        # Single week summary detail
│   │   │   └── settings/
│   │   │       └── page.tsx            # Settings page
│   │   └── api/
│   │       └── keep-alive/
│   │           └── route.ts            # Endpoint for Supabase keep-alive ping
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── toggle-group.tsx
│   │   │   └── ... (other shadcn/ui components as needed)
│   │   ├── today/
│   │   │   ├── header.tsx              # Day counter, phase name, date
│   │   │   ├── quote-display.tsx       # Motivational quote with category logic
│   │   │   ├── traffic-light.tsx       # Green/Yellow/Red toggle
│   │   │   ├── morning-revision.tsx    # Morning revision checklist
│   │   │   ├── study-block-card.tsx    # Single study block card (checkbox, time, description)
│   │   │   ├── block-time-editor.tsx   # Inline time editing for blocks
│   │   │   ├── break-separator.tsx     # Thin separator for break/meal slots
│   │   │   ├── backlog-indicator.tsx   # Badge showing backlog count
│   │   │   ├── completion-celebration.tsx  # Celebration moment (confetti + quote)
│   │   │   ├── wind-down-prompt.tsx    # Wind-down dialog (22:30, 23:00, 23:15)
│   │   │   └── mcq-quick-log.tsx       # Floating MCQ quick log button/form
│   │   ├── backlog/
│   │   │   ├── backlog-item-card.tsx   # Single backlog item with actions
│   │   │   ├── backlog-summary.tsx     # Top summary (X items pending...)
│   │   │   ├── reschedule-picker.tsx   # Day/slot picker for rescheduling
│   │   │   ├── bulk-actions.tsx        # Bulk dismiss/reschedule controls
│   │   │   └── schedule-shift-preview.tsx  # Shift preview flow (dry run + confirm)
│   │   ├── mcq/
│   │   │   ├── bulk-entry-form.tsx     # Total/Correct/Wrong quick form
│   │   │   ├── one-by-one-form.tsx     # Detailed MCQ entry form
│   │   │   ├── cause-code-selector.tsx # Cause code dropdown
│   │   │   ├── fix-code-chips.tsx      # Multi-select fix code chips
│   │   │   ├── tag-chips.tsx           # Multi-select tag chips
│   │   │   └── mcq-charts.tsx          # MCQ analytics charts
│   │   ├── gt/
│   │   │   ├── gt-score-form.tsx       # Score section of GT log
│   │   │   ├── gt-context-form.tsx     # Attempt context (device, feeling, etc.)
│   │   │   ├── gt-section-form.tsx     # Section-wise breakdown (A-E)
│   │   │   ├── gt-wrapper-form.tsx     # Post-GT reflection questions
│   │   │   └── gt-charts.tsx           # GT analytics charts
│   │   ├── schedule/
│   │   │   ├── day-list-item.tsx       # Single day in the schedule browser
│   │   │   ├── day-detail-view.tsx     # Full day detail (all blocks, retroactive edit)
│   │   │   └── calendar-view.tsx       # Optional calendar grid view
│   │   ├── weekly/
│   │   │   └── weekly-summary-card.tsx # Weekly summary display
│   │   └── shared/
│   │       ├── app-logo.tsx            # "Beside You" logo with easter egg handler
│   │       ├── bottom-nav.tsx          # Bottom navigation bar
│   │       ├── theme-toggle.tsx        # Dark/light mode toggle
│   │       └── connection-indicator.tsx # "No connection" indicator
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client (createBrowserClient)
│   │   │   ├── server.ts              # Server Supabase client (createServerClient)
│   │   │   ├── middleware.ts           # Session refresh logic for middleware
│   │   │   └── admin.ts               # Service role client (for seed scripts only)
│   │   ├── schedule/
│   │   │   ├── schedule-engine.ts      # Core schedule logic (day mapping, phase detection)
│   │   │   ├── revision-calculator.ts  # Dynamic morning revision queue recalculation
│   │   │   ├── backlog-engine.ts       # Backlog creation, suggestion, and resolution logic
│   │   │   ├── schedule-shift.ts       # Schedule shift preview and apply logic
│   │   │   ├── block-cascade.ts        # Overrun cascade detection and resolution
│   │   │   └── sleep-protection.ts     # Sleep boundary enforcement (06:30-23:00)
│   │   ├── quotes/
│   │   │   ├── quote-selector.ts       # Quote selection logic (category, no-repeat)
│   │   │   └── quotes-data.ts          # Hardcoded quotes array (from CSV)
│   │   ├── analytics/
│   │   │   ├── mcq-analytics.ts        # MCQ trend calculations
│   │   │   ├── gt-analytics.ts         # GT trend calculations
│   │   │   └── weekly-summary.ts       # Weekly summary generation logic
│   │   ├── utils/
│   │   │   ├── date-helpers.ts         # IST timezone helpers, day number calculations
│   │   │   ├── time-helpers.ts         # Time slot parsing, duration calculations
│   │   │   └── format-helpers.ts       # Number formatting, percentage display
│   │   ├── constants.ts                # App-wide constants (exam date, time boundaries, etc.)
│   │   └── types.ts                    # TypeScript type definitions for all entities
│   ├── hooks/
│   │   ├── use-today.ts                # Hook for Today View state (current day, blocks, traffic light)
│   │   ├── use-backlog.ts              # Hook for backlog queue operations
│   │   ├── use-revision-queue.ts       # Hook for morning revision queue
│   │   ├── use-mcq.ts                  # Hook for MCQ entry and analytics
│   │   ├── use-gt.ts                   # Hook for GT logging and analytics
│   │   ├── use-wind-down.ts            # Hook for wind-down prompt timing
│   │   ├── use-realtime.ts             # Hook for Supabase Realtime subscriptions
│   │   └── use-theme.ts                # Hook for dark/light mode
│   └── middleware.ts                   # Next.js middleware (auth guard, session refresh)
├── supabase/
│   ├── migrations/
│   │   ├── 001_create_tables.sql       # All table definitions
│   │   ├── 002_create_rls_policies.sql # Row Level Security policies
│   │   ├── 003_create_functions.sql    # Database functions (schedule shift, weekly summary, etc.)
│   │   ├── 004_create_triggers.sql     # Triggers (auto-update timestamps, etc.)
│   │   └── 005_setup_cron.sql          # pg_cron job definitions
│   ├── seed/
│   │   ├── seed-schedule.ts            # Parse Excel and seed schedule_days + study_blocks
│   │   ├── seed-quotes.ts              # Parse quotes CSV and seed quotes table
│   │   └── seed-user.ts                # Create the single user account
│   └── functions/
│       ├── midnight-cron/
│       │   └── index.ts                # Edge Function: midnight auto-miss + backlog creation
│       └── weekly-summary/
│           └── index.ts                # Edge Function: weekly auto-summary generation
├── scripts/
│   ├── parse-excel.ts                  # Parse neet_pg_2026_100_day_schedule.xlsx into JSON
│   └── seed-database.ts                # Run all seed scripts against Supabase
├── data/
│   ├── neet_pg_2026_100_day_schedule.xlsx  # Source Excel (5 sheets)
│   └── quotes.csv                      # Motivational quotes (quote, author, category)
├── next.config.ts                      # Next.js config (no Serwist, just standard config)
├── tailwind.config.ts                  # Tailwind config (custom breakpoints, colors, dark mode)
├── tsconfig.json
├── package.json
├── vercel.json                         # Vercel config (cron job for keep-alive)
├── .env.local                          # Local environment variables
└── README.md
```

---

## 5. Environment Variables

```bash
# .env.local (also set in Vercel dashboard)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Public anon key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=eyJ...       # Private (server-side only, for seed scripts)

# App Config
NEXT_PUBLIC_APP_URL=https://beside-you.vercel.app
NEXT_PUBLIC_EXAM_DATE=2026-08-30
NEXT_PUBLIC_SCHEDULE_HARD_BOUNDARY=2026-08-20

# Vercel Cron Secret (for keep-alive endpoint)
CRON_SECRET=your-random-secret-string
```

---

## 6. Database Schema

### 6.1 Full SQL Migration

```sql
-- ============================================================
-- 001_create_tables.sql
-- ============================================================

-- ---- SCHEDULE TABLES ----

-- The 100-day schedule (seeded from Excel, mutable at runtime)
CREATE TABLE schedule_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INT NOT NULL CHECK (day_number >= 1 AND day_number <= 100),
  mapped_date DATE,                          -- calculated from Day 1 date
  phase TEXT NOT NULL,                       -- e.g. "First pass (concept rescue + notes marking)"
  primary_focus TEXT NOT NULL,               -- e.g. "Pathology FP-1"
  resource TEXT,                             -- e.g. "Marrow WoR + Marrow notes + Marrow QBank"
  gt_test TEXT DEFAULT 'No',                 -- "Full GT", "Diagnostic 100Q", "120Q half-sim", "No"
  deliverable TEXT,                          -- expected output for the day
  planned_hours INT DEFAULT 14,
  original_morning_revision TEXT,            -- static from Excel (pipe-separated items)
  is_buffer_day BOOLEAN DEFAULT false,       -- can be consumed by schedule shift
  is_shifted BOOLEAN DEFAULT false,          -- has this day been moved by a schedule shift
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_number)
);

-- The 7 trackable study blocks per day (seeded from Excel)
CREATE TABLE study_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  block_type TEXT NOT NULL CHECK (block_type IN (
    'morning_revision', 'block_a', 'block_b', 'consolidation',
    'mcq', 'pyq_image', 'night_recall'
  )),
  scheduled_start TIME NOT NULL,            -- e.g. '06:30'
  scheduled_end TIME NOT NULL,              -- e.g. '08:00'
  description TEXT,                          -- from Excel column
  block_order INT NOT NULL,                  -- 1-7 for chronological ordering
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_number, block_type)
);

-- ---- TRACKING TABLES ----

-- Block completion status (one row per block per day)
CREATE TABLE block_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  block_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'skipped', 'missed', 'partial', 'rescheduled'
  )),
  completed_at TIMESTAMPTZ,                  -- when she marked it done
  actual_start_time TIME,                    -- if she edited the time slot
  actual_end_time TIME,                      -- if she edited the time slot
  overrun_minutes INT DEFAULT 0,             -- how much this block ran over
  traffic_light_at_completion TEXT,           -- what traffic light was active
  source_tag TEXT,                            -- 'yellow_day', 'red_day', 'overrun_cascade', null
  notes TEXT,                                 -- e.g. "Quick version" for partial night recall
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_number, block_type)
);

-- Day-level settings (traffic light state, per-day overrides)
CREATE TABLE day_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  traffic_light TEXT NOT NULL DEFAULT 'green' CHECK (traffic_light IN ('green', 'yellow', 'red')),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_number)
);

-- ---- BACKLOG TABLES ----

CREATE TABLE backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_day INT NOT NULL,
  original_block_type TEXT NOT NULL,
  topic_description TEXT,                    -- parsed from schedule description
  subject TEXT,                              -- parsed from primary_focus
  source_tag TEXT NOT NULL CHECK (source_tag IN (
    'missed', 'skipped', 'yellow_day', 'red_day', 'overrun_cascade'
  )),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'rescheduled', 'completed', 'dismissed'
  )),
  suggested_day INT,                         -- engine's suggestion
  suggested_slot TEXT,                        -- engine's suggested block type
  suggested_note TEXT,                        -- e.g. "Increase target from 45-70 to 60-80"
  rescheduled_to_day INT,                    -- where she actually put it
  rescheduled_to_slot TEXT,
  completed_at TIMESTAMPTZ,                  -- when she marked it done (with date picker)
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for quick backlog count query
CREATE INDEX idx_backlog_pending ON backlog_items(user_id, status) WHERE status = 'pending';

-- ---- REVISION QUEUE TABLE ----

CREATE TABLE revision_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_day INT NOT NULL,                   -- day the topic was originally studied
  source_block_type TEXT NOT NULL,            -- which block generated this revision
  topic TEXT NOT NULL,                        -- what to revise
  subject TEXT,                               -- parsed subject
  revision_type TEXT NOT NULL CHECK (revision_type IN (
    'D+1', 'D+3', 'D+7', 'D+14', 'D+28'
  )),
  scheduled_date DATE NOT NULL,              -- when this revision is due
  actual_completion_date DATE,               -- when the source block was actually completed
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'completed', 'overdue_1_2', 'overdue_3_6', 'overdue_7_plus', 'deferred'
  )),
  assigned_slot TEXT DEFAULT 'morning_revision', -- where it's been placed
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for daily revision queue lookup
CREATE INDEX idx_revision_scheduled ON revision_queue(user_id, scheduled_date, status);

-- ---- MCQ TABLES ----

-- Bulk MCQ entries
CREATE TABLE mcq_bulk_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_attempted INT NOT NULL,
  correct INT NOT NULL,
  wrong INT NOT NULL,
  subject TEXT,                              -- optional
  source TEXT,                               -- e.g. "CM-PSM-01", "Module-Pharma-ANS"
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One-by-one MCQ entries
CREATE TABLE mcq_individual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mcq_id TEXT NOT NULL,                      -- MCQ ID (text/number)
  result TEXT NOT NULL CHECK (result IN ('right', 'wrong', 'guessed_right')),
  -- Optional fields
  subject TEXT,
  topic TEXT,
  source TEXT,
  cause_code TEXT CHECK (cause_code IN (
    'R', 'C', 'A', 'D', 'I', 'M', 'V', 'B', 'T', 'K'
  ) OR cause_code IS NULL),
  priority TEXT CHECK (priority IN ('P1', 'P2', 'P3') OR priority IS NULL),
  correct_rule TEXT,                         -- free text, 1-2 lines
  what_fooled_me TEXT,                       -- free text
  fix_codes TEXT[],                          -- array of fix code strings
  tags TEXT[],                               -- array of tag strings
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for MCQ analytics
CREATE INDEX idx_mcq_individual_date ON mcq_individual_entries(user_id, entry_date);
CREATE INDEX idx_mcq_individual_subject ON mcq_individual_entries(user_id, subject);

-- ---- GT TABLES ----

CREATE TABLE gt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gt_number TEXT NOT NULL,                   -- "Diagnostic", "GT-1", "GT-2", etc.
  gt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  day_number INT,                            -- which schedule day
  -- Score section
  score NUMERIC,
  correct INT,
  wrong INT,
  unattempted INT,
  air_percentile TEXT,                       -- text (can be approximate)
  -- Attempt context
  device TEXT CHECK (device IN ('laptop', 'mobile', 'tablet') OR device IS NULL),
  attempted_live BOOLEAN,
  overall_feeling TEXT CHECK (overall_feeling IN (
    'calm', 'rushed', 'blank', 'fatigued', 'overthinking'
  ) OR overall_feeling IS NULL),
  -- Section-wise breakdown (stored as JSONB for flexibility)
  -- Each section: { time_enough: bool, panic_started: bool, guessed_too_much: bool, time_lost_on: string[] }
  section_a JSONB DEFAULT '{}',
  section_b JSONB DEFAULT '{}',
  section_c JSONB DEFAULT '{}',
  section_d JSONB DEFAULT '{}',
  section_e JSONB DEFAULT '{}',
  -- GT Wrapper (post-GT reflection)
  error_types TEXT,                          -- free text
  recurring_topics TEXT,                     -- free text or tag-style
  knowledge_vs_behaviour INT,               -- 0-100 slider value
  unsure_right_count INT,
  change_before_next_gt TEXT,                -- free text
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ---- WEEKLY SUMMARY TABLE ----

CREATE TABLE weekly_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number INT NOT NULL,                  -- 1, 2, 3...
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  -- Schedule adherence
  blocks_completed INT DEFAULT 0,
  blocks_planned INT DEFAULT 0,
  green_days INT DEFAULT 0,
  yellow_days INT DEFAULT 0,
  red_days INT DEFAULT 0,
  morning_revision_completed INT DEFAULT 0,
  morning_revision_planned INT DEFAULT 0,
  overrun_blocks JSONB DEFAULT '[]',         -- [{block_type, subject, count}]
  -- MCQ performance
  total_mcqs_solved INT DEFAULT 0,
  overall_accuracy NUMERIC(5,2),
  accuracy_vs_previous TEXT,                 -- 'up', 'down', 'stable'
  top_wrong_subjects JSONB DEFAULT '[]',
  top_cause_codes JSONB DEFAULT '[]',
  -- GT data (if applicable)
  gt_number TEXT,
  gt_score NUMERIC,
  gt_air TEXT,
  gt_wrapper_summary TEXT,
  -- Schedule health
  schedule_status TEXT,                      -- 'on_track', 'X_days_behind', etc.
  backlog_count INT DEFAULT 0,
  buffer_days_used INT DEFAULT 0,
  -- Subjects studied
  subjects_studied TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ---- QUOTES TABLE ----

CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_text TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('daily', 'tough_day', 'celebration')),
  shown_count INT DEFAULT 0,                 -- track how many times shown (for no-repeat logic)
  last_shown_at TIMESTAMPTZ
);

-- ---- APP SETTINGS TABLE ----

CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_one_date DATE NOT NULL,                -- when Day 1 starts
  theme TEXT DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  schedule_shift_total INT DEFAULT 0,        -- total days shifted so far
  suggest_shift BOOLEAN DEFAULT false,       -- flag for showing shift suggestion
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);


-- ============================================================
-- 002_create_rls_policies.sql
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE schedule_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE backlog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE revision_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_bulk_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcq_individual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gt_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Single user app: user can only access their own data
-- Pattern: auth.uid() = user_id for all tables with user_id

-- schedule_days policies
CREATE POLICY "Users can view own schedule" ON schedule_days FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own schedule" ON schedule_days FOR UPDATE USING (auth.uid() = user_id);

-- study_blocks policies
CREATE POLICY "Users can view own blocks" ON study_blocks FOR SELECT USING (auth.uid() = user_id);

-- block_completions policies
CREATE POLICY "Users can view own completions" ON block_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON block_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own completions" ON block_completions FOR UPDATE USING (auth.uid() = user_id);

-- day_settings policies
CREATE POLICY "Users can view own day settings" ON day_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own day settings" ON day_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own day settings" ON day_settings FOR UPDATE USING (auth.uid() = user_id);

-- backlog_items policies
CREATE POLICY "Users can view own backlog" ON backlog_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own backlog" ON backlog_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own backlog" ON backlog_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own backlog" ON backlog_items FOR DELETE USING (auth.uid() = user_id);

-- revision_queue policies
CREATE POLICY "Users can view own revisions" ON revision_queue FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own revisions" ON revision_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own revisions" ON revision_queue FOR UPDATE USING (auth.uid() = user_id);

-- mcq_bulk_entries policies
CREATE POLICY "Users can view own mcq bulk" ON mcq_bulk_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mcq bulk" ON mcq_bulk_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- mcq_individual_entries policies
CREATE POLICY "Users can view own mcq individual" ON mcq_individual_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mcq individual" ON mcq_individual_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mcq individual" ON mcq_individual_entries FOR UPDATE USING (auth.uid() = user_id);

-- gt_logs policies
CREATE POLICY "Users can view own gt logs" ON gt_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gt logs" ON gt_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gt logs" ON gt_logs FOR UPDATE USING (auth.uid() = user_id);

-- weekly_summaries policies
CREATE POLICY "Users can view own summaries" ON weekly_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own summaries" ON weekly_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- quotes are public read (no user_id column, shared data)
CREATE POLICY "Anyone can view quotes" ON quotes FOR SELECT USING (true);
CREATE POLICY "Service role can update quotes" ON quotes FOR UPDATE USING (true);

-- app_settings policies
CREATE POLICY "Users can view own settings" ON app_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON app_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON app_settings FOR UPDATE USING (auth.uid() = user_id);
```

### 6.2 Entity Relationship Summary

```
auth.users (1) ──── (1) app_settings
     │
     ├──── (100) schedule_days
     │         └──── (7 each) study_blocks
     │
     ├──── (up to 700) block_completions
     │
     ├──── (0-N) backlog_items
     │
     ├──── (0-N) revision_queue
     │
     ├──── (0-N) mcq_bulk_entries
     ├──── (0-N) mcq_individual_entries
     │
     ├──── (0-10) gt_logs
     │
     ├──── (0-15) weekly_summaries
     │
     └──── (100) day_settings

quotes (shared, no user_id)
```

---

## 7. Authentication

### Flow

1. Sampath creates one user account via Supabase dashboard (email + password).
2. Sampath provides credentials to the user.
3. User opens the app, sees login page.
4. User enters email + secret phrase (password).
5. `supabase.auth.signInWithPassword({ email, password })` is called.
6. Supabase sets HTTP-only session cookies via `@supabase/ssr`.
7. Session persists permanently on that device. She never sees login again unless she logs out.
8. Both iPhone and Tab can be logged in simultaneously (same credentials, different sessions).

### Implementation

**`src/lib/supabase/server.ts`** (Server Component client):

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch { /* Called from Server Component, ignored */ }
        },
      },
    }
  );
}
```

**`src/lib/supabase/client.ts`** (Browser client):

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**`src/middleware.ts`** (Session refresh + auth guard):

```typescript
import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const isAuthPage = request.nextUrl.pathname.startsWith('/login');
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');

  if (!user && !isAuthPage && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/today', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons|splash|sw.js|manifest).*)'],
};
```

---

## 8. Schedule Engine

### `src/lib/schedule/schedule-engine.ts`

```typescript
import { ScheduleDay, StudyBlock, AppSettings } from '@/lib/types';

/**
 * Calculate the current day number based on Day 1 date and today's date.
 * Returns 0 if before Day 1, 101+ if after Day 100.
 */
export function getCurrentDayNumber(dayOneDate: Date): number {
  const today = new Date();
  // Use IST (UTC+5:30) for date calculations
  const istOffset = 5.5 * 60 * 60 * 1000;
  const todayIST = new Date(today.getTime() + istOffset);
  const dayOneIST = new Date(dayOneDate.getTime() + istOffset);

  const diffMs = todayIST.getTime() - dayOneIST.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Day 1 = first day
}

/**
 * Map all 100 days to actual dates starting from Day 1.
 */
export function mapScheduleDates(dayOneDate: Date): Map<number, Date> {
  const dateMap = new Map<number, Date>();
  for (let i = 0; i < 100; i++) {
    const date = new Date(dayOneDate);
    date.setDate(date.getDate() + i);
    dateMap.set(i + 1, date);
  }
  return dateMap;
}

/**
 * Get the phase information for a given day number.
 * Phases are parsed from the schedule_days.phase column.
 */
export function getPhaseInfo(phase: string): { name: string; description: string } {
  const phaseDescriptions: Record<string, string> = {
    'Orientation + baseline': 'Setting your baseline. Every journey starts here.',
    'First pass (concept rescue + notes marking)': 'Building foundations. One subject at a time.',
    'Grand test + analysis': 'Testing what you know. Analysis is where the learning happens.',
    'Revision 1 (notes + QBank + PYQ)': 'First revision cycle. Faster this time.',
    'Revision 1 (mixed PYQ repair)': 'Repairing gaps found in PYQs.',
    'Revision 2 (compression phase)': 'Compressing knowledge. Speed is the priority.',
    'Revision 2 (image-heavy)': 'Image-based mastery. Visual recall matters.',
    'Revision 2 (PYQ day)': 'PYQ-focused revision.',
    'Revision 2 (error elimination)': 'Hunting down recurring mistakes.',
    'Revision 2 (volatile list day)': 'Locking in volatile facts.',
    'Revision 2 (buffer)': 'Buffer day. Catch up or reinforce.',
    'Final assault': 'The final push. Trust your preparation.',
    'Pre-exam day': 'Light review only. Sleep is your priority tonight.',
  };

  const name = phase;
  const description = phaseDescriptions[phase] || 'Stay focused.';
  return { name, description };
}

/**
 * Get which blocks are visible based on traffic light.
 */
export function getVisibleBlocks(
  allBlocks: StudyBlock[],
  trafficLight: 'green' | 'yellow' | 'red'
): { visible: StudyBlock[]; hidden: StudyBlock[] } {
  switch (trafficLight) {
    case 'green':
      return { visible: allBlocks, hidden: [] };

    case 'yellow': {
      const keptTypes = ['morning_revision', 'block_a', 'block_b', 'mcq', 'night_recall'];
      const visible = allBlocks.filter(b => keptTypes.includes(b.block_type));
      const hidden = allBlocks.filter(b => !keptTypes.includes(b.block_type));
      return { visible, hidden };
    }

    case 'red': {
      // Red keeps: morning_revision (as volatile review), one block for 25 MCQs,
      // one block for high-confidence subject
      const keptTypes = ['morning_revision'];
      const visible = allBlocks.filter(b => keptTypes.includes(b.block_type));
      // Also keep first available content block for salvage
      const salvageBlock = allBlocks.find(b => b.block_type === 'block_a');
      if (salvageBlock) visible.push(salvageBlock);
      const hidden = allBlocks.filter(b => !visible.includes(b));
      return { visible, hidden };
    }
  }
}

/**
 * Check if today is a GT day.
 */
export function isGTDay(scheduleDay: ScheduleDay): boolean {
  return scheduleDay.gt_test !== 'No' && scheduleDay.gt_test !== null;
}

/**
 * Check the hard boundary for schedule operations.
 * No study block can be scheduled on or after August 20, 2026.
 */
export function isWithinHardBoundary(date: Date): boolean {
  const boundary = new Date('2026-08-20');
  return date < boundary;
}
```

---

## 9. Morning Revision Queue

### `src/lib/schedule/revision-calculator.ts`

```typescript
import { RevisionQueueItem } from '@/lib/types';

/**
 * Revision intervals in days from actual completion date.
 */
const REVISION_INTERVALS = [1, 3, 7, 14, 28] as const;
const REVISION_TYPES = ['D+1', 'D+3', 'D+7', 'D+14', 'D+28'] as const;

/**
 * Generate revision queue entries when a study block is completed.
 * Called when a block_completion status changes to 'completed'.
 *
 * @param sourceDay - The day number of the completed block
 * @param blockType - The type of block completed
 * @param topic - The topic/subject from the schedule
 * @param actualCompletionDate - When she actually completed it (may differ from scheduled date)
 */
export function generateRevisionEntries(
  sourceDay: number,
  blockType: string,
  topic: string,
  subject: string,
  actualCompletionDate: Date
): Omit<RevisionQueueItem, 'id' | 'user_id' | 'created_at'>[] {
  return REVISION_INTERVALS.map((interval, index) => {
    const scheduledDate = new Date(actualCompletionDate);
    scheduledDate.setDate(scheduledDate.getDate() + interval);

    return {
      source_day: sourceDay,
      source_block_type: blockType,
      topic,
      subject,
      revision_type: REVISION_TYPES[index],
      scheduled_date: scheduledDate.toISOString().split('T')[0],
      actual_completion_date: actualCompletionDate.toISOString().split('T')[0],
      status: 'pending',
      assigned_slot: 'morning_revision',
    };
  });
}

/**
 * Get today's morning revision queue.
 * Maximum 5 items in the morning block. Overflow goes to night_recall and break slots.
 *
 * @param allPendingRevisions - All revision items scheduled for today
 * @returns Object with morning items (max 5), overflow items, and their assigned slots
 */
export function buildMorningQueue(
  allPendingRevisions: RevisionQueueItem[]
): {
  morningItems: RevisionQueueItem[];
  overflowItems: { item: RevisionQueueItem; slot: string }[];
  hasOverflowWarning: boolean;
  consecutiveOverflowDays: number;
} {
  // Sort by priority: D+1 first (most urgent), then D+3, D+7, D+14, D+28
  const sorted = [...allPendingRevisions].sort((a, b) => {
    const order = { 'D+1': 1, 'D+3': 2, 'D+7': 3, 'D+14': 4, 'D+28': 5 };
    return (order[a.revision_type] || 99) - (order[b.revision_type] || 99);
  });

  const morningItems = sorted.slice(0, 5);
  const overflow = sorted.slice(5);

  // Distribute overflow to available slots
  const overflowSlots = [
    'night_recall',             // 22:00-23:00 (primary overflow)
    'break_08:00',              // 08:00-08:15 (2-min quick recall)
    'break_10:45',              // 10:45-11:00 (2-min quick recall)
    'break_16:45',              // 16:45-17:00 (2-min quick recall)
    'break_21:45',              // 21:45-22:00 (2-min quick recall)
  ];

  const overflowItems = overflow.map((item, index) => ({
    item,
    slot: overflowSlots[index % overflowSlots.length],
  }));

  return {
    morningItems,
    overflowItems,
    hasOverflowWarning: overflow.length > 0,
    consecutiveOverflowDays: 0, // Must be calculated from historical data
  };
}

/**
 * Handle overdue revision items based on how many days overdue.
 * Called by the midnight cron or when loading the revision queue.
 *
 * Rules (from PRD SCHED-12):
 * - 1-2 days overdue: added to next morning queue (still valuable)
 * - 3-6 days overdue: bundled into "catch-up revision" mini-block
 * - 7+ days overdue: flagged for full re-study, removed from daily queue
 */
export function categorizeOverdueItems(
  items: RevisionQueueItem[],
  today: Date
): {
  stillValuable: RevisionQueueItem[];      // 1-2 days overdue, add to morning
  catchUpBundle: RevisionQueueItem[];       // 3-6 days overdue, suggest during consolidation/PYQ
  deferToNextPhase: RevisionQueueItem[];    // 7+ days overdue, remove from queue
} {
  const stillValuable: RevisionQueueItem[] = [];
  const catchUpBundle: RevisionQueueItem[] = [];
  const deferToNextPhase: RevisionQueueItem[] = [];

  for (const item of items) {
    const scheduledDate = new Date(item.scheduled_date);
    const daysOverdue = Math.floor(
      (today.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue <= 2) {
      stillValuable.push(item);
    } else if (daysOverdue <= 6) {
      catchUpBundle.push(item);
    } else {
      deferToNextPhase.push(item);
    }
  }

  return { stillValuable, catchUpBundle, deferToNextPhase };
}

/**
 * Calculate time allocation per morning revision item.
 * Morning block is 06:30-08:00 = 90 minutes.
 */
export function calculateTimePerItem(itemCount: number): number {
  const MORNING_BLOCK_MINUTES = 90;
  if (itemCount === 0) return 0;
  return Math.floor(MORNING_BLOCK_MINUTES / Math.min(itemCount, 5));
}
```

---

## 10. Today View

The Today View is the home screen. It is a Server Component that fetches initial data, with Client Components for interactive elements.

### Data Loading (Server Component)

```typescript
// src/app/(app)/today/page.tsx
// This is a Server Component. It fetches all data needed for the Today View.

export default async function TodayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const settings = await getAppSettings(supabase, user.id);
  const currentDay = getCurrentDayNumber(settings.day_one_date);
  const scheduleDay = await getScheduleDay(supabase, user.id, currentDay);
  const blocks = await getStudyBlocks(supabase, user.id, currentDay);
  const completions = await getBlockCompletions(supabase, user.id, currentDay);
  const daySettings = await getDaySettings(supabase, user.id, currentDay);
  const revisionQueue = await getRevisionQueue(supabase, user.id, currentDay);
  const backlogCount = await getBacklogCount(supabase, user.id);
  const quote = await getDailyQuote(supabase, daySettings.traffic_light);

  return (
    <TodayViewClient
      scheduleDay={scheduleDay}
      blocks={blocks}
      completions={completions}
      daySettings={daySettings}
      revisionQueue={revisionQueue}
      backlogCount={backlogCount}
      quote={quote}
      currentDay={currentDay}
      settings={settings}
    />
  );
}
```

### Layout (Client Component, top to bottom)

1. **Header**: App name "Beside You" (tappable for easter egg), "Day 34 / 100" badge, phase name, date
2. **Motivational Quote**: One quote, category-based on traffic light
3. **Traffic Light Toggle**: Green / Yellow / Red buttons
4. **Morning Revision Checklist**: Individual checkboxes, time per item, overflow subsection
5. **Study Block Cards**: 7 cards in chronological order with break separators
6. **MCQ Quick Log Button**: Floating action button
7. **Backlog Indicator**: Badge with pending count
8. **Wind-Down Prompt**: Triggered at 22:30, 23:00, 23:15 (if app is open)
9. **Completion Celebration**: When all blocks for current traffic light level are done

---

## 11. Traffic Light System

### State Management

Traffic light state is stored in `day_settings` table per day. Defaults to `'green'` each morning. Changes are written to Supabase immediately.

### `src/components/today/traffic-light.tsx`

```typescript
interface TrafficLightProps {
  currentLight: 'green' | 'yellow' | 'red';
  dayNumber: number;
  completedBlockTypes: string[];  // blocks already completed today
  onLightChange: (light: 'green' | 'yellow' | 'red') => void;
}

/**
 * Traffic light change handler.
 *
 * When changing traffic light:
 * 1. Update day_settings.traffic_light in Supabase
 * 2. Determine which blocks become hidden
 * 3. For hidden blocks that are still 'pending':
 *    - Create backlog_items with appropriate source_tag
 *    - Update block_completions to status = 'rescheduled'
 * 4. Blocks already 'completed' stay completed regardless of light change
 * 5. If switching BACK to green from yellow/red:
 *    - Restore blocks: delete backlog_items created today with matching source_tag
 *    - Update block_completions back to 'pending'
 *
 * Quote logic:
 * - Green: show 'daily' category quote
 * - Yellow or Red: show 'tough_day' category quote
 * - Switching back to Green: restore original daily quote
 */
```

---

## 12. Backlog Queue System (All Branches)

This is the most complex subsystem. There are 6 distinct paths that create backlog items, and 4 actions a user can take on each item.

### 12.1 Backlog Creation Paths

#### Path 1: Traffic Light Change (Yellow/Red Day)

**Trigger:** User taps Yellow or Red on the traffic light toggle.

**Logic (in `src/lib/schedule/backlog-engine.ts`):**

```typescript
/**
 * Handle traffic light change to Yellow or Red.
 * Creates backlog items for blocks that get hidden.
 *
 * @param dayNumber - Current day
 * @param newLight - 'yellow' or 'red'
 * @param allBlocks - All 7 study blocks for today
 * @param completions - Current completion statuses
 * @param scheduleDay - Today's schedule data (for topic/subject parsing)
 */
export async function handleTrafficLightDowngrade(
  supabase: SupabaseClient,
  userId: string,
  dayNumber: number,
  newLight: 'yellow' | 'red',
  allBlocks: StudyBlock[],
  completions: BlockCompletion[],
  scheduleDay: ScheduleDay
): Promise<void> {
  const { visible, hidden } = getVisibleBlocks(allBlocks, newLight);

  for (const block of hidden) {
    const completion = completions.find(c => c.block_type === block.block_type);

    // Only create backlog for blocks that are still pending
    if (!completion || completion.status === 'pending') {
      // 1. Create backlog item
      await supabase.from('backlog_items').insert({
        user_id: userId,
        original_day: dayNumber,
        original_block_type: block.block_type,
        topic_description: block.description,
        subject: parseSubject(scheduleDay.primary_focus),
        source_tag: newLight === 'yellow' ? 'yellow_day' : 'red_day',
        status: 'pending',
        ...generateSuggestion(block, dayNumber, scheduleDay),
      });

      // 2. Update block completion to rescheduled
      await supabase.from('block_completions').upsert({
        user_id: userId,
        day_number: dayNumber,
        block_type: block.block_type,
        status: 'rescheduled',
        source_tag: newLight === 'yellow' ? 'yellow_day' : 'red_day',
        traffic_light_at_completion: newLight,
      });
    }
  }
}
```

#### Path 1b: Traffic Light Restoration (Back to Green)

**Trigger:** User switches from Yellow/Red back to Green on the same day.

```typescript
/**
 * Handle traffic light upgrade back to Green.
 * Restores blocks that were moved to backlog by the traffic light downgrade.
 * Only works for items created TODAY with matching source_tag.
 */
export async function handleTrafficLightUpgrade(
  supabase: SupabaseClient,
  userId: string,
  dayNumber: number,
  previousLight: 'yellow' | 'red'
): Promise<void> {
  const sourceTag = previousLight === 'yellow' ? 'yellow_day' : 'red_day';

  // 1. Delete backlog items created for today's traffic light change
  await supabase
    .from('backlog_items')
    .delete()
    .match({
      user_id: userId,
      original_day: dayNumber,
      source_tag: sourceTag,
      status: 'pending', // only restore items that haven't been rescheduled/completed
    });

  // 2. Restore block completions to pending
  await supabase
    .from('block_completions')
    .update({ status: 'pending', source_tag: null })
    .match({
      user_id: userId,
      day_number: dayNumber,
      source_tag: sourceTag,
      status: 'rescheduled',
    });
}
```

#### Path 2: Manual Skip

**Trigger:** User taps "Skip" on a study block card.

```typescript
/**
 * Handle manual block skip.
 */
export async function handleManualSkip(
  supabase: SupabaseClient,
  userId: string,
  dayNumber: number,
  blockType: string,
  scheduleDay: ScheduleDay,
  block: StudyBlock
): Promise<void> {
  // 1. Update block completion
  await supabase.from('block_completions').upsert({
    user_id: userId,
    day_number: dayNumber,
    block_type: blockType,
    status: 'skipped',
  });

  // 2. Create backlog item (unless it's morning_revision, which re-enters revision system)
  if (blockType !== 'morning_revision') {
    await supabase.from('backlog_items').insert({
      user_id: userId,
      original_day: dayNumber,
      original_block_type: blockType,
      topic_description: block.description,
      subject: parseSubject(scheduleDay.primary_focus),
      source_tag: 'skipped',
      status: 'pending',
      ...generateSuggestion(block, dayNumber, scheduleDay),
    });
  }
  // Morning revision items are handled by the revision queue system (SCHED-12)
}
```

#### Path 3: Midnight Auto-Miss (Server-Side Cron)

**Trigger:** pg_cron Edge Function at 00:00 IST.

```typescript
/**
 * Midnight cron: mark all pending blocks as missed, create backlog items.
 * Runs as Supabase Edge Function triggered by pg_cron.
 *
 * This is the ONLY server-side backlog creation path.
 * All other paths are client-side.
 */
export async function midnightAutoMiss(supabase: SupabaseClient): Promise<void> {
  // 1. Get the day that just ended (yesterday in IST)
  const yesterdayDayNumber = calculateYesterdayDayNumber();

  // 2. Find all block_completions for that day where status = 'pending'
  const { data: pendingBlocks } = await supabase
    .from('block_completions')
    .select('*, study_blocks(*), schedule_days(*)')
    .match({ day_number: yesterdayDayNumber, status: 'pending' });

  if (!pendingBlocks || pendingBlocks.length === 0) return;

  for (const block of pendingBlocks) {
    // 3. Update to missed
    await supabase
      .from('block_completions')
      .update({ status: 'missed' })
      .eq('id', block.id);

    // 4. Create backlog item (skip morning_revision)
    if (block.block_type !== 'morning_revision') {
      await supabase.from('backlog_items').insert({
        user_id: block.user_id,
        original_day: yesterdayDayNumber,
        original_block_type: block.block_type,
        topic_description: block.study_blocks?.description,
        subject: parseSubject(block.schedule_days?.primary_focus),
        source_tag: 'missed',
        status: 'pending',
      });
    }
  }

  // 5. Handle overdue morning revision items (re-enter revision system)
  await handleOverdueRevisionItems(supabase, yesterdayDayNumber);

  // 6. Check if schedule shift should be suggested
  await checkScheduleShiftTrigger(supabase, yesterdayDayNumber);
}
```

#### Path 4: Overrun Cascade

**Trigger:** User edits a block's end time to be later than scheduled, causing the next block to be pushed.

```typescript
// src/lib/schedule/block-cascade.ts

/**
 * Handle block time overrun.
 *
 * When a block runs over:
 * 1. Detect which subsequent blocks are affected
 * 2. For each affected block, present options:
 *    - Shorten the next block
 *    - Move the overflowed content to backlog
 * 3. If cascade would push any block past 23:00, force to backlog
 *
 * @param editedBlock - The block whose end time was extended
 * @param newEndTime - The new end time
 * @param subsequentBlocks - All blocks after the edited one today
 */
export function calculateCascade(
  editedBlock: StudyBlock,
  newEndTime: string, // "HH:MM" format
  subsequentBlocks: StudyBlock[]
): CascadeResult {
  const overrunMinutes = timeToMinutes(newEndTime) - timeToMinutes(editedBlock.scheduled_end);

  if (overrunMinutes <= 0) return { affected: [], sleepViolation: false };

  const affected: CascadeAffectedBlock[] = [];
  let cumulativeShift = overrunMinutes;

  for (const block of subsequentBlocks) {
    const newStart = addMinutes(block.scheduled_start, cumulativeShift);
    const newEnd = addMinutes(block.scheduled_end, cumulativeShift);

    // Sleep protection: check if this block would go past 23:00
    if (timeToMinutes(newEnd) > timeToMinutes('23:00')) {
      affected.push({
        block,
        action: 'force_to_backlog',
        reason: 'Would extend past 23:00. Moved to backlog to protect sleep.',
      });
      // All subsequent blocks also go to backlog
      continue;
    }

    affected.push({
      block,
      newStartTime: newStart,
      newEndTime: newEnd,
      shiftMinutes: cumulativeShift,
      action: 'needs_decision', // User decides: shorten or backlog
    });
  }

  return {
    affected,
    sleepViolation: affected.some(a => a.action === 'force_to_backlog'),
  };
}

/**
 * Apply cascade decision: move a block to backlog due to overrun.
 */
export async function applyOverrunBacklog(
  supabase: SupabaseClient,
  userId: string,
  dayNumber: number,
  block: StudyBlock,
  scheduleDay: ScheduleDay
): Promise<void> {
  await supabase.from('backlog_items').insert({
    user_id: userId,
    original_day: dayNumber,
    original_block_type: block.block_type,
    topic_description: block.description,
    subject: parseSubject(scheduleDay.primary_focus),
    source_tag: 'overrun_cascade',
    status: 'pending',
  });

  await supabase.from('block_completions').upsert({
    user_id: userId,
    day_number: dayNumber,
    block_type: block.block_type,
    status: 'rescheduled',
    source_tag: 'overrun_cascade',
  });
}
```

#### Path 5: Wind-Down Auto-Move

**Trigger:** App is open at 23:15, uncompleted blocks exist. Or user taps "Yes, wrap up" at the 22:30 or 23:00 prompt.

```typescript
/**
 * Wind-down: move all remaining uncompleted blocks to backlog.
 * Triggered at 23:15 automatically, or earlier by user choice.
 */
export async function windDownMoveToBacklog(
  supabase: SupabaseClient,
  userId: string,
  dayNumber: number,
  pendingBlocks: StudyBlock[],
  scheduleDay: ScheduleDay
): Promise<void> {
  for (const block of pendingBlocks) {
    // Skip morning_revision (handled by revision system)
    if (block.block_type === 'morning_revision') continue;

    await supabase.from('backlog_items').insert({
      user_id: userId,
      original_day: dayNumber,
      original_block_type: block.block_type,
      topic_description: block.description,
      subject: parseSubject(scheduleDay.primary_focus),
      source_tag: 'missed', // Wind-down items are effectively missed
      status: 'pending',
    });

    await supabase.from('block_completions').upsert({
      user_id: userId,
      day_number: dayNumber,
      block_type: block.block_type,
      status: 'missed',
      notes: 'Moved to backlog by wind-down prompt',
    });
  }
}
```

### 12.2 Backlog Suggestion Engine

```typescript
// src/lib/schedule/backlog-engine.ts

/**
 * Generate a reschedule suggestion for a backlog item.
 * Returns the suggested day number, slot, and a human-readable note.
 *
 * Rules:
 * - Content blocks (block_a, block_b) -> next same-subject day or next consolidation slot
 * - MCQ blocks -> merge with next day's MCQ block
 * - PYQ/Image blocks -> next day's PYQ slot
 * - Consolidation blocks -> next day's consolidation slot
 * - Night recall blocks -> next night block (stacks easily)
 * - Morning revision -> NOT handled here (goes through revision_queue system)
 *
 * Constraints:
 * - Never suggest a slot that would push past 23:00
 * - Never suggest a slot on a day that already has a rescheduled block in the same slot
 * - Never suggest a day past the hard boundary (August 20, 2026)
 */
export function generateSuggestion(
  block: StudyBlock,
  currentDay: number,
  scheduleDay: ScheduleDay
): { suggested_day: number | null; suggested_slot: string | null; suggested_note: string | null } {
  // Implementation depends on loading future schedule_days from DB.
  // This function should be called with the schedule context.
  // See full implementation below.
  return { suggested_day: null, suggested_slot: null, suggested_note: null };
}

/**
 * Full suggestion engine with schedule context.
 */
export async function generateSuggestionWithContext(
  supabase: SupabaseClient,
  userId: string,
  blockType: string,
  subject: string,
  currentDay: number
): Promise<{ suggested_day: number | null; suggested_slot: string | null; suggested_note: string | null }> {

  // Get future schedule days
  const { data: futureDays } = await supabase
    .from('schedule_days')
    .select('*')
    .eq('user_id', userId)
    .gt('day_number', currentDay)
    .order('day_number', { ascending: true });

  // Get existing rescheduled items to avoid overloading a slot
  const { data: existingBacklog } = await supabase
    .from('backlog_items')
    .select('rescheduled_to_day, rescheduled_to_slot')
    .eq('user_id', userId)
    .eq('status', 'rescheduled');

  const occupiedSlots = new Set(
    (existingBacklog || []).map(b => `${b.rescheduled_to_day}-${b.rescheduled_to_slot}`)
  );

  function isSlotAvailable(day: number, slot: string): boolean {
    return !occupiedSlots.has(`${day}-${slot}`);
  }

  if (!futureDays || futureDays.length === 0) {
    return { suggested_day: null, suggested_slot: null, suggested_note: null };
  }

  switch (blockType) {
    case 'block_a':
    case 'block_b': {
      // Try: next day with same subject in primary_focus
      const sameSubjectDay = futureDays.find(d =>
        d.primary_focus.includes(subject) && isSlotAvailable(d.day_number, 'consolidation')
      );
      if (sameSubjectDay) {
        return {
          suggested_day: sameSubjectDay.day_number,
          suggested_slot: 'consolidation',
          suggested_note: `Suggested during ${subject} consolidation on Day ${sameSubjectDay.day_number}.`,
        };
      }
      // Fallback: next day's consolidation slot
      const nextAvailable = futureDays.find(d => isSlotAvailable(d.day_number, 'consolidation'));
      if (nextAvailable) {
        return {
          suggested_day: nextAvailable.day_number,
          suggested_slot: 'consolidation',
          suggested_note: `Suggested for consolidation slot on Day ${nextAvailable.day_number}.`,
        };
      }
      return { suggested_day: null, suggested_slot: null, suggested_note: 'No compatible slot without cutting into sleep. Keeping in backlog.' };
    }

    case 'mcq': {
      const nextMcqDay = futureDays.find(d => isSlotAvailable(d.day_number, 'mcq'));
      if (nextMcqDay) {
        return {
          suggested_day: nextMcqDay.day_number,
          suggested_slot: 'mcq',
          suggested_note: `Add to MCQ block on Day ${nextMcqDay.day_number}. Increase target from 45-70 to 60-80.`,
        };
      }
      return { suggested_day: null, suggested_slot: null, suggested_note: null };
    }

    case 'pyq_image': {
      const nextPyqDay = futureDays.find(d => isSlotAvailable(d.day_number, 'pyq_image'));
      if (nextPyqDay) {
        return {
          suggested_day: nextPyqDay.day_number,
          suggested_slot: 'pyq_image',
          suggested_note: `Suggested for PYQ slot on Day ${nextPyqDay.day_number}.`,
        };
      }
      return { suggested_day: null, suggested_slot: null, suggested_note: null };
    }

    case 'consolidation': {
      const nextConsDay = futureDays.find(d => isSlotAvailable(d.day_number, 'consolidation'));
      if (nextConsDay) {
        return {
          suggested_day: nextConsDay.day_number,
          suggested_slot: 'consolidation',
          suggested_note: `Suggested for consolidation on Day ${nextConsDay.day_number}.`,
        };
      }
      return { suggested_day: null, suggested_slot: null, suggested_note: null };
    }

    case 'night_recall': {
      // Night recall is lightweight, always suggest next day
      const nextDay = currentDay + 1;
      if (nextDay <= 100) {
        return {
          suggested_day: nextDay,
          suggested_slot: 'night_recall',
          suggested_note: `Stack with tomorrow's night recall.`,
        };
      }
      return { suggested_day: null, suggested_slot: null, suggested_note: null };
    }

    default:
      return { suggested_day: null, suggested_slot: null, suggested_note: null };
  }
}
```

### 12.3 Backlog Item Actions

There are 4 actions a user can take on each backlog item:

```typescript
/**
 * Action 1: Accept suggestion (reschedule to suggested slot)
 */
export async function acceptSuggestion(
  supabase: SupabaseClient,
  backlogItemId: string,
  suggestedDay: number,
  suggestedSlot: string
): Promise<void> {
  await supabase
    .from('backlog_items')
    .update({
      status: 'rescheduled',
      rescheduled_to_day: suggestedDay,
      rescheduled_to_slot: suggestedSlot,
    })
    .eq('id', backlogItemId);
}

/**
 * Action 2: Manual reschedule (user picks a different day/slot)
 */
export async function manualReschedule(
  supabase: SupabaseClient,
  backlogItemId: string,
  targetDay: number,
  targetSlot: string
): Promise<void> {
  // Validate: target day must be in the future and within hard boundary
  await supabase
    .from('backlog_items')
    .update({
      status: 'rescheduled',
      rescheduled_to_day: targetDay,
      rescheduled_to_slot: targetSlot,
    })
    .eq('id', backlogItemId);
}

/**
 * Action 3: Mark as completed (retroactively)
 * User says "I actually did this" and picks a date.
 */
export async function markBacklogCompleted(
  supabase: SupabaseClient,
  backlogItemId: string,
  completionDate: Date
): Promise<void> {
  await supabase
    .from('backlog_items')
    .update({
      status: 'completed',
      completed_at: completionDate.toISOString(),
    })
    .eq('id', backlogItemId);

  // Also update the original block_completion if it was 'missed' or 'rescheduled'
  const { data: item } = await supabase
    .from('backlog_items')
    .select('original_day, original_block_type, user_id')
    .eq('id', backlogItemId)
    .single();

  if (item) {
    await supabase.from('block_completions').upsert({
      user_id: item.user_id,
      day_number: item.original_day,
      block_type: item.original_block_type,
      status: 'completed',
      completed_at: completionDate.toISOString(),
    });

    // Trigger revision queue generation for the completed block
    // (revision entries based on ACTUAL completion date)
  }
}

/**
 * Action 4: Dismiss (accept it won't be done, remove from queue)
 */
export async function dismissBacklogItem(
  supabase: SupabaseClient,
  backlogItemId: string
): Promise<void> {
  await supabase
    .from('backlog_items')
    .update({
      status: 'dismissed',
      dismissed_at: new Date().toISOString(),
    })
    .eq('id', backlogItemId);
}

/**
 * Bulk dismiss: dismiss all items with a given source_tag
 */
export async function bulkDismiss(
  supabase: SupabaseClient,
  userId: string,
  sourceTag: string
): Promise<void> {
  await supabase
    .from('backlog_items')
    .update({
      status: 'dismissed',
      dismissed_at: new Date().toISOString(),
    })
    .match({ user_id: userId, source_tag: sourceTag, status: 'pending' });
}
```

### 12.4 Backlog Queue View Data

```typescript
/**
 * Load backlog queue data for the Backlog Queue view.
 */
export async function loadBacklogQueue(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  items: BacklogItem[];
  summary: { total: number; fromMissed: number; fromYellowRed: number; fromOverrun: number };
}> {
  const { data: items } = await supabase
    .from('backlog_items')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const allItems = items || [];

  return {
    items: allItems,
    summary: {
      total: allItems.length,
      fromMissed: allItems.filter(i => ['missed', 'skipped'].includes(i.source_tag)).length,
      fromYellowRed: allItems.filter(i => ['yellow_day', 'red_day'].includes(i.source_tag)).length,
      fromOverrun: allItems.filter(i => i.source_tag === 'overrun_cascade').length,
    },
  };
}
```

---

## 13. Schedule Shift Mechanism

### Detection (runs in midnight cron)

```typescript
/**
 * Check if schedule shift should be suggested.
 * Trigger: 2+ days with 5+/7 blocks missed/skipped in the last 7 days.
 */
export async function checkScheduleShiftTrigger(
  supabase: SupabaseClient,
  currentDay: number
): Promise<void> {
  const lookbackStart = Math.max(1, currentDay - 6);

  const { data: recentCompletions } = await supabase
    .from('block_completions')
    .select('day_number, status')
    .gte('day_number', lookbackStart)
    .lte('day_number', currentDay)
    .in('status', ['missed', 'skipped']);

  // Count missed/skipped blocks per day
  const missedPerDay = new Map<number, number>();
  for (const c of recentCompletions || []) {
    missedPerDay.set(c.day_number, (missedPerDay.get(c.day_number) || 0) + 1);
  }

  // Count days with 5+ missed blocks
  const heavilyMissedDays = Array.from(missedPerDay.entries())
    .filter(([_, count]) => count >= 5)
    .length;

  if (heavilyMissedDays >= 2) {
    await supabase
      .from('app_settings')
      .update({ suggest_shift: true })
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id);
  }
}
```

### Preview (dry run, client-side)

```typescript
// src/lib/schedule/schedule-shift.ts

export interface ShiftPreview {
  shiftDays: number;
  bufferDaysAvailable: number;
  bufferDaysNeeded: number;
  isCleanShift: boolean;          // buffers fully cover the shift
  mergedDays: MergedDay[];        // which Final Assault days get compressed
  hardBoundaryViolation: boolean; // would shift past August 20, 2026
}

interface MergedDay {
  originalDays: number[];
  mergedDescription: string;
}

/**
 * Calculate schedule shift preview.
 * This is a dry run. No data is modified.
 */
export async function calculateShiftPreview(
  supabase: SupabaseClient,
  userId: string,
  missedDayCount: number
): Promise<ShiftPreview> {
  // 1. Count buffer days in the schedule
  const { data: bufferDays } = await supabase
    .from('schedule_days')
    .select('day_number')
    .eq('user_id', userId)
    .eq('is_buffer_day', true)
    .eq('is_shifted', false);

  const bufferDaysAvailable = bufferDays?.length || 0;
  const bufferDaysNeeded = missedDayCount;
  const isCleanShift = bufferDaysAvailable >= bufferDaysNeeded;

  // 2. If not a clean shift, calculate which Final Assault days get merged
  let mergedDays: MergedDay[] = [];
  if (!isCleanShift) {
    const excessDays = bufferDaysNeeded - bufferDaysAvailable;
    mergedDays = calculateFinalAssaultMerges(excessDays);
  }

  // 3. Check hard boundary
  const { data: lastDay } = await supabase
    .from('schedule_days')
    .select('mapped_date')
    .eq('user_id', userId)
    .order('day_number', { ascending: false })
    .limit(1)
    .single();

  const lastDate = new Date(lastDay?.mapped_date);
  lastDate.setDate(lastDate.getDate() + missedDayCount);
  const hardBoundary = new Date('2026-08-20');
  const hardBoundaryViolation = lastDate >= hardBoundary;

  return {
    shiftDays: missedDayCount,
    bufferDaysAvailable,
    bufferDaysNeeded,
    isCleanShift,
    mergedDays,
    hardBoundaryViolation,
  };
}

/**
 * Apply schedule shift. This modifies the database.
 * Called ONLY after user confirms the preview.
 */
export async function applyScheduleShift(
  supabase: SupabaseClient,
  userId: string,
  shiftDays: number,
  bufferDaysToConsume: number[]  // day_numbers of buffer days to remove
): Promise<void> {
  // This should be a Supabase RPC (database function) for atomicity
  await supabase.rpc('apply_schedule_shift', {
    p_user_id: userId,
    p_shift_days: shiftDays,
    p_buffer_days: bufferDaysToConsume,
  });

  // The RPC function does:
  // 1. Shift all schedule_days.mapped_date forward by shiftDays
  // 2. Mark consumed buffer days as is_shifted = true
  // 3. Merge Final Assault days if buffers insufficient
  // 4. Recalculate all revision_queue.scheduled_date entries
  // 5. Clear backlog items now covered by the shifted schedule
  // 6. Update GT schedule dates
  // 7. Update app_settings.schedule_shift_total
  // 8. Reset app_settings.suggest_shift = false
}

/**
 * Calculate which Final Assault days (85-100) get merged.
 * Merging happens from the end backward.
 */
function calculateFinalAssaultMerges(excessDays: number): MergedDay[] {
  // Mergeable pairs in the Final Assault phase (Days 85-100):
  // Priority order for merging (least impactful first):
  const mergeablePairs = [
    { days: [99, 100], description: 'Wrong notebook final pass 1 & 2 merged into one day' },
    { days: [97, 98], description: 'Emergency algorithm day + direct repeats merged' },
    { days: [95, 96], description: 'Super-revision days combined' },
    { days: [93, 94], description: 'Compression days combined' },
    { days: [91, 92], description: 'Earlier revision days combined' },
  ];

  const mergedDays: MergedDay[] = [];
  let daysRecovered = 0;

  for (const pair of mergeablePairs) {
    if (daysRecovered >= excessDays) break;
    mergedDays.push({
      originalDays: pair.days,
      mergedDescription: pair.description,
    });
    daysRecovered += 1; // Each merge recovers 1 day (2 days become 1)
  }

  return mergedDays;
}
```

---

## 14. Wind-Down Prompt System

### `src/hooks/use-wind-down.ts`

```typescript
/**
 * Client-side hook for wind-down prompts.
 * Checks the current IST time every 30 seconds.
 *
 * Prompt schedule:
 * - 22:30: "It's getting late. Move remaining blocks to backlog and wind down?"
 *          Options: "Yes, wrap up" | "I'm almost done" (dismisses for 15 min)
 * - 22:45: Re-appears if dismissed at 22:30 (one more chance)
 * - 23:00: "Time to rest. Do a quick 5-minute version, or skip tonight's recall?"
 *          Options: "Quick version" (partial complete) | "Skip and sleep" (backlog)
 * - 23:15: Auto-move all remaining to backlog. Show: "Moved to backlog. Sleep well."
 *
 * Rules:
 * - Only shows if the app is OPEN (not a notification)
 * - Only shows if there are uncompleted blocks
 * - Night Recall block (22:00-23:00) gets special handling at 23:00
 * - After 23:15 auto-move, no more prompts
 */
export function useWindDown(
  pendingBlocks: StudyBlock[],
  onWrapUp: () => void,
  onQuickVersion: () => void,
  onAutoMove: () => void
): {
  showPrompt: boolean;
  promptType: 'wrap_up' | 'night_recall' | 'auto_move' | null;
  promptMessage: string;
  dismissPrompt: () => void;
} {
  // Implementation: setInterval checking IST time every 30 seconds
  // State machine: idle -> 22:30_prompt -> dismissed -> 22:45_prompt -> 23:00_prompt -> 23:15_auto
}
```

---

## 15. MCQ Tracker

Two modes: Bulk Entry and One-by-One Entry.

### Bulk Entry Form Fields

| Field | Type | Required | Default |
|---|---|---|---|
| Total Attempted | number | Yes | - |
| Correct | number | Yes | - |
| Wrong | number | Yes | Auto-calc (Total - Correct) |
| Subject | dropdown (19 subjects) | No | - |
| Source | text with suggestions | No | - |
| Date | date picker | No | Today |

### One-by-One Entry Form Fields

| Field | Type | Required | Default | Persists Between Entries |
|---|---|---|---|---|
| MCQ ID | text/number | Yes | - | No |
| Result | 3 buttons: Right/Wrong/Guessed Right | Yes | - | No |
| Subject | dropdown | No (collapsed) | - | Yes |
| Topic | text + autocomplete | No (collapsed) | - | No |
| Source | text + suggestions | No (collapsed) | - | Yes |
| Cause Code | dropdown (10 codes) | No (collapsed) | - | No |
| Priority | 3 buttons: P1/P2/P3 | No (collapsed) | - | No |
| Correct Rule | text, 1-2 lines | No (collapsed) | - | No |
| What Fooled Me | text | No (collapsed) | - | No |
| Fix Codes | multi-select chips (11 options) | No (collapsed) | - | No |
| Tags | multi-select chips (7 options) | No (collapsed) | - | No |

The "Add details" expander remembers its last state within a session.

---

## 16. GT Tracker

### GT Schedule (from Excel)

| Day | Test Type |
|---|---|
| 1 | Diagnostic 100Q |
| 41 | GT-1 (end of first pass) |
| 48 | GT-2 |
| 58 | GT-3 |
| 63 | GT-4 |
| 66 | GT-5 |
| 73 | GT-6 |
| 78 | GT-7 |
| 82 | GT-8 |
| 87 | GT-9 |
| 93 | 120Q half-simulation |

GT days adjust if the schedule shifts.

---

## 17. Weekly Auto-Summary

### Generation Trigger

- Auto-generated every Sunday at end of day (pg_cron Edge Function)
- Also triggerable manually ("Generate summary now" button)

### Content (computed from DB queries)

See `weekly_summaries` table schema for all fields stored.

---

## 18. Motivational Quotes System

### Selection Logic

```typescript
// src/lib/quotes/quote-selector.ts

/**
 * Select a quote for the given category.
 * Quotes do not repeat until all quotes in the category have been shown.
 *
 * @param category - 'daily', 'tough_day', or 'celebration'
 */
export async function selectQuote(
  supabase: SupabaseClient,
  category: 'daily' | 'tough_day' | 'celebration'
): Promise<Quote> {
  // 1. Get the quote with the lowest shown_count in this category
  const { data: quote } = await supabase
    .from('quotes')
    .select('*')
    .eq('category', category)
    .order('shown_count', { ascending: true })
    .order('last_shown_at', { ascending: true, nullsFirst: true })
    .limit(1)
    .single();

  // 2. Increment shown_count and update last_shown_at
  await supabase
    .from('quotes')
    .update({
      shown_count: (quote.shown_count || 0) + 1,
      last_shown_at: new Date().toISOString(),
    })
    .eq('id', quote.id);

  return quote;
}
```

---

## 19. Schedule Browser

- Calendar or list view of all 100 days
- Color-coded: completed (green), today (blue), upcoming (gray), missed (amber)
- Past days are viewable AND editable (retroactive completion)
- Future days are viewable but NOT editable

---

## 20. Cron Jobs

### 20.1 Midnight Auto-Miss (pg_cron + Edge Function)

```sql
-- 005_setup_cron.sql

-- Schedule midnight cron at 00:00 IST (18:30 UTC)
SELECT cron.schedule(
  'midnight-auto-miss',
  '30 18 * * *',  -- 18:30 UTC = 00:00 IST
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/midnight-cron',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'
  );
  $$
);
```

### 20.2 Weekly Summary (pg_cron + Edge Function)

```sql
-- Every Sunday at 23:30 IST (18:00 UTC)
SELECT cron.schedule(
  'weekly-summary',
  '0 18 * * 0',  -- 18:00 UTC Sunday = 23:30 IST Sunday
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/weekly-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'
  );
  $$
);
```

### 20.3 Keep-Alive (Vercel Cron or GitHub Actions)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/keep-alive",
      "schedule": "0 6 * * *"
    }
  ]
}
```

```typescript
// src/app/api/keep-alive/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Simple query to keep the project alive
  const { count } = await supabase
    .from('app_settings')
    .select('*', { count: 'exact', head: true });

  return NextResponse.json({ status: 'alive', rows: count });
}
```

---

## 21. Real-Time Sync

### Supabase Realtime Subscriptions

```typescript
// src/hooks/use-realtime.ts

/**
 * Subscribe to real-time changes on key tables.
 * Ensures iPhone and Tab S9 stay in sync.
 */
export function useRealtimeSync() {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel('app-sync')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'block_completions',
      }, (payload) => {
        // Update local state when block completion changes on other device
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'day_settings',
      }, (payload) => {
        // Update traffic light when changed on other device
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'backlog_items',
      }, (payload) => {
        // Update backlog count badge
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'revision_queue',
      }, (payload) => {
        // Update morning revision checklist
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}
```

---

## 22. PWA Configuration

### `src/app/manifest.ts`

```typescript
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Beside You',
    short_name: 'Beside You',
    description: 'NEET PG 2026 Study Companion',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0f',        // Dark background (OLED friendly)
    theme_color: '#0f172a',              // Dark navy for status bar
    orientation: 'portrait',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

### Service Worker (`public/sw.js`)

Minimal service worker for installability only (no caching strategy since app is online-only):

```javascript
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests (online-only app)
  event.respondWith(fetch(event.request));
});
```

---

## 23. Dark/Light Mode

### Implementation

Use Tailwind's `class` strategy for dark mode (not `media`), so it can be toggled manually.

```typescript
// tailwind.config.ts
const config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // OLED-friendly dark palette
        background: {
          DEFAULT: '#ffffff',
          dark: '#000000',       // True black for OLED
        },
        surface: {
          DEFAULT: '#f8fafc',
          dark: '#0a0a0f',       // Very dark navy for cards
        },
        'surface-elevated': {
          DEFAULT: '#ffffff',
          dark: '#111118',       // Slightly lighter for elevated cards
        },
        primary: {
          DEFAULT: '#2563eb',    // Blue accent
          dark: '#60a5fa',       // Lighter blue for dark mode
        },
        // Traffic light colors
        'traffic-green': '#22c55e',
        'traffic-yellow': '#eab308',
        'traffic-red': '#ef4444',
      },
    },
  },
};
```

Default is dark mode. The theme preference is stored in `app_settings.theme` and persisted.

---

## 24. Easter Egg

Double-tap on the app logo triggers a romantic message.

```typescript
// src/components/shared/app-logo.tsx

export function AppLogo() {
  const [tapCount, setTapCount] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const tapTimer = useRef<NodeJS.Timeout | null>(null);

  const handleTap = () => {
    setTapCount(prev => prev + 1);

    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => setTapCount(0), 400); // Reset after 400ms

    if (tapCount + 1 >= 2) {
      setShowMessage(true);
      setTapCount(0);
      setTimeout(() => setShowMessage(false), 5000); // Auto-dismiss after 5s
    }
  };

  return (
    <div>
      <h1 onClick={handleTap} className="cursor-pointer select-none">
        Beside You
      </h1>
      {showMessage && (
        <div className="animate-fade-in text-sm opacity-80 italic mt-1">
          Even when I can't be beside you, I'll always support you like this.
        </div>
      )}
    </div>
  );
}
```

---

## 25. Settings

| Setting | Type | Storage | Editable |
|---|---|---|---|
| Day 1 date | Date picker | `app_settings.day_one_date` | Yes (during setup, editable later) |
| Exam date | Display only | Hardcoded: August 30, 2026 | No |
| Theme | Toggle (Dark/Light) | `app_settings.theme` | Yes |
| Export data | Button | Triggers JSON export of all tables | N/A |
| About | Static text | App version, description, links | No |

---

## 26. Performance Requirements

| Metric | Target | How |
|---|---|---|
| Today View load | < 1 second | Server Component fetches data before render |
| Form submissions | Feel instant | Optimistic UI: show success immediately, sync in background |
| Block completion | No spinner | Immediate checkbox fill, background Supabase write |
| Cross-device sync | < 3 seconds | Supabase Realtime subscriptions |
| Page transitions | < 300ms | Next.js App Router soft navigation |
| Time to Interactive | < 2 seconds | Minimal client-side JS, server-rendered HTML |

---

## 27. Deployment

### Initial Setup

1. Create Supabase project (free tier, nearest region to India: Mumbai/Singapore)
2. Run migrations: `supabase db push`
3. Seed data: `npx tsx scripts/seed-database.ts`
4. Create user: via Supabase dashboard (Authentication > Users > Create user)
5. Deploy to Vercel: connect GitHub repo, set environment variables
6. Install PWA on both devices:
   - iPhone 12: Open in Safari > Share > Add to Home Screen
   - Tab S9: Open in Chrome > Three dots > Install app

### Updating Schedule

1. Edit the source Excel file
2. Re-run `npx tsx scripts/seed-database.ts` (with --reseed flag)
3. Schedule data updates in Supabase. No redeployment needed.
4. If code changes are needed, push to GitHub main branch. Vercel auto-deploys.

---

## 28. Reference Data

### 28.1 Subjects (19)

| Subject | Short Name | Tier |
|---|---|---|
| Medicine | MED | 1 |
| Surgery | SUR | 1 |
| Obstetrics and Gynaecology | OBG | 1 |
| Pathology | PATH | 1 |
| Community Medicine (PSM) | PSM | 1 |
| Pharmacology | PHARMA | 1 |
| Microbiology | MICRO | 1 |
| Pediatrics | PEDS | 2 |
| Anatomy | ANAT | 2 |
| Physiology | PHYSIO | 2 |
| Biochemistry | BIOCHEM | 2 |
| ENT | ENT | 3 |
| Ophthalmology | OPTHAL | 3 |
| Forensic Medicine | FMT | 3 |
| Radiology | RAD | 3 |
| Anaesthesia | ANAES | 3 |
| Orthopaedics | ORTHO | 3 |
| Dermatology | DERM | 3 |
| Psychiatry | PSYCH | 3 |

### 28.2 Result Codes (MCQ)

| Code | Label |
|---|---|
| right | Answered correctly |
| wrong | Answered incorrectly |
| guessed_right | Correct but not confident |

### 28.3 Cause Codes

| Code | Label | Description |
|---|---|---|
| R | Recall | Seen before, could not retrieve |
| C | Concept | Did not understand mechanism |
| A | Application | Knew fact, failed clinical application |
| D | Discriminator | Stuck between two close options |
| I | Interpretation | Misread stem/qualifier/context |
| M | Management | Wrong sequence/protocol/next step |
| V | Visual | Image/ECG/histo/radiology miss |
| B | Biostats | Wrong test/formula/interpretation |
| T | Time/Panic | Good knowledge, bad pacing |
| K | Careless | Clicked wrong/changed without basis |

### 28.4 Fix Codes

| Code | Label |
|---|---|
| N | Notes repair |
| Q20 | 20 focused MCQs |
| Q40M | 40 mixed MCQs |
| A1 | Algorithm once |
| A3 | Algorithm 3 days |
| T2 | Compare table |
| I10 | Image drill 10 |
| F5 | 5 formula recalls |
| E | Self-explain |
| AI | AI quiz |
| G | GT behaviour fix |

### 28.5 Tags

protocol, volatile, management, image, emergency, screening, staging

### 28.6 Priority Levels

| Code | Label |
|---|---|
| P1 | Must fix this week |
| P2 | Fix in next revision |
| P3 | Log only if repeats |

### 28.7 Sleep Boundaries

| Boundary | Value |
|---|---|
| Earliest activity | 06:30 IST |
| Latest activity | 23:00 IST |
| Wind-down prompt 1 | 22:30 IST |
| Wind-down prompt 2 (night recall) | 23:00 IST |
| Auto-move to backlog | 23:15 IST |

### 28.8 Study Block Types

| Block Type Key | Time Slot | Typical Content |
|---|---|---|
| morning_revision | 06:30-08:00 | Spaced revision queue (D+1, D+3, D+7, D+14, D+28) |
| block_a | 08:15-10:45 | Primary study (WoR videos + notes) |
| block_b | 11:00-13:30 | Primary study continued |
| consolidation | 14:15-16:45 | Note marking, revision, or MCQs |
| mcq | 17:00-19:30 | Same-topic MCQs + explanation review |
| pyq_image | 20:15-21:45 | PYQs, image questions, custom modules |
| night_recall | 22:00-23:00 | Wrong notebook review + active oral recall |

### 28.9 Break/Meal Slots (not trackable)

| Slot | Time |
|---|---|
| Break 1 | 08:00-08:15 |
| Break 2 | 10:45-11:00 |
| Lunch | 13:30-14:15 |
| Break 3 | 16:45-17:00 |
| Dinner | 19:30-20:15 |
| Break 4 | 21:45-22:00 |

---

## End of Document

**This document should be read alongside the PRD (`beside-you-prd.md`) which contains the full product requirements, user stories, and UX specifications. This document covers the technical implementation architecture, database schema, function logic, and deployment strategy.**
