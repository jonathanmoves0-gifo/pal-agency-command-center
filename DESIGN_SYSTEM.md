# Pal Agency — White Executive Studio Design System

Reference specification for visual tokens, typography, status semantics, and plain-English component guidelines across the Pal Agency Command Center.

---

## 1. Color Palette Tokens

| Role | Token / Hex | Usage |
| :--- | :--- | :--- |
| **Primary Canvas** | `#FFFFFF` | Cards, tables, slide-over drawers, browser mockup previews |
| **Secondary Surface** | `#F8FAFC` | Application backdrop, toolbar headers, nested input panels |
| **Hairline Border** | `#E2E8F0` | 1px card, table, and container separation (no heavy left stripes) |
| **Primary Text** | `#0F172A` | Page titles, table headings, primary business names & copy |
| **Secondary Text** | `#475569` | Descriptions, metadata, table summaries, form hints |
| **Muted Captions** | `#64748B` | Timestamps, secondary counters |
| **Primary Brand Accent** | `#1D4ED8` | Primary action buttons, active tab underlines, interactive links |
| **Brand Accent Hover** | `#1E40AF` | Primary CTA hover state |
| **Soft Brand Tint** | `#EFF6FF` | Selected option fills, active filter segments (`1px solid #BFDBFE`) |

### Semantic Status Badges

Status is always communicated with both color and explicit plain-English text:

- **Ready to Contact (75–100)**: Fill `#ECFDF5`, Text `#065F46`, Border `#A7F3D0`
- **Needs Quick Review (50–74)**: Fill `#FFFBEB`, Text `#92400E`, Border `#FDE68A`
- **Not a Fit (<50)**: Fill `#F1F5F9`, Text `#475569`, Border `#CBD5E1`
- **Error / Needs Attention**: Fill `#FEF2F2`, Text `#991B1B`, Border `#FECACA`

---

## 2. Typography

- **Primary Font**: `Plus Jakarta Sans` (`-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `sans-serif`)
- **Numeric Discipline**: `font-variant-numeric: tabular-nums` (`tabular-nums`) for all fit scores, counts, and timestamps.
- **No Terminal UI Chrome**: Do not style headings, cards, or navigation tabs with monospace code-comment prefixes or developer labels.

---

## 3. Plain-English Translation Standards

Internal backend steps and scoring fields are always presented to agency operators in clear business language:

- **5-Step Progress Flow**:
  1. `Finding Matching Businesses`
  2. `Analyzing Website & Automation Gaps`
  3. `Scoring Business Fit (0–100)`
  4. `Writing Personalized Outreach & Demo Pitch`
  5. `Saving to Client Pipeline`
- **Business Fit Score Breakdown (0–25 each)**:
  - `Urgent Business Need`
  - `Ideal Industry Match`
  - `Website or Booking Opportunity`
  - `Easy to Contact`
- **Header Readiness Indicator**:
  - Displays `AI Engine: Connected & Ready` with an expandable summary of Primary Research & Backup Routing health.

---

## 4. Layout & Accessibility Rules

1. **Three-Zone Header**: Single-row header with Brand Wordmark (`Pal Agency`), 3 single-line Workspace Tabs (`Client Finder`, `Website Preview Builder`, `AI & Agentic Solution Blueprints`), and AI Engine Readiness control.
2. **No Decorative Clutter**: Zero pulsing status dots on static headers, zero `border-l-4` callout stripes, zero fabricated metrics, and zero pill stacks above card headlines.
3. **Resilient Interactions**: All copy actions use clipboard API + DOM fallback; destructive actions (`Clear`) require inline confirmation rather than browser alerts; all tabs, dialogs, and filters provide clear accessible labels and focus states.
