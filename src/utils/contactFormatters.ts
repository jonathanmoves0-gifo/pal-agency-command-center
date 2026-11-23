import type { DecisionMakerMatch, LeadRecord, Market, WebsiteAuditSummary } from '../shared/types';

const EMAIL_FALSE_POSITIVE_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg|ico|css|js|woff2?|ttf|eot|pdf|map)$/i;
const EMAIL_FALSE_POSITIVE_DOMAINS = new Set([
  'wixpress.com',
  'sentry.io',
  'example.com',
  'domain.com',
  'email.com',
  'yoursite.com',
  'yourdomain.com',
  'schema.org',
  'w3.org',
  'wordpress.org',
  'jquery.com',
  'cloudflare.com',
  'googleapis.com',
  'gstatic.com',
]);

const BOOKING_SIGNATURES: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Calendly', pattern: /calendly\.com|calendly-inline-widget/i },
  { label: 'Acuity Scheduling', pattern: /acuityscheduling\.com|squarespacescheduling\.com/i },
  { label: 'Fresha', pattern: /fresha\.com/i },
  { label: 'Doctify', pattern: /doctify\.com/i },
  { label: 'Zocdoc', pattern: /zocdoc\.com/i },
  { label: 'SimplyBook', pattern: /simplybook\.(me|it)/i },
  { label: 'Setmore', pattern: /setmore\.com/i },
  { label: 'Cliniko', pattern: /cliniko\.com/i },
  { label: 'Jane App', pattern: /janeapp\.com/i },
  { label: 'Booksy', pattern: /booksy\.com/i },
  { label: 'Mindbody', pattern: /mindbodyonline\.com/i },
  { label: 'Square Appointments', pattern: /squareup\.com\/appointments|square\.site/i },
];

const CHAT_SIGNATURES: Array<{ label: string; pattern: RegExp }> = [
  { label: 'Intercom', pattern: /widget\.intercom\.io|intercomSettings/i },
  { label: 'Tidio', pattern: /code\.tidio\.co/i },
  { label: 'Crisp', pattern: /client\.crisp\.chat/i },
  { label: 'Drift', pattern: /js\.driftt\.com/i },
  { label: 'Zendesk Chat', pattern: /static\.zdassets\.com/i },
  { label: 'Tawk.to', pattern: /embed\.tawk\.to/i },
  { label: 'LiveChat', pattern: /cdn\.livechatinc\.com/i },
  { label: 'HubSpot Chat', pattern: /js\.hs-scripts\.com|hubspot-messages-iframe/i },
  { label: 'WhatsApp Chat Widget', pattern: /wa\.me\/|api\.whatsapp\.com\/send/i },
];

export function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function isValidPublicEmail(rawEmail: string): boolean {
  const email = rawEmail.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,12}$/.test(email)) {
    return false;
  }
  if (EMAIL_FALSE_POSITIVE_EXTENSIONS.test(email)) {
    return false;
  }
  const atIdx = email.lastIndexOf('@');
  const domainPart = email.slice(atIdx + 1);
  if (EMAIL_FALSE_POSITIVE_DOMAINS.has(domainPart)) {
    return false;
  }
  for (const blocked of EMAIL_FALSE_POSITIVE_DOMAINS) {
    if (domainPart.endsWith(`.${blocked}`)) return false;
  }
  if (/^(noreply|no-reply|donotreply|mailer-daemon)@/i.test(email)) {
    return false;
  }
  return true;
}

export function extractEmailsFromHtml(html: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  const add = (candidate: string) => {
    const cleaned = candidate.trim().replace(/[.,;:!?)'"]+$/, '').toLowerCase();
    if (!isValidPublicEmail(cleaned) || seen.has(cleaned)) return;
    seen.add(cleaned);
    found.push(cleaned);
  };

  // 1. Prioritize mailto: links
  const mailtoRegex = /href\s*=\s*["']mailto:([^"'?#\s]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = mailtoRegex.exec(html)) !== null) {
    try {
      add(decodeURIComponent(match[1]));
    } catch {
      add(match[1]);
    }
  }

  // 2. Visible text emails (strip tags first so attributes don't pollute)
  const visible = stripHtmlToText(html);
  const emailRegex = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,12}\b/g;
  while ((match = emailRegex.exec(visible)) !== null) {
    add(match[0]);
  }

  return found.slice(0, 6);
}

