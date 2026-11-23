import dns from 'dns/promises';
import net from 'net';
import type {
  DecisionMakerMatch,
  GroundingSource,
  Market,
  ProspectInput,
  WebsiteAuditSummary,
} from '../src/shared/types';
import {
  analyzeWebsiteAuditHtml,
  extractDecisionMakersFromHtml,
  extractDecisionMakersFromText,
  extractEmailsFromHtml,
  extractPhonesAndWhatsAppFromHtml,
  isFakeOrPlaceholderBusiness,
  isValidVerifiedPhone,
} from '../src/utils/contactFormatters';
import { isDuplicateProspect, normalizeDomainKey } from '../src/utils/pipelineLogic';

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const NOMINATIM_USER_AGENT = 'PalAgencyCommandCenter/1.0 (https://localhost)';

const BLOCKED_DISCOVERY_DOMAINS = new Set([
  'facebook.com',
  'm.facebook.com',
  'instagram.com',
  'linkedin.com',
  'x.com',
  'twitter.com',
  'youtube.com',
  'tiktok.com',
  'yelp.com',
  'tripadvisor.com',
  'tripadvisor.co.uk',
  'yellowpages.com',
  'yell.com',
  'wikipedia.org',
  'en.wikipedia.org',
  'duckduckgo.com',
  'google.com',
  'maps.google.com',
  'bing.com',
  'pinterest.com',
  'reddit.com',
  'foursquare.com',
  'trustpilot.com',
  'crunchbase.com',
  'glassdoor.com',
  'angi.com',
  'thumbtack.com',
  'bark.com',
  'clutch.co',
  'goodfirms.co',
  'hotfrog.com',
  'brownbook.net',
  'findopen.co.uk',
  'cybo.com',
  'dnb.com',
  'zoominfo.com',
  'apollo.io',
]);

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local & cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast / reserved
  return false;
}

function isPrivateOrReservedIp(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, '').split('%')[0].toLowerCase();
  if (clean.startsWith('::ffff:')) {
    return isPrivateOrReservedIpv4(clean.slice(7));
  }
  const version = net.isIP(clean);
  if (version === 4) {
    return isPrivateOrReservedIpv4(clean);
  }
  if (version === 6) {
    if (clean === '::' || clean === '::1') return true;
    if (clean.startsWith('fe80:') || clean.startsWith('fc') || clean.startsWith('fd')) {
      return true;
    }
    return false;
  }
  return true;
}

export async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error('URLs with embedded credentials are not allowed.');
  }

  const host = parsed.hostname.trim().toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error(`Blocked local or internal host: ${host}`);
  }

  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) {
      throw new Error(`Blocked non-public IP address: ${host}`);
    }
    return parsed;
  }

  const records = await dns.lookup(host, { all: true });
  if (!records || records.length === 0) {
    throw new Error(`DNS lookup failed for ${host}`);
  }
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error(`Blocked non-public resolved address for ${host}`);
    }
  }
  return parsed;
}

async function fetchTextBounded(
  url: string,
  timeoutMs: number,
  userAgent = BROWSER_USER_AGENT,
  signal?: AbortSignal,
  maxBytes = 1024 * 1024
): Promise<{ ok: boolean; status: number; finalUrl: string; text: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = () => controller.abort();
  signal?.addEventListener('abort', onParentAbort, { once: true });

  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': userAgent,
        Accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const finalUrl = res.url || url;
    if (finalUrl !== url) {
      await assertSafePublicUrl(finalUrl);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      const txt = await res.text();
      return { ok: res.ok, status: res.status, finalUrl, text: txt.slice(0, maxBytes) };
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          chunks.push(value.slice(0, Math.max(0, maxBytes - (total - value.byteLength))));
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
          break;
        }
        chunks.push(value);
      }
    }

    const merged = Buffer.concat(chunks.map((c) => Buffer.from(c)));
    return {
      ok: res.ok,
      status: res.status,
      finalUrl,
      text: merged.toString('utf8'),
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onParentAbort);
  }
}

