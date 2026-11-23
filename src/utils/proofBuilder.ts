import type {
  LeadProofAsset,
  LeadRecord,
  Market,
  ServicePillar,
  WebsiteAuditSummary,
} from '../shared/types';
import { classifyPillarForLead } from './pitchPresenter';

export type ProofBuilderInput = Pick<
  LeadRecord,
  | 'id'
  | 'business_name'
  | 'domain'
  | 'niche'
  | 'market'
  | 'address'
  | 'discovery_notes'
  | 'bottleneck_diagnosis'
  | 'missed_capture_leaks'
  | 'ai_web_opportunities'
  | 'website_audit'
  | 'contact_phones'
  | 'contact_emails'
  | 'decision_maker_name'
  | 'decision_maker_role'
>;

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function resolvePillarForProof(lead: ProofBuilderInput): {
  pillar: ServicePillar;
  pillarLabel: LeadProofAsset['pillar_label'];
} {
  const base = classifyPillarForLead(lead);
  const audit = lead.website_audit;

  // If site is unreachable, lacks HTTPS/mobile viewport, or has severe site UX gaps without agentic keywords, prioritize Website Design
  if (
    audit &&
    (!audit.reachable || !audit.has_mobile_viewport || !audit.has_ssl) &&
    base.pillar !== 'agentic_ai'
  ) {
    return {
      pillar: 'website_design',
      pillarLabel: 'Professional Website Design',
    };
  }

  if (base.pillar === 'agentic_ai') {
    return {
      pillar: 'agentic_ai',
      pillarLabel: 'Custom Agentic AI Systems',
    };
  }
  if (base.pillar === 'ai_automation') {
    return {
      pillar: 'ai_automation',
      pillarLabel: 'AI Business Automation',
    };
  }
  return {
    pillar: 'website_design',
    pillarLabel: 'Professional Website Design',
  };
}

function inferCityLabel(address: string | undefined, discoveryNotes: string, market: Market): string {
  if (address && address.trim()) {
    const parts = address
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return parts.slice(-2).join(', ');
    }
    return parts[0];
  }

  const cityMatch = discoveryNotes.match(/\b(?:in|around|near)\s+([A-Z][a-zA-Z]+(?:,\s*[A-Z][a-zA-Z]+|\s+[A-Z][a-zA-Z]+)?)/);
  if (cityMatch?.[1]) {
    return cityMatch[1];
  }

  const trimmedNotes = discoveryNotes.trim();
  if (
    trimmedNotes &&
    trimmedNotes.length <= 60 &&
    /^[A-Za-z][A-Za-z\s,.-]+$/.test(trimmedNotes) &&
    !/(static|form|outdated|manual|callback|mobile|slow)/i.test(trimmedNotes)
  ) {
    return trimmedNotes;
  }

  return market === 'UK' ? 'London & Regional UK' : 'United States';
}

function pickIndustryPalette(niche: string): {
  colorToneName: string;
  primaryColor: string;
  accentColor: string;
  surfaceTint: string;
} {
  const q = niche.toLowerCase();
  if (/(dent|clinic|medspa|health|medical|aesthet|ortho|physio|care)/i.test(q)) {
    return {
      colorToneName: 'Clinical Teal & Clean Ivory',
      primaryColor: '#0F766E',
      accentColor: '#1D4ED8',
      surfaceTint: '#F0FDFA',
    };
  }
  if (/(real estate|property|estate|realtor|letting|architecture|interior|fitout)/i.test(q)) {
    return {
      colorToneName: 'Architectural Navy & Warm Stone',
      primaryColor: '#1E3A8A',
      accentColor: '#0F172A',
      surfaceTint: '#EFF6FF',
    };
  }
  if (/(law|legal|attorney|solicitor|consult|advisory|account|finance|b2b)/i.test(q)) {
    return {
      colorToneName: 'Executive Slate & Royal Cobalt',
      primaryColor: '#0F172A',
      accentColor: '#1D4ED8',
      surfaceTint: '#F8FAFC',
    };
  }
  return {
    colorToneName: 'Modern Cobalt & Slate',
    primaryColor: '#1D4ED8',
    accentColor: '#0F766E',
    surfaceTint: '#EFF6FF',
  };
}

