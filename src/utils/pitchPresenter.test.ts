import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPitchPresentation,
  buildSeedPitchForTrack,
  getPlainEnglishStatus,
  getStorageKeyForTrack,
  recommendServiceForLead,
  SERVICE_PILLARS,
  WEBSITE_TEMPLATES,
} from './pitchPresenter';

test('Local Market and Global Market use strictly isolated storage keys and seed records', () => {
  const localKey = getStorageKeyForTrack('LOCAL');
  const globalKey = getStorageKeyForTrack('GLOBAL');
  assert.notEqual(localKey, globalKey);

  const localSeed = buildSeedPitchForTrack('LOCAL');
  const globalSeed = buildSeedPitchForTrack('GLOBAL');
  assert.notEqual(localSeed.business_name, globalSeed.business_name);
});

test('recommendServiceForLead maps bottlenecks strictly to the 3 B2B pillars with zero UGC', () => {
  assert.equal(SERVICE_PILLARS.length, 3);

  const agenticRec = recommendServiceForLead({
    discovery_notes: 'Needs autonomous CRM lead routing and multi-step qualification',
    bottleneck_diagnosis: 'Intake team spends hours researching inquiries before routing',
    missed_capture_leaks: [],
    ai_web_opportunities: [],
    niche: 'B2B Advisory',
  });
  assert.equal(agenticRec.service, 'Custom Agentic AI');

  const automationRec = recommendServiceForLead({
    discovery_notes: 'No online booking',
    bottleneck_diagnosis: 'Patients wait for callback after hours',
    missed_capture_leaks: [],
    ai_web_opportunities: [],
    niche: 'Dental Clinic',
  });
  assert.equal(automationRec.service, 'AI Business Automation');

  const webRec = recommendServiceForLead({
    discovery_notes: 'Outdated design and hard to use on mobile',
    bottleneck_diagnosis: 'Slow layout with low conversion rate',
    missed_capture_leaks: [],
    ai_web_opportunities: [],
    niche: 'Architecture',
  });
  assert.equal(webRec.service, 'Professional Website Design');
});

test('buildPitchPresentation returns zero-pricing pitch and plain-English status mapping', () => {
  const seed = buildSeedPitchForTrack('GLOBAL');
  seed.outreach_pack = null;
  const presentation = buildPitchPresentation(seed);
  assert.equal(presentation.service, 'AI Business Automation');
  assert.ok(presentation.messageBody.includes(seed.business_name));
  assert.ok(!/\$|£|€|retainer|month/i.test(presentation.messageBody));
  assert.equal(WEBSITE_TEMPLATES.length, 4);

  assert.equal(getPlainEnglishStatus('APPROVED_FOR_OUTREACH').label, 'Ready to Contact');
  assert.equal(getPlainEnglishStatus('NEEDS_REVIEW').label, 'Needs Quick Review');
  assert.equal(getPlainEnglishStatus('PASS').label, 'Not a Fit');
});
