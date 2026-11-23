import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeWebsiteAuditHtml,
  buildGmailComposeUrl,
  buildMailtoUrl,
  buildWhatsAppUrl,
  deriveDetectedProblems,
  extractDecisionMakersFromHtml,
  extractDecisionMakersFromText,
  extractEmailsFromHtml,
  extractPhonesAndWhatsAppFromHtml,
  formatPlainEnglishProblem,
  getOutreachMessagesForLead,
  isDummyPhoneDigits,
  isFakeOrPlaceholderBusiness,
  isValidVerifiedPhone,
  normalizePhoneForWhatsApp,
} from './contactFormatters';
import type { LeadRecord } from '../shared/types';

test('normalizePhoneForWhatsApp preserves country codes and converts local UK/US/UG numbers cleanly', () => {
  assert.equal(normalizePhoneForWhatsApp('+256 772 123 456'), '256772123456');
  assert.equal(normalizePhoneForWhatsApp('+254-712-345-678'), '254712345678');
  assert.equal(normalizePhoneForWhatsApp('+44 (0) 20 7946 0921'), '4402079460921');
  assert.equal(normalizePhoneForWhatsApp('00256 701 998 877'), '256701998877');
  assert.equal(normalizePhoneForWhatsApp('0772 123 456', 'UK', 'Kampala, Uganda'), '256772123456');
  assert.equal(normalizePhoneForWhatsApp('0701-998-877'), '256701998877');
  assert.equal(normalizePhoneForWhatsApp('020 7946 0921', 'UK'), '442079460921');
  assert.equal(normalizePhoneForWhatsApp('(512) 555-0194', 'US'), '15125550194');
});

test('isFakeOrPlaceholderBusiness, isDummyPhoneDigits, and isValidVerifiedPhone block dummy data cleanly', () => {
  assert.equal(isFakeOrPlaceholderBusiness('Acme Dental LLC', 'acmedental.com'), true);
  assert.equal(isFakeOrPlaceholderBusiness('Test Clinic', 'clinic.org'), true);
  assert.equal(isFakeOrPlaceholderBusiness('Kampala Smiles', 'example.com'), true);
  assert.equal(isFakeOrPlaceholderBusiness('Kampala Smiles', 'kampalasmiles.ug'), false);

  assert.equal(isDummyPhoneDigits('15125550194'), true);
  assert.equal(isDummyPhoneDigits('0000000000'), true);
  assert.equal(isDummyPhoneDigits('1111111111'), true);
  assert.equal(isDummyPhoneDigits('1234567890'), true);
  assert.equal(isDummyPhoneDigits('256772800100'), false);

  assert.equal(isValidVerifiedPhone('+1 512 555 0148', 'US').valid, false);
  const validUg = isValidVerifiedPhone('+256 772 800 100', 'UK', 'Kampala, Uganda');
  assert.equal(validUg.valid, true);
  assert.equal(validUg.display, '+256772800100');
  assert.equal(validUg.waLink, 'https://wa.me/256772800100');
});

test('extractDecisionMakersFromHtml and extractDecisionMakersFromText find real founders/directors and ignore UI labels', () => {
  const html = `
    <section>
      <h2>Our Team</h2>
      <div class="card">
        <h3>Dr. Sarah Kato</h3>
        <p>Managing Director</p>
      </div>
      <div class="card">
        <p>Founded by David Okello in 2016. Practice Owner: Claire Bennett</p>
      </div>
      <div>Book Now - Director</div>
    </section>
  `;
  const found = extractDecisionMakersFromHtml(html, 'https://kampalasmiles.ug/team');
  assert.ok(found.some((m) => m.name === 'Dr. Sarah Kato' && /Managing Director/i.test(m.role)));
  assert.ok(found.some((m) => m.name === 'David Okello' && /Founder/i.test(m.role)));
  assert.ok(found.some((m) => m.name === 'Claire Bennett' && /Owner/i.test(m.role)));
  assert.ok(!found.some((m) => /Book Now/i.test(m.name)));

  const snippetMatches = extractDecisionMakersFromText(
    'Led by Dr. James Mukasa, Principal Dentist at Pearl Dental Kampala',
    'DuckDuckGo snippet'
  );
  assert.equal(snippetMatches.length >= 1, true);
  assert.equal(snippetMatches[0].name, 'Dr. James Mukasa');
});

test('extractEmailsFromHtml extracts real business emails and rejects image/platform false positives', () => {
  const html = `
    <html>
      <body>
        <img src="hero@2x.png" />
        <script>var dsn = "abc@sentry.io"; var x = "test@wixpress.com";</script>
        <a href="mailto:hello@kampalasmiles.ug">Email Us</a>
        <p>Support: care@kampalasmiles.ug or logo@2x.webp</p>
      </body>
    </html>
  `;
  const emails = extractEmailsFromHtml(html);
  assert.deepEqual(emails, ['hello@kampalasmiles.ug', 'care@kampalasmiles.ug']);
});