export function normalizeWebsiteUrl(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

function inferMarketFromRegion(region: string): Market {
  if (
    /\b(uk|united kingdom|london|manchester|birmingham|leeds|glasgow|bristol|edinburgh|britain|england|scotland|wales|kampala|uganda|nairobi|kenya|lagos|nigeria|accra|ghana|cape town|johannesburg|south africa)\b/i.test(
      region
    )
  ) {
    return 'UK';
  }
  return 'US';
}

function buildOverpassTagFilters(niche: string): Array<{ key: string; valueRegex: string }> {
  const q = niche.toLowerCase();
  if (/(dent|orthodont|oral|smile)/i.test(q)) {
    return [
      { key: 'amenity', valueRegex: 'dentist|clinic' },
      { key: 'healthcare', valueRegex: 'dentist|clinic' },
    ];
  }
  if (/(clinic|medspa|aesthet|medical|doctor|physio|health|wellness)/i.test(q)) {
    return [
      { key: 'amenity', valueRegex: 'clinic|doctors|hospital|pharmacy' },
      { key: 'healthcare', valueRegex: 'clinic|doctor|centre|physiotherapist|optometrist' },
    ];
  }
  if (/(real estate|property|realtor|letting|estate agent)/i.test(q)) {
    return [
      { key: 'office', valueRegex: 'estate_agent|property_management' },
      { key: 'shop', valueRegex: 'estate_agent' },
    ];
  }
  if (/(law|legal|attorney|solicitor|account|consult|agency)/i.test(q)) {
    return [{ key: 'office', valueRegex: 'lawyer|accountant|consulting|company|financial|insurance' }];
  }
  if (/(salon|hair|barber|spa|beauty)/i.test(q)) {
    return [
      { key: 'shop', valueRegex: 'beauty|hairdresser|massage' },
      { key: 'amenity', valueRegex: 'spa' },
    ];
  }
  if (/(hotel|safari|tour|travel|lodge)/i.test(q)) {
    return [
      { key: 'tourism', valueRegex: 'hotel|guest_house|tour_operator|travel_agency' },
      { key: 'office', valueRegex: 'travel_agent|guide' },
    ];
  }
  if (/(hvac|plumb|electric|roof|construct|architect|repair)/i.test(q)) {
    return [
      { key: 'craft', valueRegex: 'hvac|plumber|electrician|roofer|carpenter|builder' },
      { key: 'office', valueRegex: 'architect|construction|engineer' },
    ];
  }
  return [
    { key: 'amenity', valueRegex: 'clinic|dentist|doctors|restaurant|cafe' },
    { key: 'office', valueRegex: 'company|estate_agent|lawyer|accountant|consulting' },
    { key: 'shop', valueRegex: 'beauty|optician|electronics|hardware|furniture' },
  ];
}

export interface OverpassElement {
  id?: number;
  tags?: Record<string, string>;
}

export function extractProspectsFromOverpassElements(
  elements: OverpassElement[],
  niche: string,
  region: string
): ProspectInput[] {
  const market = inferMarketFromRegion(region);
  const results: ProspectInput[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = (tags.name || tags['name:en'] || '').trim();
    if (!name) continue;

    const rawWebsite = (
      tags.website ||
      tags['contact:website'] ||
      tags.url ||
      tags['contact:url'] ||
      ''
    ).trim();

    const phone = (
      tags.phone ||
      tags['contact:phone'] ||
      tags['contact:mobile'] ||
      tags['mobile'] ||
      ''
    ).trim();

    const wa = (tags['contact:whatsapp'] || '').trim();
    const email = (tags.email || tags['contact:email'] || '').trim();
    const street = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city']]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (!rawWebsite && !phone && !wa) continue;

    const domain = rawWebsite ? normalizeDomainKey(rawWebsite) : '';
    if (domain && isFakeOrPlaceholderBusiness(name, domain)) continue;
    if (!domain && isFakeOrPlaceholderBusiness(name, `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`)) {
      continue;
    }

    const regionHint = [region, street, domain].filter(Boolean).join(' ');
    const validPhone = phone ? isValidVerifiedPhone(phone, market, regionHint) : null;
    const validWa = wa ? isValidVerifiedPhone(wa, market, regionHint) : null;
    if (!domain && !validPhone?.valid && !validWa?.valid) continue;

    const dedupKey = domain || name.toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    results.push({
      business_name: name,
      domain: domain || '',
      niche,
      market,
      discovery_notes: [
        'Discovered via OpenStreetMap Overpass directory',
        street ? `Address: ${street}` : '',
        validPhone?.valid ? `Phone: ${validPhone.display}` : '',
      ]
        .filter(Boolean)
        .join(' · '),
      intake_mode: 'scout',
      address: street || undefined,
      pre_found_phones: validPhone?.valid ? [validPhone.display] : [],
      pre_found_emails: email ? [email] : [],
      pre_found_whatsapp: validWa?.valid ? [validWa.display] : [],
      has_direct_whatsapp_link: Boolean(validWa?.valid),
    });
  }

  return results.sort((a, b) => {
    const aHasSite = a.domain ? 1 : 0;
    const bHasSite = b.domain ? 1 : 0;
    return bHasSite - aHasSite;
  });
}

async function queryOpenStreetMapOverpass(
  niche: string,
  region: string,
  signal?: AbortSignal
): Promise<ProspectInput[]> {
  try {
    // Step 1: Geocode city/region to bounding box using Nominatim
    const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      region
    )}&format=json&limit=1`;
    const geoRes = await fetchTextBounded(geoUrl, 8000, NOMINATIM_USER_AGENT, signal);
    let bboxClause = '';
    if (geoRes.ok) {
      const geoData = JSON.parse(geoRes.text) as Array<{ boundingbox?: [string, string, string, string] }>;
      const bb = geoData?.[0]?.boundingbox;
      if (bb && bb.length === 4) {
        // Nominatim returns [south, north, west, east] -> Overpass wants (south, west, north, east)
        bboxClause = `(${bb[0]},${bb[2]},${bb[1]},${bb[3]})`;
      }
    }

    if (!bboxClause) {
      return [];
    }

    const filters = buildOverpassTagFilters(niche);
    const sanitizedNameKeyword = niche.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/)[0] || '';
    const clauses = filters
      .map(
        (f) =>
          `node["${f.key}"~"${f.valueRegex}",i]["name"]${bboxClause};\nway["${f.key}"~"${f.valueRegex}",i]["name"]${bboxClause};`
      )
      .join('\n');
    const nameFallbackClause =
      sanitizedNameKeyword.length >= 3
        ? `node["name"~"${sanitizedNameKeyword}",i]["website"]${bboxClause};\nway["name"~"${sanitizedNameKeyword}",i]["website"]${bboxClause};`
        : '';

    const overpassQuery = `[out:json][timeout:8];(\n${clauses}\n${nameFallbackClause}\n);out center tags 40;`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const onParentAbort = () => controller.abort();
    signal?.addEventListener('abort', onParentAbort, { once: true });

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'User-Agent': NOMINATIM_USER_AGENT,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
      });
      if (!res.ok) return [];
      const payload = (await res.json()) as { elements?: OverpassElement[] };
      const elements = Array.isArray(payload?.elements) ? payload.elements : [];
      return extractProspectsFromOverpassElements(elements, niche, region);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onParentAbort);
    }
  } catch {
    return [];
  }
}

export function extractProspectsFromDuckDuckGoHtml(
  html: string,
  niche: string,
  region: string
): ProspectInput[] {
  const market = inferMarketFromRegion(region);
  const results: ProspectInput[] = [];
  const seenDomains = new Set<string>();

  const anchorRegex = /<a\b([^>]*\bclass=["'][^"']*result__a[^"']*["'][^>]*)>([\s\S]*?)<\/a>/gi;
  const matches: Array<{
    attrs: string;
    innerHtml: string;
    endIdx: number;
    startIdx: number;
  }> = [];

  let m: RegExpExecArray | null;
  while ((m = anchorRegex.exec(html)) !== null) {
    matches.push({
      attrs: m[1] || '',
      innerHtml: m[2] || '',
      startIdx: m.index,
      endIdx: m.index + m[0].length,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const hrefMatch = cur.attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    let rawHref = hrefMatch[1].replace(/&amp;/g, '&');
    const rawTitle = cur.innerHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const nextStart = i + 1 < matches.length ? matches[i + 1].startIdx : html.length;
    const tailHtml = html.slice(cur.endIdx, Math.min(nextStart, cur.endIdx + 900));

    // Decode DuckDuckGo uddg redirect parameter if present
    if (rawHref.includes('uddg=')) {
      try {
        const fakeBase = rawHref.startsWith('//')
          ? `https:${rawHref}`
          : rawHref.startsWith('/')
            ? `https://duckduckgo.com${rawHref}`
            : rawHref;
        const u = new URL(fakeBase);
        const target = u.searchParams.get('uddg');
        if (target) rawHref = target;
      } catch {
        // leave as-is
      }
    }

    if (!/^https?:\/\//i.test(rawHref)) continue;
    const domain = normalizeDomainKey(rawHref);
    if (!domain || seenDomains.has(domain)) continue;

    // Exclude social platforms and directory aggregators
    const isBlocked = Array.from(BLOCKED_DISCOVERY_DOMAINS).some(
      (blocked) => domain === blocked || domain.endsWith(`.${blocked}`)
    );
    if (isBlocked) continue;

    const snippetMatch = tailHtml.match(/class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/i);
    const snippet = snippetMatch
      ? snippetMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : '';

    // Clean business title (trim trailing "| City" or "- Home")
    const businessName = rawTitle.split(/\s[|\-–—]\s/)[0].trim() || domain;
    if (isFakeOrPlaceholderBusiness(businessName, domain)) continue;

    const phoneData = extractPhonesAndWhatsAppFromHtml(snippet);
    const decisionMatches = extractDecisionMakersFromText(
      `${rawTitle}. ${snippet}`,
      `DuckDuckGo snippet (${domain})`
    );

    seenDomains.add(domain);
    results.push({
      business_name: businessName.slice(0, 90),
      domain,
      niche,
      market,
      discovery_notes: snippet
        ? `Discovered via web search: ${snippet.slice(0, 220)}`
        : `Discovered via public web search for ${niche} in ${region}`,
      intake_mode: 'scout',
      pre_found_phones: phoneData.phones,
      pre_found_whatsapp: phoneData.whatsappNumbers,
      has_direct_whatsapp_link: phoneData.hasDirectWhatsAppLink,
      pre_found_decision_maker: decisionMatches[0] ?? null,
    });
  }

  return results;
}