export function normalizePhoneForWhatsApp(
  rawPhone: string,
  fallbackMarket?: Market,
  regionHint?: string
): string {
  const trimmed = rawPhone.trim();
  if (!trimmed) return '';

  // Remove extensions like ext 101 or x12
  const withoutExt = trimmed.replace(/\s*(?:ext\.?|x)\s*\d+$/i, '').trim();
  const hasPlus = withoutExt.startsWith('+');
  let digits = withoutExt.replace(/\D/g, '');

  if (!digits || digits.length < 7 || digits.length > 15) {
    return '';
  }

  // Convert international 00 prefix (e.g. 00256... -> 256...)
  if (!hasPlus && digits.startsWith('00') && digits.length >= 10) {
    digits = digits.slice(2);
  }

  // If already has explicit + prefix, preserve full international digits directly
  if (hasPlus) {
    return digits;
  }

  // Already looks international (256, 254, 44, 1, etc.)
  if (
    /^(256|254|234|233|27|44)\d{8,10}$/.test(digits) ||
    (digits.startsWith('1') && digits.length === 11)
  ) {
    return digits;
  }

  const hint = (regionHint || '').toLowerCase();

  // Regional 10-digit local numbers starting with 0 (e.g., Uganda 07... -> 2567..., Kenya -> 2547...)
  if (digits.startsWith('0') && digits.length === 10) {
    if (/(kenya|nairobi|mombasa|\.ke\b)/i.test(hint)) {
      return `254${digits.slice(1)}`;
    }
    if (/(uganda|kampala|entebbe|jinja|\.ug\b)/i.test(hint) || digits.startsWith('07')) {
      return `256${digits.slice(1)}`;
    }
  }

  // Market-based local-to-international inference when country code omitted
  if (fallbackMarket === 'UK' && digits.startsWith('0') && digits.length === 11) {
    return `44${digits.slice(1)}`;
  }

  if (fallbackMarket === 'US' && digits.length === 10 && !digits.startsWith('0')) {
    return `1${digits}`;
  }

  return digits;
}

export function formatPhoneDisplay(rawPhone: string): string {
  return rawPhone.replace(/\s+/g, ' ').trim();
}

export function formatInternationalPhoneDisplay(
  rawPhone: string,
  fallbackMarket?: Market,
  regionHint?: string
): string {
  const digits = normalizePhoneForWhatsApp(rawPhone, fallbackMarket, regionHint);
  if (!digits) return '';
  return `+${digits}`;
}

export function isFakeOrPlaceholderBusiness(name: string, domain: string): boolean {
  const cleanName = name.trim().toLowerCase();
  const cleanDomain = domain.trim().toLowerCase();
  if (!cleanName || cleanName.length < 2) return true;

  if (
    /\b(acme|john\s*doe|jane\s*doe|example\s*(llc|inc|ltd|corp|clinic|company)?|test\s*(clinic|business|company|site|dental)|sample\s*(business|clinic|lead)|dummy\s*(clinic|business)|lorem\s*ipsum)\b/i.test(
      cleanName
    )
  ) {
    return true;
  }

  if (
    !cleanDomain ||
    cleanDomain.endsWith('.placeholder.local') ||
    cleanDomain === 'localhost' ||
    cleanDomain.endsWith('.localhost') ||
    /(^|\.)(example\.(com|org|net)|test\.(com|org|net)|yourdomain\.com|yoursite\.com|domain\.com|email\.com)$/i.test(
      cleanDomain
    )
  ) {
    return true;
  }

  return false;
}