test('extractPhonesAndWhatsAppFromHtml, analyzeWebsiteAuditHtml, and deriveDetectedProblems work together', () => {
  const html = `
    <html>
      <head>
        <title>Kampala Dental Care</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <script src="https://assets.calendly.com/assets/external/widget.js"></script>
      </head>
      <body>
        <a href="tel:+256772555111">Call Clinic</a>
        <a href="https://wa.me/256772555111">WhatsApp Reception</a>
        <a href="tel:+15125550148">Dummy Ignore</a>
        <a href="/book">Book Appointment</a>
      </body>
    </html>
  `;

  const contacts = extractPhonesAndWhatsAppFromHtml(html);
  assert.ok(contacts.phones.includes('+256772555111'));
  assert.ok(contacts.whatsappNumbers.includes('+256772555111'));
  assert.equal(contacts.hasDirectWhatsAppLink, true);
  assert.ok(!contacts.phones.some((p) => p.includes('5550148')));

  const audit = analyzeWebsiteAuditHtml(html, 'https://kampaladental.ug', ['https://kampaladental.ug']);
  assert.equal(audit.has_ssl, true);
  assert.equal(audit.has_mobile_viewport, true);
  assert.equal(audit.has_booking_tool, true);
  assert.ok(audit.booking_tools_found.includes('Calendly'));
  assert.equal(audit.has_live_chat, true);
  assert.ok(audit.chat_tools_found.includes('WhatsApp Chat Widget'));

  const problems = deriveDetectedProblems({
    ...audit,
    has_ssl: false,
    has_mobile_viewport: false,
    has_booking_tool: false,
    has_live_chat: false,
  });
  assert.deepEqual(problems, [
    'No HTTPS',
    'Not Mobile-Friendly',
    'No Online Booking',
    'No Instant Chat',
  ]);
});

test('buildGmailComposeUrl, buildWhatsAppUrl, buildMailtoUrl, and getOutreachMessagesForLead address decision maker', () => {
  const gmailUrl = buildGmailComposeUrl('hello@clinic.co.uk', 'Quick idea', 'Hello team');
  assert.equal(
    gmailUrl,
    'https://mail.google.com/mail/?view=cm&fs=1&to=hello%40clinic.co.uk&su=Quick%20idea&body=Hello%20team'
  );

  const waUrl = buildWhatsAppUrl('+256 772 555 111', 'Hi team — quick preview for you');
  assert.ok(waUrl.startsWith('https://wa.me/256772555111?text='));
  assert.ok(waUrl.includes(encodeURIComponent('Hi team')));

  const waNoPhoneUrl = buildWhatsAppUrl('', 'Hi team — quick preview for you');
  assert.ok(waNoPhoneUrl.startsWith('https://wa.me/?text='));

  const mailtoUrl = buildMailtoUrl('hello@clinic.co.uk', 'Quick idea', 'Hello team');
  assert.equal(mailtoUrl, 'mailto:hello%40clinic.co.uk?subject=Quick%20idea&body=Hello%20team');

  const sampleLead: LeadRecord = {
    id: 'l1',
    business_name: 'Kampala Smiles',
    domain: 'kampalasmiles.ug',
    niche: 'Dental Clinics',
    market: 'UK',
    decision_maker_name: 'Dr. Sarah Kato',
    decision_maker_role: 'Managing Director',
    detected_problems: ['No Online Booking'],
    discovery_notes: '',
    intake_mode: 'scout',
    bottleneck_diagnosis: 'Manual booking only',
    missed_capture_leaks: ['No 24/7 online booking slot picker'],
    ai_web_opportunities: ['Automated booking triage'],
    grounding_sources: [],
    sub_scores: { pain_signal: 20, niche_fit: 20, web_booking_gap: 20, reachability: 18 },
    total_score: 78,
    status: 'APPROVED_FOR_OUTREACH',
    gatekeeper_reason: 'High intent dental site',
    outreach_pack: null,
    outcome: null,
    reward_points: 0,
    created_at: '2026-11-23T00:00:00Z',
    updated_at: '2026-11-23T00:00:00Z',
    model_trace: [],
  };
  const msgs = getOutreachMessagesForLead(sampleLead);
  assert.ok(msgs.subject.includes('Kampala Smiles'));
  assert.ok(msgs.body.includes('Hi Dr. Sarah Kato'));
  assert.ok(msgs.body.includes('Attached Proof / Demo'));
  assert.ok(msgs.formattedEmail.startsWith('Subject: '));
  assert.ok(msgs.whatsappMessage.includes('Hi Dr. Sarah Kato'));

  assert.equal(
    formatPlainEnglishProblem(sampleLead),
    'Missing online booking on their website.'
  );
  assert.equal(
    formatPlainEnglishProblem({
      detected_problems: [],
      missed_capture_leaks: ['Slow mobile inquiry page with no direct call button'],
      bottleneck_diagnosis: '',
    }),
    'Slow mobile inquiry page with no direct call button.'
  );
});