async function queryDuckDuckGoHtml(
  query: string,
  signal?: AbortSignal
): Promise<string> {
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const res = await fetchTextBounded(url, 8000, BROWSER_USER_AGENT, signal);
    return res.ok && res.text ? res.text : '';
  } catch {
    return '';
  }
}

async function queryDuckDuckGoSearch(
  niche: string,
  region: string,
  signal?: AbortSignal
): Promise<ProspectInput[]> {
  const [generalHtml, leadershipHtml] = await Promise.all([
    queryDuckDuckGoHtml(`${niche} ${region}`, signal),
    queryDuckDuckGoHtml(
      `${niche} ${region} (founder OR "managing director" OR owner OR CEO OR director)`,
      signal
    ),
  ]);

  const combined = [
    ...extractProspectsFromDuckDuckGoHtml(generalHtml, niche, region),
    ...extractProspectsFromDuckDuckGoHtml(leadershipHtml, niche, region),
  ];

  const deduped: ProspectInput[] = [];
  const seen = new Set<string>();
  for (const item of combined) {
    const key = normalizeDomainKey(item.domain);
    if (!key) continue;
    const existing = deduped.find((d) => normalizeDomainKey(d.domain) === key);
    if (existing) {
      if (!existing.pre_found_decision_maker && item.pre_found_decision_maker) {
        existing.pre_found_decision_maker = item.pre_found_decision_maker;
      }
      if (!existing.pre_found_phones?.length && item.pre_found_phones?.length) {
        existing.pre_found_phones = item.pre_found_phones;
      }
      if (!existing.pre_found_whatsapp?.length && item.pre_found_whatsapp?.length) {
        existing.pre_found_whatsapp = item.pre_found_whatsapp;
      }
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

export async function lookupDecisionMakerViaSearch(opts: {
  businessName: string;
  domain: string;
  regionHint?: string;
  signal?: AbortSignal;
}): Promise<DecisionMakerMatch | null> {
  const cleanDomain = normalizeDomainKey(opts.domain);
  const query = cleanDomain
    ? `"${opts.businessName}" OR site:${cleanDomain} (founder OR owner OR "managing director" OR CEO OR director OR principal)`
    : `"${opts.businessName}" ${opts.regionHint || ''} (founder OR owner OR "managing director" OR CEO OR director)`;
  const html = await queryDuckDuckGoHtml(query.trim(), opts.signal);
  if (!html) return null;

  const snippetRegex = /class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = snippetRegex.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const found = extractDecisionMakersFromText(text, `Public search snippet for ${opts.businessName}`);
    if (found.length > 0) {
      return found[0];
    }
  }
  return null;
}

export interface AuditedBusinessData {
  emails: string[];
  phones: string[];
  whatsappNumbers: string[];
  hasDirectWhatsAppLink: boolean;
  decisionMakers: DecisionMakerMatch[];
  audit: WebsiteAuditSummary;
  sources: GroundingSource[];
}

export async function auditBusinessWebsite(opts: {
  domain: string;
  businessName?: string;
  market?: Market;
  regionHint?: string;
  preFoundEmails?: string[];
  preFoundPhones?: string[];
  preFoundWhatsApp?: string[];
  preFoundDecisionMaker?: DecisionMakerMatch | null;
  preFoundDirectWhatsApp?: boolean;
  signal?: AbortSignal;
}): Promise<AuditedBusinessData> {
  const cleanDomain = opts.domain.trim();
  const regionHint = [opts.regionHint, cleanDomain].filter(Boolean).join(' ');

  const initialEmails = (opts.preFoundEmails ?? []).map((e) => e.toLowerCase());
  const initialPhones = (opts.preFoundPhones ?? [])
    .map((p) => isValidVerifiedPhone(p, opts.market, regionHint))
    .filter((v) => v.valid)
    .map((v) => v.display);
  const initialWa = (opts.preFoundWhatsApp ?? [])
    .map((p) => isValidVerifiedPhone(p, opts.market, regionHint))
    .filter((v) => v.valid)
    .map((v) => v.display);
  const initialDecisionMakers = opts.preFoundDecisionMaker ? [opts.preFoundDecisionMaker] : [];

  if (!cleanDomain || cleanDomain.endsWith('.placeholder.local')) {
    return {
      emails: initialEmails,
      phones: initialPhones,
      whatsappNumbers: initialWa,
      hasDirectWhatsAppLink: Boolean(opts.preFoundDirectWhatsApp || initialWa.length > 0),
      decisionMakers: initialDecisionMakers,
      audit: {
        reachable: false,
        has_ssl: false,
        has_mobile_viewport: false,
        has_booking_tool: false,
        booking_tools_found: [],
        has_live_chat: false,
        chat_tools_found: [],
        cta_count: 0,
        page_title: '',
        homepage_excerpt: 'No official website URL listed in directory record.',
        checked_urls: [],
        audited_at: new Date().toISOString(),
        error_note: 'No website URL listed yet',
      },
      sources: [],
    };
  }

  const httpsUrl = normalizeWebsiteUrl(cleanDomain);
  const checkedUrls: string[] = [];
  let homepageHtml = '';
  let finalUrl = httpsUrl;
  let errorNote: string | undefined;

  try {
    await assertSafePublicUrl(httpsUrl);
    const res = await fetchTextBounded(httpsUrl, 8000, BROWSER_USER_AGENT, opts.signal);
    checkedUrls.push(res.finalUrl);
    finalUrl = res.finalUrl;
    if (res.ok && res.text) {
      homepageHtml = res.text;
    } else {
      errorNote = `HTTP ${res.status} returned by website`;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/Blocked|not allowed|Unsupported protocol/i.test(msg)) {
      try {
        const httpUrl = httpsUrl.replace(/^https:\/\//i, 'http://');
        await assertSafePublicUrl(httpUrl);
        const res = await fetchTextBounded(httpUrl, 8000, BROWSER_USER_AGENT, opts.signal);
        checkedUrls.push(res.finalUrl);
        finalUrl = res.finalUrl;
        if (res.ok && res.text) {
          homepageHtml = res.text;
        } else {
          errorNote = `HTTP ${res.status} returned by website`;
        }
      } catch (err2) {
        errorNote = err2 instanceof Error ? err2.message : 'Website could not be reached within 8s';
      }
    } else {
      errorNote = msg;
    }
  }

  const combinedEmails = new Set<string>(initialEmails);
  const combinedPhones = new Set<string>(initialPhones);
  const combinedWa = new Set<string>(initialWa);
  const decisionMakers: DecisionMakerMatch[] = [...initialDecisionMakers];
  let hasDirectWhatsAppLink = Boolean(opts.preFoundDirectWhatsApp || initialWa.length > 0);

  const mergePageData = (html: string, pageUrl: string) => {
    for (const e of extractEmailsFromHtml(html)) combinedEmails.add(e);
    const contacts = extractPhonesAndWhatsAppFromHtml(html);
    if (contacts.hasDirectWhatsAppLink) hasDirectWhatsAppLink = true;
    for (const p of contacts.phones) {
      const checked = isValidVerifiedPhone(p, opts.market, regionHint);
      if (checked.valid) combinedPhones.add(checked.display);
    }
    for (const w of contacts.whatsappNumbers) {
      const checked = isValidVerifiedPhone(w, opts.market, regionHint);
      if (checked.valid) combinedWa.add(checked.display);
    }
    for (const dm of extractDecisionMakersFromHtml(html, pageUrl)) {
      if (
        !decisionMakers.some(
          (existing) => existing.name.toLowerCase() === dm.name.toLowerCase()
        )
      ) {
        decisionMakers.push(dm);
      }
    }
  };

  if (homepageHtml) {
    mergePageData(homepageHtml, finalUrl);

    try {
      const origin = new URL(finalUrl).origin;
      // Crawl /contact pages if email/phone missing, and /about /team /leadership if decision maker missing
      const contactPaths = ['/contact', '/contact-us'];
      const leadershipPaths = ['/about', '/about-us', '/team', '/leadership'];

      if (combinedEmails.size === 0 || (combinedPhones.size === 0 && combinedWa.size === 0)) {
        for (const suffix of contactPaths) {
          if (opts.signal?.aborted) break;
          const targetUrl = `${origin}${suffix}`;
          try {
            await assertSafePublicUrl(targetUrl);
            const res = await fetchTextBounded(targetUrl, 8000, BROWSER_USER_AGENT, opts.signal);
            checkedUrls.push(res.finalUrl);
            if (res.ok && res.text) {
              mergePageData(res.text, res.finalUrl);
              if (combinedEmails.size > 0 && (combinedPhones.size > 0 || combinedWa.size > 0)) break;
            }
          } catch {
            // ignore missing subpage
          }
        }
      }

      if (decisionMakers.length === 0) {
        for (const suffix of leadershipPaths) {
          if (opts.signal?.aborted) break;
          const targetUrl = `${origin}${suffix}`;
          if (checkedUrls.includes(targetUrl)) continue;
          try {
            await assertSafePublicUrl(targetUrl);
            const res = await fetchTextBounded(targetUrl, 8000, BROWSER_USER_AGENT, opts.signal);
            checkedUrls.push(res.finalUrl);
            if (res.ok && res.text) {
              mergePageData(res.text, res.finalUrl);
              if (decisionMakers.length > 0) break;
            }
          } catch {
            // ignore missing subpage
          }
        }
      }
    } catch {
      // ignore invalid origin
    }
  }

  // Fallback snippet check for decision maker only if real phone/WhatsApp exists and pages lacked leadership bio
  if (
    decisionMakers.length === 0 &&
    (combinedPhones.size > 0 || combinedWa.size > 0) &&
    opts.businessName &&
    !opts.signal?.aborted
  ) {
    const snippetDm = await lookupDecisionMakerViaSearch({
      businessName: opts.businessName,
      domain: cleanDomain,
      regionHint: opts.regionHint,
      signal: opts.signal,
    });
    if (snippetDm) {
      decisionMakers.push(snippetDm);
    }
  }

  const audit: WebsiteAuditSummary = homepageHtml
    ? analyzeWebsiteAuditHtml(homepageHtml, finalUrl, checkedUrls)
    : {
        reachable: false,
        has_ssl: finalUrl.toLowerCase().startsWith('https://'),
        has_mobile_viewport: false,
        has_booking_tool: false,
        booking_tools_found: [],
        has_live_chat: false,
        chat_tools_found: [],
        cta_count: 0,
        page_title: '',
        homepage_excerpt: '',
        checked_urls: checkedUrls,
        audited_at: new Date().toISOString(),
        error_note: errorNote || 'Site blocked automated checks or timed out',
      };

  const sources: GroundingSource[] = Array.from(new Set(checkedUrls)).map((uri, idx) => ({
    title: idx === 0 ? `${audit.page_title || cleanDomain}` : `${new URL(uri).pathname} (${cleanDomain})`,
    uri,
  }));

  return {
    emails: Array.from(combinedEmails).slice(0, 5),
    phones: Array.from(combinedPhones).slice(0, 5),
    whatsappNumbers: Array.from(combinedWa).slice(0, 4),
    hasDirectWhatsAppLink,
    decisionMakers: decisionMakers.slice(0, 3),
    audit,
    sources,
  };
}

export interface VerifiedProspectCandidate {
  prospect: ProspectInput;
  crawlData: AuditedBusinessData;
}

export async function discoverRealProspects(opts: {
  niche: string;
  region: string;
  existingLeads: Array<{ business_name: string; domain: string }>;
  signal?: AbortSignal;
}): Promise<{
  prospects: ProspectInput[];
  overpassCount: number;
  searchCount: number;
  sources: GroundingSource[];
}> {
  const { niche, region, existingLeads, signal } = opts;

  const [overpassItems, ddgItems] = await Promise.all([
    queryOpenStreetMapOverpass(niche, region, signal),
    queryDuckDuckGoSearch(niche, region, signal),
  ]);

  const merged: ProspectInput[] = [];
  const dedupPool: Array<{ business_name: string; domain: string }> = [...existingLeads];

  const tryPush = (candidate: ProspectInput) => {
    if (isFakeOrPlaceholderBusiness(candidate.business_name, candidate.domain || `${candidate.business_name}.com`)) {
      return;
    }
    if (!candidate.domain && !candidate.pre_found_phones?.length && !candidate.pre_found_whatsapp?.length) {
      return;
    }
    if (isDuplicateProspect({ business_name: candidate.business_name, domain: candidate.domain }, dedupPool)) {
      return;
    }
    dedupPool.push({ business_name: candidate.business_name, domain: candidate.domain });
    merged.push(candidate);
  };

  // Interleave Overpass & DuckDuckGo up to 14 raw candidates so strict verification still retains a rich list
  const maxLen = Math.max(overpassItems.length, ddgItems.length);
  for (let i = 0; i < maxLen && merged.length < 14; i++) {
    if (overpassItems[i]) tryPush(overpassItems[i]);
    if (merged.length >= 14) break;
    if (ddgItems[i]) tryPush(ddgItems[i]);
  }

  const sources: GroundingSource[] = merged
    .filter((p) => Boolean(p.domain))
    .map((p) => ({
      title: p.business_name,
      uri: normalizeWebsiteUrl(p.domain),
    }));

  return {
    prospects: merged.slice(0, 14),
    overpassCount: overpassItems.length,
    searchCount: ddgItems.length,
    sources,
  };
}

export async function discoverAndVerifyQualifiedProspects(opts: {
  niche: string;
  region: string;
  existingLeads: Array<{ business_name: string; domain: string }>;
  signal?: AbortSignal;
}): Promise<{
  rawFoundCount: number;
  qualified: VerifiedProspectCandidate[];
  filteredOutCount: number;
  missingPhoneCount: number;
  missingDecisionMakerCount: number;
  overpassCount: number;
  searchCount: number;
  sources: GroundingSource[];
}> {
  const discovery = await discoverRealProspects(opts);
  const rawCandidates = discovery.prospects;
  const qualified: VerifiedProspectCandidate[] = [];
  let missingPhoneCount = 0;
  let missingDecisionMakerCount = 0;
  const allSources: GroundingSource[] = [...discovery.sources];

  // Run multi-page verification in bounded batches of 4
  const batchSize = 4;
  for (let i = 0; i < rawCandidates.length; i += batchSize) {
    if (opts.signal?.aborted) break;
    const chunk = rawCandidates.slice(i, i + batchSize);
    const auditedChunk = await Promise.all(
      chunk.map(async (candidate) => {
        const crawlData = await auditBusinessWebsite({
          domain: candidate.domain,
          businessName: candidate.business_name,
          market: candidate.market,
          regionHint: [opts.region, candidate.address, candidate.discovery_notes].filter(Boolean).join(' '),
          preFoundEmails: candidate.pre_found_emails,
          preFoundPhones: candidate.pre_found_phones,
          preFoundWhatsApp: candidate.pre_found_whatsapp,
          preFoundDecisionMaker: candidate.pre_found_decision_maker,
          preFoundDirectWhatsApp: candidate.has_direct_whatsapp_link,
          signal: opts.signal,
        });
        return { prospect: candidate, crawlData };
      })
    );

    for (const item of auditedChunk) {
      const hasPhone = item.crawlData.whatsappNumbers.length > 0 || item.crawlData.phones.length > 0;
      const hasDm = item.crawlData.decisionMakers.length > 0;

      if (!hasPhone) {
        missingPhoneCount += 1;
        continue;
      }
      if (!hasDm) {
        missingDecisionMakerCount += 1;
        continue;
      }

      for (const s of item.crawlData.sources) {
        if (!allSources.some((existing) => existing.uri === s.uri)) {
          allSources.push(s);
        }
      }
      qualified.push(item);
      if (qualified.length >= 6) break;
    }
    if (qualified.length >= 6) break;
  }

  return {
    rawFoundCount: rawCandidates.length,
    qualified,
    filteredOutCount: Math.max(0, rawCandidates.length - qualified.length),
    missingPhoneCount,
    missingDecisionMakerCount,
    overpassCount: discovery.overpassCount,
    searchCount: discovery.searchCount,
    sources: allSources,
  };
}