export function isDummyPhoneDigits(digits: string): boolean {
  if (!digits || digits.length < 8 || digits.length > 15) return true;
  // All identical digits (e.g., 00000000, 11111111) or 6+ repeated digits in a row
  if (/^(\d)\1+$/.test(digits) || /(\d)\1{5,}/.test(digits)) return true;
  // Trailing or leading blocks of zeros like 000000
  if (/000000/.test(digits) || /999999/.test(digits)) return true;
  // Sequential ascending/descending runs (e.g. 12345678 / 98765432)
  if (/(0123456|1234567|2345678|3456789|9876543|8765432|7654321)/.test(digits)) return true;
  // North American fictional 555-01xx range (and +1 XXX 555 01XX)
  if (/^1?\d{3}55501\d{2}$/.test(digits) || /^55501\d{2}$/.test(digits)) return true;
  return false;
}

export function isValidVerifiedPhone(
  rawPhone: string,
  fallbackMarket?: Market,
  regionHint?: string
): {
  valid: boolean;
  normalizedDigits: string;
  display: string;
  waLink: string;
} {
  const digits = normalizePhoneForWhatsApp(rawPhone, fallbackMarket, regionHint);
  if (!digits || isDummyPhoneDigits(digits)) {
    return { valid: false, normalizedDigits: '', display: '', waLink: '' };
  }
  return {
    valid: true,
    normalizedDigits: digits,
    display: `+${digits}`,
    waLink: `https://wa.me/${digits}`,
  };
}

const DECISION_MAKER_ROLE_REGEX =
  '(?:Co-?Founder|Founder|Chief Executive Officer|CEO|Managing Director|Clinic Director|Medical Director|Practice Director|Practice Owner|Principal Dentist|Principal Partner|Managing Partner|Owner|Principal|Partner|Lead Doctor|Lead Dentist|Clinical Director|Director|Head of [A-Z][a-zA-Z&\\s]{2,28})';

const NON_PERSON_NAME_TERMS =
  /\b(our team|about us|contact us|learn more|read more|book now|view more|home page|clinic team|dental clinic|medical centre|medical center|privacy policy|terms of|opening hours|working hours|monday|tuesday|wednesday|thursday|friday|saturday|sunday|united kingdom|united states|south africa|kampala|london|nairobi|austin|uganda|kenya|england|john doe|jane doe|test user|sample user|admin|support team|customer care|free consultation|get started|whatsapp|email us|call us|click here)\b/i;

function cleanPersonNameCandidate(raw: string): string {
  return raw
    .replace(/\s+/g, ' ')
    .replace(/^[,.\-–—:;\s]+|[,.\-–—:;\s]+$/g, '')
    .trim();
}

