import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASPECT_RATIO_OPTIONS,
  buildSeedZeroDollarBlueprint,
  CAMERA_FRAMING_OPTIONS,
  CLOUD_VIDEO_OPTIONS,
  DURATION_PRESETS,
  formatBlueprintAsProductionSheet,
  formatChapterMarkersText,
  formatSecondsToTimestamp,
  normalizeBlueprintToExactDuration,
  SAMPLE_QUICK_PRESETS,
  sanitizeAntiSludgeText,
  STUDIO_STAGE_STEPS,
  VIDEO_FORMAT_OPTIONS,
  WORKFLOW_MODE_OPTIONS,
} from './videoBlueprint';

test('formatSecondsToTimestamp renders exact MM:SS strings across short and long videos', () => {
  assert.equal(formatSecondsToTimestamp(0), '00:00');
  assert.equal(formatSecondsToTimestamp(8), '00:08');
  assert.equal(formatSecondsToTimestamp(30), '00:30');
  assert.equal(formatSecondsToTimestamp(120), '02:00');
  assert.equal(formatSecondsToTimestamp(3600), '60:00');
  assert.equal(formatSecondsToTimestamp(4500), '75:00');
});

test('workflow modes, 4 video formats, aspect ratios, cloud models, and live stage steps match expected structure', () => {
  assert.deepEqual(
    WORKFLOW_MODE_OPTIONS.map((m) => m.id),
    ['camera_builder', 'fresh_concept']
  );
  assert.deepEqual(VIDEO_FORMAT_OPTIONS, [
    'Business / Channel / Funnel Video',
    'Deep Dive Documentary',
    'Client Case Study Breakdown',
    'Full Training Walk (60m+)',
  ]);
  assert.deepEqual(CAMERA_FRAMING_OPTIONS, [
    'Static Tripod',
    'Slow Dolly / Pan',
    'Locked Medium / Close Shot',
  ]);
  assert.deepEqual(
    ASPECT_RATIO_OPTIONS.map((a) => a.id),
    ['16:9', '9:16']
  );
  assert.equal(CLOUD_VIDEO_OPTIONS.length, 2);
  assert.equal(STUDIO_STAGE_STEPS.length, 3);
  assert.ok(DURATION_PRESETS.some((p) => p.seconds === 30));
  assert.ok(DURATION_PRESETS.some((p) => p.seconds === 3600));
  assert.equal(SAMPLE_QUICK_PRESETS.length, 3);
});

test('sanitizeAntiSludgeText cleans AI slop traits, simulated disclaimers, buzzwords, and negated clauses cleanly', () => {
  const dirty =
    'Hyperrealistic 8k cgi glow shot with waxy skin, melting hands, soft haze, insert engaging content here, and repeat this pattern.';
  const cleaned = sanitizeAntiSludgeText(dirty);
  assert.doesNotMatch(
    cleaned,
    /hyperrealistic|8k|cgi glow|waxy skin|melting hands|soft haze|insert engaging content here|repeat this pattern/i
  );

  const clause = sanitizeAntiSludgeText(
    'Zero hazy overlays, dreamy blurs, plastic skin, or motion smear on the baked goods with solid typography.'
  );
  assert.doesNotMatch(clause, /zero .*stable tripod/i);
  assert.doesNotMatch(clause, /throughout[a-z]/i);
  assert.match(clause, /natural human and object physics, crisp focus/i);

  const disclaimer = sanitizeAntiSludgeText(
    'All shots are simulated or real tripod clips. Confirmed: No glowing overlays, plastic textures, or fake CGI effects.'
  );
  assert.doesNotMatch(disclaimer, /simulated|glowing overlays|plastic textures|fake cgi/i);
  assert.match(disclaimer, /every shot uses real/i);
});

test('normalizeBlueprintToExactDuration strictly prevents length hijacking across 30s, 2m, and 60m', () => {
  const bloated = {
    title: 'Sweet Lake Bloated Draft',
    segments: [
      {
        segment_number: 1,
        title: 'Part 1',
        start_time: '00:00',
        end_time: '30:00',
        duration_seconds: 1800,
        duration_label: '30m',
        camera_mix: 'Desk',
        spoken_script: 'Long text',
        sharp_visual_direction: 'Crisp counter',
        motion_graphics_cue: 'Title',
        free_editor_note: 'Cut',
      },
      {
        segment_number: 2,
        title: 'Part 2',
        start_time: '30:00',
        end_time: '60:00',
        duration_seconds: 1800,
        duration_label: '30m',
        camera_mix: 'Counter',
        spoken_script: 'More text',
        sharp_visual_direction: 'Espresso pour',
        motion_graphics_cue: 'Lower third',
        free_editor_note: 'Export',
      },
    ],
  };

  const thirtySec = normalizeBlueprintToExactDuration(bloated, {
    topic: 'Sweet Lake Bakery',
    mode: 'camera_builder',
    format: 'Business / Channel / Funnel Video',
    cameraFraming: 'Slow Dolly / Pan',
    aspectRatio: '9:16',
    targetSeconds: 30,
    shootingSetup: 'Counter / Product Close-Up (Locked Tripod)',
    rawClipNotes: 'Espresso pour',
  });
  assert.equal(thirtySec.total_seconds, 30);
  assert.equal(thirtySec.total_runtime_formatted, '00:30');
  assert.equal(thirtySec.segments.length, 4);
  assert.equal(thirtySec.segments[thirtySec.segments.length - 1].end_time, '00:30');
  assert.equal(thirtySec.camera_framing_style, 'Slow Dolly / Pan');
  assert.equal(thirtySec.aspect_ratio, '9:16');
  assert.ok(thirtySec.master_video_prompt.length > 30);
  assert.ok(thirtySec.segments.every((s) => s.realistic_video_prompt.length > 20));

  const sixtyMin = normalizeBlueprintToExactDuration(
    {},
    {
      topic: 'Full Training Course',
      mode: 'fresh_concept',
      format: 'Full Training Walk (60m+)',
      targetSeconds: 3600,
      shootingSetup: 'Desk & Window Daylight (Tripod)',
      rawClipNotes: '',
    }
  );
  assert.equal(sixtyMin.total_seconds, 3600);
  assert.equal(sixtyMin.total_runtime_formatted, '60:00');
  assert.equal(sixtyMin.segments.length, 8);
  assert.equal(sixtyMin.segment_noun, 'Chapter');

  for (let i = 1; i < sixtyMin.segments.length; i++) {
    assert.equal(sixtyMin.segments[i].start_time, sixtyMin.segments[i - 1].end_time);
  }
});

test('buildSeedZeroDollarBlueprint exports realistic master prompt and timestamps', () => {
  const seed = buildSeedZeroDollarBlueprint();
  assert.equal(seed.total_seconds, 60);
  assert.equal(seed.total_runtime_formatted, '01:00');
  assert.match(formatChapterMarkersText(seed), /^00:00 /);
  const sheet = formatBlueprintAsProductionSheet(seed);
  assert.match(sheet, /MASTER REALISTIC AI VIDEO PROMPT/);
  assert.match(sheet, /Realistic AI Video Shot Prompt:/);
  assert.match(sheet, /Sweet Lake/);
});