function inferServicesForBusiness(niche: string, audit?: WebsiteAuditSummary): string[] {
  const q = `${niche} ${audit?.homepage_excerpt || ''}`.toLowerCase();
  if (/(dent|ortho|invisalign|implant|smile)/i.test(q)) {
    return [
      'New Patient Consultations',
      'Cosmetic & Aligners Assessment',
      'Preventive Care & Same-Week Visits',
    ];
  }
  if (/(medspa|aesthet|laser|injectable|botox|skin)/i.test(q)) {
    return [
      'Facial Aesthetics & Skin Renewal',
      '1-on-1 Treatment Plan Consultations',
      'VIP Membership & Follow-Up Care',
    ];
  }
  if (/(real estate|property|letting|realtor)/i.test(q)) {
    return [
      'Private Property Viewings',
      'Instant Valuation & Seller Strategy',
      'Buyer & Tenant Pre-Qualification',
    ];
  }
  if (/(law|legal|solicitor|attorney|consult|advisory|account)/i.test(q)) {
    return [
      'Initial Case & Scope Review',
      'Dedicated Partner Advisory',
      'Structured Onboarding & Timeline',
    ];
  }
  if (/(fitout|construct|hvac|plumb|electric|roof|architect|repair)/i.test(q)) {
    return [
      'On-Site Inspection & Scoping',
      'Fast Written Project Estimates',
      'Priority Maintenance & Dispatch',
    ];
  }
  return [
    `${niche} Strategy & Assessment`,
    'Direct Specialist Consultation',
    'Priority Scheduling & Client Support',
  ];
}

function buildFlawsAddressed(lead: ProofBuilderInput): string[] {
  const flaws: string[] = [];
  const audit = lead.website_audit;
  if (audit) {
    if (!audit.reachable) {
      flaws.push('Current website failed automated reachability or returned a blocking response');
    }
    if (!audit.has_ssl) {
      flaws.push('Missing active HTTPS / SSL browser trust configuration');
    }
    if (!audit.has_mobile_viewport) {
      flaws.push('Missing responsive mobile viewport meta tag on homepage');
    }
    if (!audit.has_booking_tool) {
      flaws.push('No live online consultation or appointment slot picker detected');
    }
    if (!audit.has_live_chat) {
      flaws.push('No 24/7 instant visitor triage or after-hours lead capture widget');
    }
    if (audit.cta_count <= 1) {
      flaws.push('Low above-the-fold conversion call-to-action visibility');
    }
  }
  for (const leak of lead.missed_capture_leaks) {
    if (leak && !flaws.includes(leak) && flaws.length < 4) {
      flaws.push(leak);
    }
  }
  if (flaws.length === 0) {
    flaws.push('Manual callback-dependent inquiry flow causing after-hours drop-off');
  }
  return flaws.slice(0, 4);
}