function isPlausibleHumanName(candidate: string): boolean {
  if (!candidate || candidate.length < 5 || candidate.length > 52) return false;
  if (NON_PERSON_NAME_TERMS.test(candidate)) return false;
  if (/\d|@|http|www\.|\.com|\.co\.|\.ug|\.ke/i.test(candidate)) return false;

  const withoutTitle = candidate.replace(/^(?:Dr\.?|Mr\.?|Mrs\.?|Ms\.?|Prof\.?)\s+/i, '').trim();
  const words = withoutTitle.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;

  return words.every((w) => /^[A-Z][a-zA-Z'’-]{1,20}$/.test(w));
}

export function extractDecisionMakersFromText(
  text: string,
  sourceLabel: string
): DecisionMakerMatch[] {
  const matches: DecisionMakerMatch[] = [];
  const seen = new Set<string>();
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const addMatch = (rawName: string, rawRole: string) => {
    const name = cleanPersonNameCandidate(rawName);
    const role = rawRole.replace(/\s+/g, ' ').replace(/^[,.\-–—:;\s]+|[,.\-–—:;\s]+$/g, '').trim();
    if (!isPlausibleHumanName(name) || !role) return;
    const key = `${name.toLowerCase()}::${role.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    matches.push({ name, role, source: sourceLabel });
  };

  const nameGroup =
    '((?:(?:Dr|Mr|Mrs|Ms|Prof)\\.?\\s+)?[A-Z][a-zA-Z\'’-]{1,20}(?:\\s+[A-Z][a-zA-Z\'’-]{1,20}){1,2})';

  // Pattern 1: "Dr. Sarah Kato, Managing Director" or "David Okello - Founder & CEO"
  const nameThenRole = new RegExp(
    `${nameGroup}\\s*(?:,|\\||-|–|—|:|\\(|is the|is our|serves as)\\s*(${DECISION_MAKER_ROLE_REGEX}(?:\\s*(?:&|and|/)\\s*${DECISION_MAKER_ROLE_REGEX})?)`,
    'g'
  );
  let m: RegExpExecArray | null;
  while ((m = nameThenRole.exec(normalized)) !== null) {
    addMatch(m[1], m[2]);
  }

  // Pattern 2: "Founded by Sarah Kato" / "Managing Director: Dr. James Mukasa" / "Owner - Claire Bennett"
  const roleThenName = new RegExp(
    `(?:Founded by|Led by|(${DECISION_MAKER_ROLE_REGEX}))\\s*(?::|-|–|—|,)?\\s*${nameGroup}`,
    'g'
  );
  while ((m = roleThenName.exec(normalized)) !== null) {
    const roleLabel = m[1] || 'Founder';
    addMatch(m[2], roleLabel);
  }

  return matches.slice(0, 5);
}

export function extractDecisionMakersFromHtml(
  html: string,
  sourceUrl: string
): DecisionMakerMatch[] {
  if (!html) return [];
  // Preserve block-element boundaries as separators so adjacent names & titles stay cleanly paired
  const separated = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(?:h[1-6]|p|div|li|span|strong|b|em|td|th|dt|dd|figcaption)>/gi, ' | ')
    .replace(/<br\s*\/?>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();

  return extractDecisionMakersFromText(separated, sourceUrl);
}

export function deriveDetectedProblems(
  audit: WebsiteAuditSummary | undefined,
  missedCaptureLeaks: string[] = []
): string[] {
  const problems: string[] = [];
  if (audit) {
    if (!audit.reachable) problems.push('Outdated Site');
    if (!audit.has_ssl) problems.push('No HTTPS');
    if (!audit.has_mobile_viewport) problems.push('Not Mobile-Friendly');
    if (!audit.has_booking_tool) problems.push('No Online Booking');
    if (!audit.has_live_chat) problems.push('No Instant Chat');
    if (audit.reachable && audit.cta_count <= 1 && !problems.includes('Outdated Site')) {
      problems.push('Weak Conversion CTA');
    }
  }
  if (problems.length === 0 && missedCaptureLeaks.length > 0) {
    problems.push(missedCaptureLeaks[0].slice(0, 42));
  }
  return Array.from(new Set(problems)).slice(0, 4);
}

export function extractPhonesAndWhatsAppFromHtml(html: string): {
  phones: string[];
  whatsappNumbers: string[];
  hasDirectWhatsAppLink: boolean;
} {
  const phones: string[] = [];
  const phoneSeen = new Set<string>();
  const whatsappNumbers: string[] = [];
  const waSeen = new Set<string>();
  let hasDirectWhatsAppLink = false;

  const addPhone = (raw: string) => {
    const cleaned = formatPhoneDisplay(raw);
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15 || isDummyPhoneDigits(digits)) return;
    if (phoneSeen.has(digits)) return;
    phoneSeen.add(digits);
    phones.push(cleaned);
  };

  const addWa = (rawDigits: string) => {
    const digits = rawDigits.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15 || isDummyPhoneDigits(digits)) return;
    if (waSeen.has(digits)) return;
    waSeen.add(digits);
    whatsappNumbers.push(`+${digits}`);
  };

  // WhatsApp direct links (wa.me/256... or api.whatsapp.com/send?phone=256...)
  const waRegex = /(?:wa\.me\/|api\.whatsapp\.com\/send\?[^"'\s]*phone=)(\+?\d{8,15})/gi;
  let match: RegExpExecArray | null;
  while ((match = waRegex.exec(html)) !== null) {
    hasDirectWhatsAppLink = true;
    addWa(match[1]);
    addPhone(`+${match[1].replace(/\D/g, '')}`);
  }

  // Also detect generic wa.me / whatsapp widget presence even if phone wasn't inline in that attribute
  if (/(?:wa\.me\/|api\.whatsapp\.com\/send)/i.test(html)) {
    hasDirectWhatsAppLink = true;
  }

  // tel: links
  const telRegex = /href\s*=\s*["']tel:([^"']+)/gi;
  while ((match = telRegex.exec(html)) !== null) {
    try {
      addPhone(decodeURIComponent(match[1]));
    } catch {
      addPhone(match[1]);
    }
  }

  // Visible text international / regional phone numbers
  const visible = stripHtmlToText(html);
  const textPhoneRegex = /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{2,4})?/g;
  while ((match = textPhoneRegex.exec(visible)) !== null) {
    const cand = match[0].trim();
    const digits = cand.replace(/\D/g, '');
    // Filter out years/dates like 2024-2026
    if (digits.length >= 9 && digits.length <= 15 && !/^(19|20)\d{2}/.test(digits)) {
      addPhone(cand);
    }
  }

  return {
    phones: phones.slice(0, 5),
    whatsappNumbers: whatsappNumbers.slice(0, 4),
    hasDirectWhatsAppLink,
  };
}

export function analyzeWebsiteAuditHtml(
  html: string,
  finalUrl: string,
  checkedUrls: string[],
  auditedAt = new Date().toISOString()
): WebsiteAuditSummary {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const pageTitle = titleMatch ? stripHtmlToText(titleMatch[1]).slice(0, 140) : '';
  const hasMobileViewport = /<meta[^>]+name\s*=\s*["']viewport["']/i.test(html);
  const hasSsl = finalUrl.toLowerCase().startsWith('https://');

  const bookingToolsFound: string[] = [];
  for (const sig of BOOKING_SIGNATURES) {
    if (sig.pattern.test(html)) {
      bookingToolsFound.push(sig.label);
    }
  }

  // Check for native booking action forms/links even if third-party tool wasn't detected
  const hasInlineBookingCopy =
    /(?:book\s+(?:now|online|appointment|consultation|a\s+visit|your\s+slot)|schedule\s+(?:a\s+call|online|consultation))/i.test(
      html
    ) && /<(?:form|button|a)\b/i.test(html);

  const chatToolsFound: string[] = [];
  for (const sig of CHAT_SIGNATURES) {
    if (sig.pattern.test(html)) {
      chatToolsFound.push(sig.label);
    }
  }

  const ctaMatches =
    html.match(
      /<(?:a|button)[^>]*>[^<]*(?:book|schedule|contact|consult|quote|call|get started|whatsapp|appointment)[^<]*<\/(?:a|button)>/gi
    ) ?? [];

  const text = stripHtmlToText(html);

  return {
    reachable: true,
    has_ssl: hasSsl,
    has_mobile_viewport: hasMobileViewport,
    has_booking_tool: bookingToolsFound.length > 0 || hasInlineBookingCopy,
    booking_tools_found: bookingToolsFound,
    has_live_chat: chatToolsFound.length > 0,
    chat_tools_found: chatToolsFound,
    cta_count: ctaMatches.length,
    page_title: pageTitle,
    homepage_excerpt: text.slice(0, 1200),
    checked_urls: checkedUrls,
    audited_at: auditedAt,
  };
}

export function buildWhatsAppUrl(
  rawPhone: string | undefined | null,
  message: string,
  fallbackMarket?: Market,
  regionHint?: string
): string {
  const cleanPhone = rawPhone ? normalizePhoneForWhatsApp(rawPhone, fallbackMarket, regionHint) : '';
  if (!cleanPhone) {
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildGmailComposeUrl(email: string | undefined | null, subject: string, body: string): string {
  const to = (email || '').trim();
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

export function buildMailtoUrl(email: string | undefined | null, subject: string, body: string): string {
  const recipient = (email || '').trim();
  const params = new URLSearchParams({
    subject,
    body,
  });
  const query = params.toString().replace(/\+/g, '%20');
  return `mailto:${encodeURIComponent(recipient)}?${query}`;
}

export function getOutreachMessagesForLead(lead: LeadRecord): {
  subject: string;
  body: string;
  formattedEmail: string;
  whatsappMessage: string;
} {
  const topLeak = lead.missed_capture_leaks[0] || 'a friction point in your online inquiry flow';
  const domainLabel =
    lead.domain && !lead.domain.endsWith('.placeholder.local') ? lead.domain : lead.business_name;
  const proofLabel = lead.proof_asset?.title || `Custom Demo & Proof for ${lead.business_name}`;
  const pillarLabel = lead.proof_asset?.pillar_label || 'AI Business Automation';
  const recipientGreeting = lead.decision_maker_name
    ? `Hi ${lead.decision_maker_name}`
    : `Hi team at ${lead.business_name}`;
  const detectedList =
    lead.detected_problems && lead.detected_problems.length > 0
      ? lead.detected_problems.join(', ')
      : topLeak;

  const auditSignal = lead.website_audit
    ? !lead.website_audit.has_booking_tool
      ? `no instant online booking flow on ${domainLabel}`
      : !lead.website_audit.has_mobile_viewport
        ? `mobile layout friction on ${domainLabel}`
        : !lead.website_audit.has_live_chat
          ? `no instant after-hours inquiry capture on ${domainLabel}`
          : topLeak
    : topLeak;

  const subject =
    lead.outreach_pack?.cold_email.subject ||
    `Built a quick ${pillarLabel.toLowerCase()} proof for ${lead.business_name}`;

  const body =
    lead.outreach_pack?.cold_email.body ||
    [
      `${recipientGreeting},`,
      '',
      `I took a direct look at ${domainLabel} earlier and noticed ${auditSignal} (${detectedList}).`,
      '',
      `For ${lead.niche} businesses, our ${pillarLabel} setup typically turns those missed after-hours visits into confirmed bookings automatically without adding admin work for your team.`,
      '',
      `Attached Proof / Demo Built for ${lead.business_name}:`,
      `I already put together a working ${proofLabel} tailored specifically to ${lead.business_name} so you can click through it directly — no call required and zero upfront obligation.`,
      '',
      `Would you like me to send over the private preview link?`,
    ].join('\n');

  const whatsappMessage =
    lead.outreach_pack?.social_dm ||
    `${recipientGreeting} — I checked ${domainLabel} earlier and spotted ${auditSignal}. Rather than pitching cold, I already put together a tailored ${proofLabel} specifically for ${lead.business_name}. Want me to drop the quick preview here so you can take a look?`;

  return {
    subject,
    body,
    formattedEmail: `Subject: ${subject}\n\n${body}`,
    whatsappMessage,
  };
}

export function formatPlainEnglishProblem(
  lead: Pick<
    LeadRecord,
    'detected_problems' | 'missed_capture_leaks' | 'bottleneck_diagnosis' | 'website_audit'
  >
): string {
  const tags = lead.detected_problems ?? [];
  const audit = lead.website_audit;

  if (tags.includes('No Online Booking') || (audit && audit.reachable && !audit.has_booking_tool)) {
    return 'Missing online booking on their website.';
  }
  if (tags.includes('No Instant Chat') || (audit && audit.reachable && !audit.has_live_chat)) {
    return 'No instant WhatsApp or chat capture for visitors.';
  }
  if (tags.includes('Not Mobile-Friendly') || (audit && audit.reachable && !audit.has_mobile_viewport)) {
    return 'Website is not formatted well for mobile visitors.';
  }
  if (tags.includes('No HTTPS') || (audit && audit.reachable && !audit.has_ssl)) {
    return 'Website is missing a secure HTTPS connection.';
  }

  const raw =
    lead.missed_capture_leaks?.[0]?.trim() ||
    lead.bottleneck_diagnosis?.trim() ||
    tags[0]?.trim() ||
    '';

  if (!raw) {
    return 'Visitors have no instant way to book or inquire online.';
  }

  const firstSentence = raw.split(/(?<=[.!?])\s+/)[0].replace(/[.!?]+$/, '').trim();
  const capped =
    firstSentence.length > 96
      ? `${firstSentence.slice(0, 93).replace(/\s+\S*$/, '')}...`
      : firstSentence;

  return `${capped}.`;
}

