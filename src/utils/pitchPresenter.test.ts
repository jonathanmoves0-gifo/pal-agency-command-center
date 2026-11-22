import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPitchPresentation,
  buildSeedPitchForTrack,
  getStorageKeyForTrack,
  isAllowedVideoModel,
  recommendServiceForLead,
  VIDEO_QUALITY_OPTIONS,
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

test('recommendServiceForLead maps website issues to the right plain-English service', () => {
  const bookingRec = recommendServiceForLead({
    discovery_notes: 'No online booking',
    bottleneck_diagnosis: 'Patients must wait for a callback',
    missed_capture_leaks: [],
    ai_web_opportunities: [],
    niche: 'Dental Clinic',
  });
  assert.equal(bookingRec.service, 'AI Booking Assistant');

  const videoRec = recommendServiceForLead({
    discovery_notes: 'Needs social reels and product videos',
    bottleneck_diagnosis: 'Low TikTok and Instagram ad engagement',
    missed_capture_leaks: [],
    ai_web_opportunities: [],
    niche: 'Boutique Shop',
  });
  assert.equal(videoRec.service, 'AI Video Ads');

  const webRec = recommendServiceForLead({
    discovery_notes: 'Outdated design and hard to use on mobile',
    bottleneck_diagnosis: 'Slow layout with tiny buttons',
    missed_capture_leaks: [],
    ai_web_opportunities: [],
    niche: 'Architecture',
  });
  assert.equal(webRec.service, 'Website Upgrade');
});

test('buildPitchPresentation always returns a clean zero-pricing message and sample highlights', () => {
  const seed = buildSeedPitchForTrack('GLOBAL');
  seed.outreach_pack = null; // Verify fallback message when outreach_pack is absent
  const presentation = buildPitchPresentation(seed);
  assert.equal(presentation.service, 'AI Booking Assistant');
  assert.ok(presentation.messageBody.includes(seed.business_name));
  assert.ok(!/\$|£|€|retainer|month/i.test(presentation.messageBody));
  assert.equal(WEBSITE_TEMPLATES.length, 4);
});

test('VIDEO_QUALITY_OPTIONS defines exact Fast Draft and High Detail Hugging Face model IDs', () => {
  assert.equal(VIDEO_QUALITY_OPTIONS.length, 2);
  assert.equal(VIDEO_QUALITY_OPTIONS[0].label, 'Fast Draft (LTX-Video)');
  assert.equal(VIDEO_QUALITY_OPTIONS[0].modelId, 'Lightricks/LTX-Video-0.9.8-13B-distilled');
  assert.equal(VIDEO_QUALITY_OPTIONS[1].label, 'High Detail (Wan 2.2)');
  assert.equal(VIDEO_QUALITY_OPTIONS[1].modelId, 'Wan-AI/Wan2.2-TI2V-5B');
  assert.equal(isAllowedVideoModel('Lightricks/LTX-Video-0.9.8-13B-distilled'), true);
  assert.equal(isAllowedVideoModel('Wan-AI/Wan2.2-TI2V-5B'), true);
  assert.equal(isAllowedVideoModel('unknown/model'), false);
});
