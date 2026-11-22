import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampSubScores,
  computeTotalScore,
  getCalibrationContext,
  isDuplicateProspect,
  leadsToCsv,
  normalizeDomainKey,
  parseBatchLines,
  parseImportedJson,
  parseLlmJson,
  routeLeadStatus,
  shouldTriggerAutoBackup,
  stripMarkdownFences,
  upsertRewardMemory,
} from './pipelineLogic';
import type { LeadRecord, RewardMemoryItem } from '../shared/types';

test('stripMarkdownFences and parseLlmJson strip ```json wrappers cleanly', () => {
  const raw = 'Here is the result:\n```json\n{"pain_signal": 21, "niche_fit": 20}\n```\nDone.';
  assert.equal(stripMarkdownFences(raw), '{"pain_signal": 21, "niche_fit": 20}');
  const parsed = parseLlmJson<{ pain_signal: number; niche_fit: number }>(raw);
  assert.equal(parsed.pain_signal, 21);
  assert.equal(parsed.niche_fit, 20);
});

test('sub-scores clamp to 0-25 and routeLeadStatus enforces 75 / 50 thresholds', () => {
  const scores = clampSubScores({
    pain_signal: 30,
    niche_fit: 20,
    web_booking_gap: 25,
    reachability: -4,
  });
  assert.deepEqual(scores, {
    pain_signal: 25,
    niche_fit: 20,
    web_booking_gap: 25,
    reachability: 0,
  });
  assert.equal(computeTotalScore(scores), 70);
  assert.equal(routeLeadStatus(75), 'APPROVED_FOR_OUTREACH');
  assert.equal(routeLeadStatus(100), 'APPROVED_FOR_OUTREACH');
  assert.equal(routeLeadStatus(74), 'NEEDS_REVIEW');
  assert.equal(routeLeadStatus(50), 'NEEDS_REVIEW');
  assert.equal(routeLeadStatus(49), 'PASS');
});

test('getCalibrationContext returns top 3 rewarded winners and top 2 penalized leads', () => {
  const items: RewardMemoryItem[] = [
    {
      lead_id: '1',
      business_name: 'Win A',
      domain: 'a.com',
      niche: 'Dental',
      market: 'UK',
      total_score: 88,
      sub_scores: { pain_signal: 22, niche_fit: 22, web_booking_gap: 22, reachability: 22 },
      bottleneck_diagnosis: 'No booking',
      gatekeeper_reason: 'Strong fit',
      outreach_cold_email: 'Email A',
      outcome: 'POSITIVE_REPLY',
      reward_points: 10,
      recorded_at: '2026-11-20T10:00:00Z',
    },
    {
      lead_id: '2',
      business_name: 'Win B',
      domain: 'b.com',
      niche: 'Dental',
      market: 'UK',
      total_score: 91,
      sub_scores: { pain_signal: 23, niche_fit: 23, web_booking_gap: 23, reachability: 22 },
      bottleneck_diagnosis: 'Slow callback',
      gatekeeper_reason: 'Booked quickly',
      outreach_cold_email: 'Email B',
      outcome: 'BOOKED_DEMO',
      reward_points: 25,
      recorded_at: '2026-11-21T10:00:00Z',
    },
    {
      lead_id: '3',
      business_name: 'Win C',
      domain: 'c.com',
      niche: 'MedSpa',
      market: 'US',
      total_score: 84,
      sub_scores: { pain_signal: 21, niche_fit: 21, web_booking_gap: 21, reachability: 21 },
      bottleneck_diagnosis: 'Form dropoff',
      gatekeeper_reason: 'Good match',
      outreach_cold_email: 'Email C',
      outcome: 'BOOKED_DEMO',
      reward_points: 25,
      recorded_at: '2026-11-22T10:00:00Z',
    },
    {
      lead_id: '4',
      business_name: 'Win D',
      domain: 'd.com',
      niche: 'HVAC',
      market: 'US',
      total_score: 79,
      sub_scores: { pain_signal: 20, niche_fit: 20, web_booking_gap: 20, reachability: 19 },
      bottleneck_diagnosis: 'After-hours miss',
      gatekeeper_reason: 'Okay fit',
      outreach_cold_email: 'Email D',
      outcome: 'POSITIVE_REPLY',
      reward_points: 10,
      recorded_at: '2026-11-19T10:00:00Z',
    },
    {
      lead_id: '5',
      business_name: 'Loss E',
      domain: 'e.com',
      niche: 'Enterprise',
      market: 'US',
      total_score: 76,
      sub_scores: { pain_signal: 18, niche_fit: 19, web_booking_gap: 19, reachability: 20 },
      bottleneck_diagnosis: 'Custom portal',
      gatekeeper_reason: 'In-house team',
      outreach_cold_email: null,
      outcome: 'WRONG_FIT',
      reward_points: -15,
      recorded_at: '2026-11-21T10:00:00Z',
    },
    {
      lead_id: '6',
      business_name: 'Loss F',
      domain: 'f.com',
      niche: 'Plumbing',
      market: 'UK',
      total_score: 77,
      sub_scores: { pain_signal: 19, niche_fit: 20, web_booking_gap: 19, reachability: 19 },
      bottleneck_diagnosis: 'Old site',
      gatekeeper_reason: 'No reply',
      outreach_cold_email: null,
      outcome: 'NO_REPLY',
      reward_points: -2,
      recorded_at: '2026-11-21T10:00:00Z',
    },
    {
      lead_id: '7',
      business_name: 'Loss G',
      domain: 'g.com',
      niche: 'Retail',
      market: 'UK',
      total_score: 75,
      sub_scores: { pain_signal: 18, niche_fit: 19, web_booking_gap: 19, reachability: 19 },
      bottleneck_diagnosis: 'Static page',
      gatekeeper_reason: 'Wrong vertical',
      outreach_cold_email: null,
      outcome: 'WRONG_FIT',
      reward_points: -15,
      recorded_at: '2026-11-22T10:00:00Z',
    },
  ];

  const ctx = getCalibrationContext(items);
  assert.equal(ctx.top_winners.length, 3);
  assert.deepEqual(
    ctx.top_winners.map((w) => w.lead_id),
    ['3', '2', '1']
  );
  assert.equal(ctx.top_penalized.length, 2);
  assert.deepEqual(
    ctx.top_penalized.map((p) => p.lead_id),
    ['7', '5']
  );
});

