import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPitchPresentation,
  buildSeedPitchForTrack,
  DEFAULT_VIDEO_MODEL_ID,
  DEFAULT_VIDEO_PROVIDER_ID,
  formatVideoErrorMessage,
  getStorageKeyForTrack,
  isAllowedVideoModel,
  isAllowedVideoProvider,
  recommendServiceForLead,
  VIDEO_MODEL_OPTIONS,
  VIDEO_PROVIDER_OPTIONS,
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

test('Video models default to Wan-AI/Wan2.2-TI2V-5B and providers support Auto, fal, and WaveSpeed', () => {
  assert.equal(DEFAULT_VIDEO_MODEL_ID, 'Wan-AI/Wan2.2-TI2V-5B');
  assert.equal(VIDEO_MODEL_OPTIONS[0].modelId, 'Wan-AI/Wan2.2-TI2V-5B');
  assert.equal(DEFAULT_VIDEO_PROVIDER_ID, 'auto');
  assert.deepEqual(
    VIDEO_PROVIDER_OPTIONS.map((p) => p.providerId),
    ['auto', 'fal-ai', 'wavespeed']
  );

  assert.equal(isAllowedVideoModel('Wan-AI/Wan2.2-TI2V-5B'), true);
  assert.equal(isAllowedVideoModel('Wan-AI/Wan2.2-T2V-A14B'), true);
  assert.equal(isAllowedVideoModel('Wan-AI/Wan2.1-T2V-14B'), true);
  assert.equal(isAllowedVideoModel('tencent/HunyuanVideo'), true);
  assert.equal(isAllowedVideoModel('Lightricks/LTX-Video-0.9.8-13B-distilled'), false);
  assert.equal(isAllowedVideoModel('unknown/model'), false);

  assert.equal(isAllowedVideoProvider('auto'), true);
  assert.equal(isAllowedVideoProvider('fal-ai'), true);
  assert.equal(isAllowedVideoProvider('wavespeed'), true);
  assert.equal(isAllowedVideoProvider('unknown-provider'), false);
});

test('formatVideoErrorMessage converts raw provider errors into short plain-English explanations', () => {
  const creditsMsg = formatVideoErrorMessage(
    'You have depleted your monthly included credits for fal-ai',
    402,
    'fal-ai'
  );
  assert.match(creditsMsg, /credits or active billing/i);
  assert.doesNotMatch(creditsMsg, /402/);

  const authMsg = formatVideoErrorMessage('Invalid credentials in Authorization header', 401, 'auto');
  assert.match(authMsg, /token was not accepted/i);
  assert.doesNotMatch(authMsg, /401/);

  const scopeMsg = formatVideoErrorMessage(
    'This authentication method does not have sufficient permissions for Inference Providers',
    403,
    'wavespeed'
  );
  assert.match(scopeMsg, /Inference Providers permission/i);
});