function buildWebsitePreviewHtml(opts: {
  businessName: string;
  domain: string;
  niche: string;
  cityLabel: string;
  services: string[];
  heroHeadline: string;
  heroSubheadline: string;
  ctaLabel: string;
  primaryColor: string;
  accentColor: string;
  surfaceTint: string;
  flawsAddressed: string[];
  phone: string;
  email: string;
}): string {
  const safeName = escapeHtml(opts.businessName);
  const safeDomain = escapeHtml(opts.domain);
  const safeNiche = escapeHtml(opts.niche);
  const safeCity = escapeHtml(opts.cityLabel);
  const safeHeadline = escapeHtml(opts.heroHeadline);
  const safeSub = escapeHtml(opts.heroSubheadline);
  const safeCta = escapeHtml(opts.ctaLabel);
  const safePhone = escapeHtml(opts.phone || 'Instant Callback Enabled');
  const safeEmail = opts.email ? escapeHtml(opts.email) : '';

  const servicesHtml = opts.services
    .map(
      (svc, idx) => `
      <div class="service-card">
        <div class="service-num">0${idx + 1}</div>
        <h3>${escapeHtml(svc)}</h3>
        <p>Clear transparent scoping with direct online availability for ${safeCity} clients.</p>
      </div>`
    )
    .join('\n');

  const flawsHtml = opts.flawsAddressed
    .slice(0, 3)
    .map((flaw) => `<li>${escapeHtml(flaw)}</li>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeName} — High-Converting Redesign Preview</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0F172A;
      background: #FFFFFF;
      line-height: 1.5;
    }
    .proof-banner {
      background: #0F172A;
      color: #F8FAFC;
      font-size: 12px;
      padding: 8px 20px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .proof-badge {
      background: ${opts.primaryColor};
      color: #FFFFFF;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 11px;
    }
    header {
      border-bottom: 1px solid #E2E8F0;
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      background: #FFFFFF;
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .brand { font-size: 17px; font-weight: 700; color: #0F172A; }
    .brand span { color: ${opts.primaryColor}; }
    .nav-links { display: flex; gap: 20px; align-items: center; font-size: 13px; color: #475569; }
    .nav-links a { color: inherit; text-decoration: none; font-weight: 500; }
    .nav-cta {
      background: ${opts.primaryColor};
      color: #FFFFFF !important;
      padding: 8px 14px;
      border-radius: 8px;
      font-weight: 600 !important;
    }
    .hero {
      background: linear-gradient(180deg, ${opts.surfaceTint} 0%, #FFFFFF 100%);
      padding: 44px 24px;
      border-bottom: 1px solid #E2E8F0;
    }
    .container { max-width: 1040px; margin: 0 auto; }
    .hero-grid {
      display: grid;
      grid-template-columns: 1.25fr 1fr;
      gap: 28px;
      align-items: start;
    }
    .eyebrow {
      display: inline-block;
      font-size: 12px;
      font-weight: 600;
      color: ${opts.primaryColor};
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 14px;
    }
    h1 {
      font-size: 32px;
      line-height: 1.18;
      letter-spacing: -0.02em;
      color: #0F172A;
      margin-bottom: 14px;
    }
    .subhead { font-size: 15px; color: #475569; margin-bottom: 20px; }
    .trust-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #065F46;
    }
    .trust-item {
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      padding: 5px 10px;
      border-radius: 6px;
    }
    .booking-card {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 10px 25px -10px rgba(15, 23, 42, 0.12);
    }
    .booking-card h2 { font-size: 15px; margin-bottom: 4px; }
    .booking-card p { font-size: 12px; color: #475569; margin-bottom: 14px; }
    .slots { display: grid; gap: 8px; margin-bottom: 14px; }
    .slot-btn {
      width: 100%;
      text-align: left;
      padding: 9px 12px;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      background: #F8FAFC;
      color: #0F172A;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .slot-btn.active {
      border-color: ${opts.primaryColor};
      background: ${opts.surfaceTint};
      color: ${opts.primaryColor};
    }
    .field {
      width: 100%;
      padding: 9px 11px;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .submit-btn {
      width: 100%;
      padding: 11px 14px;
      background: ${opts.primaryColor};
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .confirm-box {
      display: none;
      margin-top: 12px;
      padding: 10px 12px;
      border-radius: 8px;
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #065F46;
      font-size: 12px;
      font-weight: 600;
    }
    .section { padding: 40px 24px; border-bottom: 1px solid #E2E8F0; }
    .section h2 { font-size: 20px; margin-bottom: 6px; }
    .section-lead { font-size: 13px; color: #475569; margin-bottom: 20px; }
    .services-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .service-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 18px;
    }
    .service-num { font-size: 11px; font-weight: 700; color: ${opts.primaryColor}; margin-bottom: 6px; }
    .service-card h3 { font-size: 14px; margin-bottom: 6px; }
    .service-card p { font-size: 12px; color: #475569; }
    .audit-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 18px;
    }
    .audit-box ul { padding-left: 18px; font-size: 13px; color: #334155; display: grid; gap: 6px; }
    footer {
      padding: 24px;
      background: #0F172A;
      color: #CBD5E1;
      font-size: 12px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
    }
    @media (max-width: 768px) {
      .hero-grid, .services-grid { grid-template-columns: 1fr; }
      .nav-links { display: none; }
      h1 { font-size: 25px; }
    }
  </style>
</head>
<body>
  <div class="proof-banner">
    <span><span class="proof-badge">CUSTOM REDESIGN PROOF</span> Prepared for ${safeName} (${safeDomain})</span>
    <span>Mobile-First + Instant Booking Upgrade</span>
  </div>
  <header>
    <div class="brand">${safeName}</div>
    <nav class="nav-links">
      <a href="#services">Services</a>
      <a href="#improvements">Conversion Fixes</a>
      <a href="#book" class="nav-cta">${safeCta}</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <span class="eyebrow">${safeNiche} · ${safeCity}</span>
          <h1>${safeHeadline}</h1>
          <p class="subhead">${safeSub}</p>
          <div class="trust-row">
            <span class="trust-item">✓ HTTPS Mobile-First Speed</span>
            <span class="trust-item">✓ 60-Second Online Slot Picker</span>
            <span class="trust-item">✓ Instant Confirmation</span>
          </div>
        </div>
        <div class="booking-card" id="book">
          <h2>Reserve Your Consultation</h2>
          <p>Select a preferred window below — instant SMS &amp; email confirmation.</p>
          <div class="slots" id="slot-list">
            <button type="button" class="slot-btn active" data-slot="Tomorrow · 10:00 AM">Tomorrow · 10:00 AM</button>
            <button type="button" class="slot-btn" data-slot="Tomorrow · 2:30 PM">Tomorrow · 2:30 PM</button>
            <button type="button" class="slot-btn" data-slot="Thursday · 11:15 AM">Thursday · 11:15 AM</button>
          </div>
          <input type="text" id="visitor-name" class="field" placeholder="Your full name" value="" />
          <input type="text" id="visitor-contact" class="field" placeholder="Phone or email for confirmation" value="" />
          <button type="button" id="confirm-btn" class="submit-btn">${safeCta}</button>
          <div id="confirm-box" class="confirm-box"></div>
        </div>
      </div>
    </section>

    <section class="section" id="services">
      <div class="container">
        <h2>Core ${safeNiche} Services</h2>
        <p class="section-lead">Structured around clear client outcomes and friction-free scheduling in ${safeCity}.</p>
        <div class="services-grid">
          ${servicesHtml}
        </div>
      </div>
    </section>

    <section class="section" id="improvements">
      <div class="container">
        <div class="audit-box">
          <h2 style="font-size:16px; margin-bottom:10px;">Live Site Flaws Resolved in This Preview</h2>
          <ul>
            ${flawsHtml}
          </ul>
        </div>
      </div>
    </section>
  </main>
  <footer>
    <span>${safeName} · ${safeCity}</span>
    <span>Direct: ${safePhone}${safeEmail ? ` · ${safeEmail}` : ''}</span>
  </footer>
  <script>
    (function() {
      var selectedSlot = 'Tomorrow · 10:00 AM';
      var btns = document.querySelectorAll('.slot-btn');
      btns.forEach(function(btn) {
        btn.addEventListener('click', function() {
          btns.forEach(function(b) { b.classList.remove('active'); });
          btn.classList.add('active');
          selectedSlot = btn.getAttribute('data-slot') || selectedSlot;
        });
      });
      var confirmBtn = document.getElementById('confirm-btn');
      var confirmBox = document.getElementById('confirm-box');
      if (confirmBtn && confirmBox) {
        confirmBtn.addEventListener('click', function() {
          var name = (document.getElementById('visitor-name') || {}).value || 'Guest';
          confirmBox.style.display = 'block';
          confirmBox.textContent = 'Confirmed for ' + name + ' — ' + selectedSlot + '. Automated SMS & calendar invite queued.';
        });
      }
    })();
  </script>
</body>
</html>`;
}

export function buildLeadProofAsset(lead: ProofBuilderInput): LeadProofAsset {
  const { pillar, pillarLabel } = resolvePillarForProof(lead);
  const flawsAddressed = buildFlawsAddressed(lead);
  const cityLabel = inferCityLabel(lead.address, lead.discovery_notes, lead.market);
  const domainLabel =
    lead.domain && !lead.domain.endsWith('.placeholder.local') ? lead.domain : lead.business_name;
  const services = inferServicesForBusiness(lead.niche, lead.website_audit);
  const palette = pickIndustryPalette(lead.niche);
  const generatedAt = new Date().toISOString();

  if (pillar === 'website_design') {
    const headline = `Book ${lead.niche} Care & Consultations Online in 60 Seconds`;
    const heroSubheadline = `A fast, mobile-ready landing experience built for ${lead.business_name} in ${cityLabel} — turning visitors on ${domainLabel} directly into confirmed appointments.`;
    const ctaLabel = 'Lock In Consultation Time';

    const htmlDocument = buildWebsitePreviewHtml({
      businessName: lead.business_name,
      domain: domainLabel,
      niche: lead.niche,
      cityLabel,
      services,
      heroHeadline: headline,
      heroSubheadline,
      ctaLabel,
      primaryColor: palette.primaryColor,
      accentColor: palette.accentColor,
      surfaceTint: palette.surfaceTint,
      flawsAddressed,
      phone: lead.contact_phones?.[0] || '',
      email: lead.contact_emails?.[0] || '',
    });

    const recipientLine = lead.decision_maker_name
      ? `Prepared for: ${lead.decision_maker_name}${lead.decision_maker_role ? ` (${lead.decision_maker_role})` : ''}`
      : '';

    const proofSummaryText = [
      `Custom Website Redesign Proof — ${lead.business_name} (${domainLabel})`,
      recipientLine,
      `Recommended Pillar: ${pillarLabel}`,
      `City / Market: ${cityLabel} · Design Tone: ${palette.colorToneName}`,
      '',
      `Live Site Flaws Resolved:`,
      ...flawsAddressed.map((f) => `- ${f}`),
      '',
      `What the Custom Preview Includes:`,
      `- Mobile-first responsive landing layout tailored to ${lead.business_name}`,
      `- Instant 60-second online consultation slot picker replacing passive callback forms`,
      `- Highlighted core services (${services.join(', ')}) with SSL-ready trust badges`,
    ].join('\n');

    return {
      id: `proof_${lead.id}`,
      pillar,
      pillar_label: pillarLabel,
      title: `Tailored Website Redesign Preview for ${lead.business_name}`,
      headline,
      summary: `Responsive HTML/CSS/JS redesign preview tailored to ${lead.business_name} (${cityLabel}) resolving ${flawsAddressed[0].toLowerCase()}.`,
      generated_at: generatedAt,
      flaws_addressed: flawsAddressed,
      highlights: [
        `Custom ${palette.colorToneName} responsive layout built for ${lead.business_name}`,
        `Interactive 60-second booking slot selector directly above the fold`,
        `Resolves ${flawsAddressed.length} conversion flaws detected on ${domainLabel}`,
      ],
      proof_summary_text: proofSummaryText,
      website_preview: {
        color_tone_name: palette.colorToneName,
        primary_color: palette.primaryColor,
        accent_color: palette.accentColor,
        city_label: cityLabel,
        services,
        hero_subheadline: heroSubheadline,
        cta_label: ctaLabel,
        html_document: htmlDocument,
      },
    };
  }

  const isAgentic = pillar === 'agentic_ai';
  const architectureType = isAgentic ? 'Custom Agentic AI Systems' : 'AI Business Automation';
  const primaryService = services[0] || lead.niche;

  const workflowSteps = isAgentic
    ? [
        {
          step: 1,
          stage: 'Capture',
          title: 'Multi-Channel Inquiry Intake',
          detail: `Captures inbound quote, web form, or WhatsApp requests on ${domainLabel} 24/7 with zero missed messages.`,
        },
        {
          step: 2,
          stage: 'Agentic Research',
          title: 'Automated Fit & Scope Qualification',
          detail: `Multi-step AI agent evaluates service intent (${primaryService}), urgency, and ${cityLabel} service coverage.`,
        },
        {
          step: 3,
          stage: 'Routing',
          title: 'Instant Slot Offer & CRM Brief',
          detail: `Presents open calendar times to qualified leads while sending ${lead.business_name}'s team a concise 4-line summary.`,
        },
        {
          step: 4,
          stage: 'Follow-Through',
          title: 'Automated Reminder & Recovery',
          detail: `Triggers polite SMS/WhatsApp check-ins so confirmed consultations show up on time.`,
        },
      ]
    : [
        {
          step: 1,
          stage: 'Trigger',
          title: 'After-Hours Visit or Missed Call',
          detail: `Greets visitors on ${domainLabel} or texts back missed calls within 15 seconds around the clock.`,
        },
        {
          step: 2,
          stage: 'AI Receptionist',
          title: 'Instant Question & Service Triage',
          detail: `Answers common ${lead.niche} questions for ${lead.business_name} and recommends ${primaryService}.`,
        },
        {
          step: 3,
          stage: 'Booking Sync',
          title: 'Direct Calendar Slot Confirmation',
          detail: `Lets visitors lock in an appointment slot immediately without waiting for morning reception callbacks.`,
        },
        {
          step: 4,
          stage: 'Retention',
          title: 'Zero-Drop Reminders',
          detail: `Sends automated confirmation and 24-hour pre-visit reminders via SMS, WhatsApp, and email.`,
        },
      ];

  const roiMetrics = [
    {
      label: 'First Response Speed',
      value: '< 15 sec',
      note: `Replaces overnight/manual wait times on ${domainLabel}`,
    },
    {
      label: 'Front-Desk Hours Saved',
      value: '12–16 hrs/wk',
      note: 'Eliminates repetitive intake & phone tag',
    },
    {
      label: 'After-Hours Lead Recovery',
      value: '+30–40%',
      note: `Captures evening & weekend ${cityLabel} visitors`,
    },
  ];

  const simulationPrompts = [
    {
      user_message: `Hi, I'm looking for ${primaryService.toLowerCase()} in ${cityLabel}. Do you have availability this week?`,
      agent_reply: `Welcome to ${lead.business_name}! Yes — we have open ${primaryService.toLowerCase()} consultation windows tomorrow at 10:00 AM and 2:30 PM, plus Thursday at 11:15 AM. Which slot works best for you?`,
      system_action: `Intent matched: ${primaryService} · Checked live ${lead.business_name} calendar availability`,
    },
    {
      user_message: 'Tomorrow at 2:30 PM works great. Can you confirm by WhatsApp or email?',
      agent_reply: `Reserved Tomorrow at 2:30 PM with ${lead.business_name}. Please reply with your best phone number or email and I will lock in your instant calendar invite and prep checklist right away.`,
      system_action: 'Held tentative calendar slot · Triggered CRM lead brief & confirmation workflow',
    },
    {
      user_message: 'What happens if I need to reschedule or have a question before coming in?',
      agent_reply: `You will get a direct 1-tap reschedule link in your confirmation message, and our 24/7 assistant for ${lead.business_name} can answer preparation questions anytime.`,
      system_action: 'Attached automated 24h SMS/WhatsApp reminder + self-serve reschedule rule',
    },
  ];

  const recipientLine = lead.decision_maker_name
    ? `Prepared for: ${lead.decision_maker_name}${lead.decision_maker_role ? ` (${lead.decision_maker_role})` : ''}`
    : '';

  const proofSummaryText = [
    `Interactive ${architectureType} Proof — ${lead.business_name} (${domainLabel})`,
    recipientLine,
    `Recommended Pillar: ${pillarLabel}`,
    '',
    `Gaps Resolved:`,
    ...flawsAddressed.map((f) => `- ${f}`),
    '',
    `4-Step Automated Workflow:`,
    ...workflowSteps.map((s) => `${s.step}. [${s.stage}] ${s.title}: ${s.detail}`),
    '',
    `Projected Operational Impact:`,
    ...roiMetrics.map((m) => `- ${m.label}: ${m.value} (${m.note})`),
  ].join('\n');

  return {
    id: `proof_${lead.id}`,
    pillar,
    pillar_label: pillarLabel,
    title: isAgentic
      ? `Interactive Agentic AI Proof Blueprint for ${lead.business_name}`
      : `Interactive 24/7 AI Booking & Reception Proof for ${lead.business_name}`,
    headline: isAgentic
      ? `Autonomous Qualification & CRM Routing for ${lead.business_name}`
      : `24/7 AI Receptionist & Instant Booking Proof for ${lead.business_name}`,
    summary: `Tailored ${architectureType} workflow, operational ROI breakdown, and interactive client simulation built specifically for ${lead.business_name}.`,
    generated_at: generatedAt,
    flaws_addressed: flawsAddressed,
    highlights: [
      `4-step tailored workflow addressing ${flawsAddressed[0].toLowerCase()}`,
      `Operational time-saved & speed-to-lead breakdown (<15 sec response)`,
      `Working interactive chat & booking simulation pre-loaded for ${lead.business_name}`,
    ],
    proof_summary_text: proofSummaryText,
    ai_blueprint: {
      architecture_type: architectureType,
      roi_metrics: roiMetrics,
      workflow_steps: workflowSteps,
      simulation_greeting: `Hi! Welcome to ${lead.business_name} in ${cityLabel}. I can answer questions about ${services[0]} or lock in an appointment slot for you in under 60 seconds. How can I help today?`,
      simulation_prompts: simulationPrompts,
    },
  };
}