test('normalizeDomainKey and isDuplicateProspect catch existing domains/names', () => {
  assert.equal(normalizeDomainKey('https://www.harleydental.co.uk/contact/'), 'harleydental.co.uk');
  assert.equal(
    isDuplicateProspect(
      { business_name: 'Harley Street Dental', domain: 'https://www.harleydental.co.uk/' },
      [{ business_name: 'Other Name', domain: 'harleydental.co.uk' }]
    ),
    true
  );
  assert.equal(
    isDuplicateProspect(
      { business_name: 'Fresh Clinic', domain: 'freshclinic.co.uk' },
      [{ business_name: 'Other Name', domain: 'harleydental.co.uk' }]
    ),
    false
  );
});

test('parseBatchLines validates format, market, and 10-line cap', () => {
  const valid = parseBatchLines(
    'Apex Dental | apexdental.co.uk | Dental Clinics | UK\nBright MedSpa | brightmed.com | MedSpa | US | High ad spend'
  );
  assert.equal(valid.errors.length, 0);
  assert.equal(valid.items.length, 2);
  assert.equal(valid.items[1].discovery_notes, 'High ad spend');

  const tooMany = parseBatchLines(
    Array.from({ length: 11 }, (_, i) => `Biz ${i} | biz${i}.com | Dental | US`).join('\n')
  );
  assert.equal(tooMany.errors.length, 1);

  const badMarket = parseBatchLines('Biz | biz.com | Dental | CA');
  assert.equal(badMarket.errors.length, 1);
});

test('CSV export, JSON import, reward memory upsert, and 5-approved auto-backup threshold', () => {
  const sampleLead: LeadRecord = {
    id: 'lead-100',
    business_name: 'Kensington "Smile" Studio',
    domain: 'kensingtonsmile.co.uk',
    niche: 'Dental Clinics',
    market: 'UK',
    discovery_notes: 'Missing online triage',
    intake_mode: 'single',
    bottleneck_diagnosis: 'Manual phone booking only',
    missed_capture_leaks: ['No 24/7 booking widget'],
    ai_web_opportunities: ['Instant hygiene booking funnel'],
    grounding_sources: [],
    sub_scores: { pain_signal: 22, niche_fit: 23, web_booking_gap: 24, reachability: 19 },
    total_score: 88,
    status: 'APPROVED_FOR_OUTREACH',
    gatekeeper_reason: 'High booking friction with active PPC traffic.',
    outreach_pack: {
      cold_email: { subject: 'Quick booking gap on kensingtonsmile.co.uk', body: 'Hello team...' },
      social_dm: 'Hi — noticed your booking form requires phone callback.',
      follow_up_sequence: [],
    },
    outcome: null,
    reward_points: 0,
    created_at: '2026-11-22T08:00:00Z',
    updated_at: '2026-11-22T08:00:00Z',
    model_trace: ['planner:gemini-3.8-flash', 'qualifier:gemini-3.5-flash-lite'],
  };

  const csv = leadsToCsv([sampleLead]);
  assert.ok(csv.includes('"Kensington ""Smile"" Studio"'));

  const updatedMemory = upsertRewardMemory([], sampleLead, 'BOOKED_DEMO', '2026-11-22T09:00:00Z');
  assert.equal(updatedMemory.length, 1);
  assert.equal(updatedMemory[0].reward_points, 25);

  const exported = JSON.stringify({ leads: [sampleLead], rewardMemory: updatedMemory });
  const imported = parseImportedJson(exported);
  assert.equal(imported.leads.length, 1);
  assert.equal(imported.rewardMemory.length, 1);

  assert.equal(shouldTriggerAutoBackup(0, 4), false);
  assert.equal(shouldTriggerAutoBackup(0, 5), true);
  assert.equal(shouldTriggerAutoBackup(5, 9), false);
  assert.equal(shouldTriggerAutoBackup(5, 10), true);
});
