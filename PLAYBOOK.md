# Pal Agency Operating Playbook

Reusable operating rules governing interface standards, dual-market isolation, execution workflow, outreach discipline, and core delivery systems across all Pal Agency builds and client pipelines.

---

## 1. Visual & UI Standards

Every Pal Agency application, internal console, and client-facing preview must adhere to a sharp, utilitarian dark-mode studio aesthetic.

- **Surface & Border System**:
  - Primary canvas: deep charcoal (`#0D0F12`).
  - Elevated structural containers: muted slate (`#12151A` / `#161A20`) separated strictly by `1px` crisp borders (`#242830`).
  - Sharp architectural corners (`0px–4px` maximum radius); single-level container elevation only.
- **Typography & Status Badges**:
  - High-contrast text (`#ECEFF4` primary, `#C9D1D9` secondary, `#8B949E` muted metadata).
  - Enforce monospace typography with tabular numerals (`font-mono`, `tabular-nums`) for all scores, timestamps, domain strings, and status badges (`APPROVED_FOR_OUTREACH`, `NEEDS_REVIEW`, `PASS`).
  - Keep metadata unboxed using clean typographic separators (`·`, `/`) rather than decorative pill capsules.
- **Strict Visual Bans**:
  - **No** generic SaaS gradients (purple/indigo/cyan mesh backdrops or glowing CTA buttons).
  - **No** rounded pastel cards, glassmorphism blur cards, or soft drop shadows.
  - **No** dummy placeholder metrics, fabricated KPI scoreboards, ornamental footer telemetry tickers, or decorative pulsing dots on static labels.

---

## 2. Dual-Market Track Separation (`AFRICA_TRACK` vs. `INTERNATIONAL_TRACK`)

Market context must never bleed across pipelines. `AFRICA_TRACK` and `INTERNATIONAL_TRACK` operate with strictly partitioned storage, calibration memory, scoring heuristics, and offer positioning.

| Dimension | `AFRICA_TRACK` | `INTERNATIONAL_TRACK` |
| :--- | :--- | :--- |
| **Target Geography** | Local and regional African markets (e.g., Lagos, Nairobi, Accra, Cape Town, Johannesburg). | US, UK, and global Tier-1 English-speaking markets. |
| **Lead & Memory Isolation** | Separate lead store and isolated `reward_memory` namespace; winners/penalties from `AFRICA_TRACK` calibrate `AFRICA_TRACK` only. | Separate lead store and isolated `reward_memory` namespace; winners/penalties from `INTERNATIONAL_TRACK` calibrate `INTERNATIONAL_TRACK` only. |
| **Scoring Context** | Weights WhatsApp/mobile-first friction, cash/deposit trust barriers, Google Business Profile gaps, and local responsiveness. | Weights PPC/ad-spend leakage, static callback forms, after-hours calendar drop-off, and CRM speed-to-lead. |
| **Positioning & Offer Framing** | Emphasizes mobile conversion speed, WhatsApp/instant booking triage, and verifiable credibility assets. | Emphasizes recoverable ad spend, automated 24/7 consultation capture, and direct-response UGC creative. |

**Isolation Rule**: Never inject `reward_memory` calibration examples, outreach templates, or domain benchmarks from one track into the qualifier or outreach architect of the other track.

---

## 3. Core Execution Workflow (`Copy → Pivot → Prove → Soft Close`)

Every client acquisition and asset-building cycle follows four sequential stages:

1. **Copy**:
   - Identify proven offers, messaging angles, landing structures, and creative proof formats from real market winners (anchored in positive-reward leads such as `+25 Booked Demo` and `+10 Positive Reply`).
   - Extract the underlying conversion mechanism—never copy surface hype.
2. **Pivot**:
   - Adapt the winning angle to the specific prospect's diagnosed operational bottleneck or missed lead/booking leak (e.g., pivoting a proven cosmetic dentistry triage angle to an orthodontic clinic running ads to a static contact form).
   - Reference concrete, observable friction on their live domain or funnel.
3. **Prove**:
   - Generate a customized, tangible preview or proof asset tailored to their business *before* pitching (e.g., a tailored Web Kit booking flow mockup, a 90-second leak teardown, or a custom 3-beat UGC hook script).
   - Anchor every claim to something the prospect can inspect directly.
4. **Soft Close**:
   - Open conversations with low-friction, curiosity-driven questions centered on the custom preview—never demanding a 30-minute discovery call upfront.
   - Example soft closes: *"Worth sending the preview link over?"* / *"Open to a 90-second look at what we mocked up for your booking page?"*

---

## 4. Outreach & Pricing Discipline

- **Zero-Pricing Soft Closes**:
  - **Strictly prohibit** quoting prices, monthly retainers, setup fees, or package tiers in initial cold emails, social DMs, or follow-up sequences.
  - Pricing is introduced *only* after value has been established, the prospect has engaged with the custom proof asset, and mutual fit is confirmed.
- **Plain, Human Communication**:
  - Write cold emails, LinkedIn/Instagram DMs, and 3-step follow-ups in plain, direct, peer-level language.
  - Lead with the exact bottleneck observed on the prospect's domain or customer journey.
  - Eliminate generic AI buzzwords, hype phrasing, excessive exclamation marks, and inflated agency claims (*"revolutionize"*, *"skyrocket"*, *"unlock 10x ROI"*, *"game-changing"*).
  - Keep first-touch emails concise (80–120 words) and social DMs to 2–3 sentences.

---

## 5. Three Core Reusable Agency Systems

All client engagements map to one or more of three modular, productized delivery systems:

### A. Web Development (Rapid Web Kits)
- High-converting, fast-loading, mobile-ready websites and service-specific landing pages built to close local and international conversion leaks.
- Replaces generic homepage PPC destinations and slow multi-step contact forms with focused treatment/service capture funnels, local SEO/schema proof layers, and clean booking handoffs.

### B. AI Intelligence & Booking Agents
- 24/7 automated lead capture, reception, pre-qualification, and appointment booking workflows.
- Resolves after-hours drop-off and slow callback lag via instant conversational triage widgets, missed-call/form SMS recovery bridges, and direct calendar/CRM sync.

### C. AI UGC Services (UGC Studio)
- Direct-response short-form (`9:16` vertical, `4:5` feed) UGC ad scripts, 3-second opening hooks, shot-by-shot storyboards, and creative briefs engineered from proven market angles.
- Pairs real customer pain points and diagnosed funnel leaks with testable creator personas and visual proof beats ready for immediate production.
