export type VideoWorkflowMode = 'camera_builder' | 'fresh_concept';

export type VideoFormatType =
  | 'Business / Channel / Funnel Video'
  | 'Deep Dive Documentary'
  | 'Client Case Study Breakdown'
  | 'Full Training Walk (60m+)';

export type TargetDurationSeconds = 30 | 60 | 90 | 120 | 900 | 3600 | 4500 | 5400;

export type CameraFramingStyle =
  | 'Static Tripod'
  | 'Slow Dolly / Pan'
  | 'Locked Medium / Close Shot';

export const CAMERA_FRAMING_OPTIONS: CameraFramingStyle[] = [
  'Static Tripod',
  'Slow Dolly / Pan',
  'Locked Medium / Close Shot',
];

export type VideoAspectRatio = '16:9' | '9:16';

export const ASPECT_RATIO_OPTIONS: Array<{
  id: VideoAspectRatio;
  label: string;
  description: string;
}> = [
  {
    id: '16:9',
    label: '16:9 Widescreen',
    description: 'YouTube, Website, Training',
  },
  {
    id: '9:16',
    label: '9:16 Vertical',
    description: 'Reels, Shorts, TikTok',
  },
];

export type CloudVideoModelId =
  | 'Wan-AI/Wan2.2-TI2V-5B'
  | 'Lightricks/LTX-Video-0.9.8-13B-distilled';

export const CLOUD_VIDEO_OPTIONS: Array<{
  id: CloudVideoModelId;
  label: string;
  note: string;
}> = [
  {
    id: 'Wan-AI/Wan2.2-TI2V-5B',
    label: 'High Detail (Wan 2.2)',
    note: 'Richer real-world lighting & textures',
  },
  {
    id: 'Lightricks/LTX-Video-0.9.8-13B-distilled',
    label: 'Fast Draft (LTX-Video)',
    note: 'Quicker preview turn-around',
  },
];

export type VideoStudioStatus = 'idle' | 'generating' | 'ready' | 'needs_attention';
export type StudioStageStepStatus = 'pending' | 'active' | 'done' | 'attention';

export interface StudioStageStep {
  step: 1 | 2 | 3;
  label: string;
  status: StudioStageStepStatus;
  detail: string;
}

export const STUDIO_STAGE_STEPS: Array<{ step: 1 | 2 | 3; label: string; defaultDetail: string }> = [
  {
    step: 1,
    label: '1. Structuring Realistic Scene...',
    defaultDetail: 'Setting concrete real-world location, exact runtime beats, and subject action.',
  },
  {
    step: 2,
    label: '2. Applying Anti-Slop Camera & Lighting Rules...',
    defaultDetail:
      'Enforcing natural skin/object physics, practical lighting direction, and steady framing.',
  },
  {
    step: 3,
    label: '3. Generating Video / Building Timeline...',
    defaultDetail:
      'Connecting live video renderer and assembling ready-to-shoot prompts & motion graphics.',
  },
];

export interface VideoStudioStreamEvent {
  type: 'stage_started' | 'stage_completed' | 'studio_completed' | 'error';
  step?: 1 | 2 | 3;
  message?: string;
  blueprint?: ProductionBlueprint;
  timestamp: string;
}

export const WORKFLOW_MODE_OPTIONS: Array<{
  id: VideoWorkflowMode;
  label: string;
  description: string;
}> = [
  {
    id: 'camera_builder',
    label: 'Camera Clip & Video Builder',
    description: 'Combine your filmed footage and notes with crisp B-roll & graphics.',
  },
  {
    id: 'fresh_concept',
    label: 'Fresh Concept',
    description: 'Plan a brand-new shot list, script, and visual guide from scratch.',
  },
];

export const VIDEO_FORMAT_OPTIONS: VideoFormatType[] = [
  'Business / Channel / Funnel Video',
  'Deep Dive Documentary',
  'Client Case Study Breakdown',
  'Full Training Walk (60m+)',
];

export const DURATION_PRESETS: Array<{
  seconds: TargetDurationSeconds;
  shortLabel: string;
  label: string;
  category: 'short' | 'long';
  segmentCount: number;
  segmentNoun: 'Scene' | 'Chapter';
}> = [
  {
    seconds: 30,
    shortLabel: '30 Secs',
    label: '30 Seconds (Quick Promo)',
    category: 'short',
    segmentCount: 4,
    segmentNoun: 'Scene',
  },
  {
    seconds: 60,
    shortLabel: '60 Secs',
    label: '60 Seconds (Social / Ad)',
    category: 'short',
    segmentCount: 5,
    segmentNoun: 'Scene',
  },
  {
    seconds: 90,
    shortLabel: '90 Secs',
    label: '90 Seconds (Brand Story)',
    category: 'short',
    segmentCount: 5,
    segmentNoun: 'Scene',
  },
  {
    seconds: 120,
    shortLabel: '2 Mins',
    label: '2 Minutes (Case Study)',
    category: 'short',
    segmentCount: 6,
    segmentNoun: 'Scene',
  },
  {
    seconds: 900,
    shortLabel: '15 Mins',
    label: '15 Minutes (Walkthrough)',
    category: 'long',
    segmentCount: 6,
    segmentNoun: 'Chapter',
  },
  {
    seconds: 3600,
    shortLabel: '60 Mins (60m+)',
    label: '60 Minutes (Full Training)',
    category: 'long',
    segmentCount: 8,
    segmentNoun: 'Chapter',
  },
  {
    seconds: 4500,
    shortLabel: '75 Mins',
    label: '75 Minutes (Deep Course)',
    category: 'long',
    segmentCount: 9,
    segmentNoun: 'Chapter',
  },
  {
    seconds: 5400,
    shortLabel: '90 Mins',
    label: '90 Minutes (Masterclass)',
    category: 'long',
    segmentCount: 10,
    segmentNoun: 'Chapter',
  },
];

export const DEFAULT_DURATION_SECONDS: TargetDurationSeconds = 60;

export const SHOOTING_SETUP_PRESETS = [
  'Desk & Window Daylight (Tripod)',
  'Counter / Product Close-Up (Locked Tripod)',
  'On-Location Walkthrough (Steady Gimbal)',
] as const;

export interface SampleQuickPreset {
  id: string;
  label: string;
  mode: VideoWorkflowMode;
  topic: string;
  format: VideoFormatType;
  durationSeconds: TargetDurationSeconds;
  shootingSetup: string;
  rawClipNotes: string;
}

export const SAMPLE_QUICK_PRESETS: SampleQuickPreset[] = [
  {
    id: 'sweet-lake-promo',
    label: 'Sweet Lake (30s Promo)',
    mode: 'camera_builder',
    topic: 'Sweet Lake Bakery & Café',
    format: 'Business / Channel / Funnel Video',
    durationSeconds: 30,
    shootingSetup: 'Counter / Product Close-Up (Locked Tripod)',
    rawClipNotes:
      'Clip 1: Morning espresso pour at window counter. Clip 2: Fresh sourdough loaves cooling on wooden rack.',
  },
  {
    id: 'dental-case-study',
    label: 'Clinic (2m Case Study)',
    mode: 'camera_builder',
    topic: 'Kilimani Care Dental',
    format: 'Client Case Study Breakdown',
    durationSeconds: 120,
    shootingSetup: 'Desk & Window Daylight (Tripod)',
    rawClipNotes:
      'Clip 1: Desk intro explaining missed evening enquiries. Clip 2: Screen capture of 2-tap online appointment picker.',
  },
  {
    id: 'agency-full-training',
    label: 'Full Training Walk (60m+)',
    mode: 'fresh_concept',
    topic: 'Complete Local Lead Generation System',
    format: 'Full Training Walk (60m+)',
    durationSeconds: 3600,
    shootingSetup: 'Desk & Window Daylight (Tripod)',
    rawClipNotes:
      'Cover mobile speed audits, instant booking setup, filming clean proof clips on $0 budget, and free CapCut/DaVinci assembly.',
  },
];

export interface ProductionSegment {
  segment_number: number;
  title: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  duration_label: string;
  camera_mix: string;
  realistic_video_prompt: string;
  spoken_script: string;
  sharp_visual_direction: string;
  motion_graphics_cue: string;
  free_editor_note: string;
}

export interface ProductionBlueprint {
  title: string;
  mode: VideoWorkflowMode;
  format: VideoFormatType;
  camera_framing_style: CameraFramingStyle;
  aspect_ratio: VideoAspectRatio;
  target_seconds: TargetDurationSeconds;
  total_seconds: number;
  total_runtime_formatted: string;
  segment_noun: 'Scene' | 'Chapter';
  master_video_prompt: string;
  anti_slop_standard: string;
  zero_dollar_summary: string;
  video_render_status?: 'ready' | 'needs_attention';
  video_render_message?: string;
  video_data_url?: string | null;
  video_model_used?: string | null;
  sharpness_rules: {
    subject_focus: string;
    lighting_contrast: string;
    camera_stability: string;
    sludge_banned_confirm: string;
  };
  camera_and_graphics_plan: {
    footage_blend_strategy: string;
    lower_third_style: string;
    callout_and_transition_rules: string;
  };
  segments: ProductionSegment[];
  editor_assembly_checklist: string[];
}

const SLUDGE_REPLACEMENTS: Array<[RegExp, string]> = [
  // Clean whole negated or confirmation disclaimer clauses before word-level fallbacks
  [
    /\b(?:confirmed\s*:\s*)?(?:no|zero|without)\s+[^.;!\n]{0,95}\b(?:hazy overlays?|glowing overlays?|dreamy[- ]?blooms?|dreamy[- ]?blurs?|soft[- ]?haze|soft[- ]?focus|neon[- ]?glow(?:ing)?|cgi[- ]?glow|fake[- ]?cgi(?: effects?)?|waxy[- ]?skin|plastic[- ]?skin|plastic[- ]?textures?|melting[- ]?(?:hands|objects)|warp(?:ed|ing)[- ]?(?:hands|objects)|motion[- ]?smear(?:ed)?|blurry bokeh|ai[- ]?(?:sludge|slop))\b(?:[^.;!\n]{0,45}\b)?/gi,
    'natural human and object physics, crisp focus, practical real-world lighting, and steady framing throughout ',
  ],
  [/\ball shots are simulated or real\b/gi, 'every shot uses real'],
  [/\bsimulated\b/gi, 'staged'],
  [/\bhyper[- ]?realistic\b/gi, 'grounded real-world camera capture'],
  [/\bcinematic masterpiece\b/gi, 'clean, believable real-world footage'],
  [/\b(8k|4k ultra[- ]?hd|uhd masterpiece|unreal engine)\b/gi, 'sharp natural optical detail'],
  [/\b(waxy|plastic)[- ]?skin\b/gi, 'natural human skin texture'],
  [/\bplastic[- ]?textures?\b/gi, 'authentic real-world surface textures'],
  [/\bglowing[- ]?overlays?\b/gi, 'clean opaque title bars'],
  [/\bfake[- ]?cgi(?: effects?)?\b/gi, 'real physical props and lighting'],
  [/\b(melting|warp(?:ed|ing))[- ]?(hands|objects|fingers|faces)\b/gi, 'solid real-world geometry and natural movement'],
  [/\bover[- ]?saturated[- ]?neon\b/gi, 'balanced natural color'],
  [/\b(?:neon|cgi)[- ]?glow(ing)?\b/gi, 'clean directional daylight and practical room light'],
  [/\bfuturistic cyber(punk)?( look| aesthetic| world)?\b/gi, 'modern everyday real-world room'],
  [/\bdreamy[- ]?bloom\b/gi, 'clean sharp edge contrast'],
  [/\bsoft[- ]?haze\b/gi, 'crisp natural lighting'],
  [/\bsoft[- ]?focus\b/gi, 'tack-sharp focus on the main subject'],
  [/\bmotion[- ]?smear(ed)?\b/gi, 'steady tripod-locked motion'],
  [/\brepeat this pattern\b/gi, 'deliver this specific step directly on camera'],
  [/\binsert engaging content here\b/gi, 'deliver the specific customer benefit directly on camera'],
];

export function sanitizeAntiSludgeText(input: string): string {
  let output = String(input ?? '').trim();
  for (const [pattern, replacement] of SLUDGE_REPLACEMENTS) {
    output = output.replace(pattern, replacement);
  }
  return output
    .replace(/\s+([.,;!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function getDurationPreset(seconds: number): (typeof DURATION_PRESETS)[number] {
  return (
    DURATION_PRESETS.find((p) => p.seconds === seconds) ??
    DURATION_PRESETS.find((p) => p.seconds === DEFAULT_DURATION_SECONDS)!
  );
}

export function formatSecondsToTimestamp(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.round(totalSeconds));
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatSegmentDurationLabel(seconds: number): string {
  const safe = Math.max(1, Math.round(seconds));
  if (safe < 60) {
    return `${safe}s`;
  }
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return rem === 0 ? `${mins}m` : `${mins}m ${rem}s`;
}

export function buildMasterRealisticVideoPrompt(opts: {
  topic: string;
  format: VideoFormatType;
  shootingSetup: string;
  cameraFraming: CameraFramingStyle;
  aspectRatio?: VideoAspectRatio;
  rawClipNotes: string;
}): string {
  const topic = opts.topic.trim() || 'Local Business';
  const framing = opts.cameraFraming || 'Static Tripod';
  const ratioLabel = opts.aspectRatio === '9:16' ? '9:16 vertical' : '16:9 widescreen';
  const setup = opts.shootingSetup.trim() || 'Desk & Window Daylight (Tripod)';
  const notesClause = opts.rawClipNotes.trim()
    ? `Action on screen: ${sanitizeAntiSludgeText(opts.rawClipNotes.trim().slice(0, 180))}. `
    : `Action on screen: Calm, natural everyday interaction showcasing ${topic}. `;

  return sanitizeAntiSludgeText(
    `${framing} ${ratioLabel} eye-level real-world video filmed at ${setup} for ${topic} (${opts.format}). ` +
      notesClause +
      `Natural window daylight mixed with subtle practical interior lighting, accurate skin tones, solid object geometry, calm natural movement, crisp focus on the foreground subject, and clean optical depth.`
  );
}

function buildFallbackSegment(
  segmentNum: number,
  noun: 'Scene' | 'Chapter',
  topic: string,
  shootingSetup: string,
  cameraFraming: CameraFramingStyle,
  rawNotes: string
): Omit<ProductionSegment, 'start_time' | 'end_time' | 'duration_label'> {
  const focusNote = rawNotes.trim()
    ? `Use your recorded clip notes ("${rawNotes.slice(0, 85)}") right in this beat.`
    : `Speak directly to the lens about how ${topic} delivers a clear, measurable result.`;

  return {
    segment_number: segmentNum,
    title: `${noun} ${segmentNum}: Concrete Action & Proof for ${topic}`,
    duration_seconds: 15,
    camera_mix: 'Camera A-Roll (55%) + Real B-Roll / Screen Proof (45%)',
    realistic_video_prompt: `${cameraFraming} medium shot at ${shootingSetup} for ${topic}. Natural directional daylight from one side, crisp focus locked on the main subject, natural unhurried movement, solid everyday textures and steady real-world physics.`,
    spoken_script: `${focusNote} State one clear customer benefit for ${topic} in direct plain English.`,
    sharp_visual_direction: `Filmed via ${shootingSetup} (${cameraFraming}). Lock manual focus cleanly on the main subject, light from one crisp window or directional lamp, and cut cleanly to sharp B-roll.`,
    motion_graphics_cue: `Slide in a clean white lower-third with a Royal Blue accent bar reading "${topic}" and place a brief callout label in the upper-right area.`,
    free_editor_note: `Assemble in CapCut, Canva, or DaVinci Resolve Free with straight cuts and normalized voice levels (-14 LUFS).`,
  };
}

function allocateExactSeconds(
  rawWeights: number[],
  targetSeconds: TargetDurationSeconds
): number[] {
  const count = rawWeights.length;
  const minPerSegment = targetSeconds <= 90 ? 4 : targetSeconds <= 180 ? 10 : 60;
  const safeWeights = rawWeights.map((w) => (Number.isFinite(w) && w > 0 ? w : 1));
  const weightSum = safeWeights.reduce((a, b) => a + b, 0);

  const allocated = safeWeights.map((w) =>
    Math.max(minPerSegment, Math.floor((w / weightSum) * targetSeconds))
  );

  let currentSum = allocated.reduce((a, b) => a + b, 0);

  while (currentSum > targetSeconds) {
    let maxIdx = 0;
    for (let i = 1; i < count; i++) {
      if (allocated[i] > allocated[maxIdx]) maxIdx = i;
    }
    if (allocated[maxIdx] <= 1) break;
    allocated[maxIdx] -= 1;
    currentSum -= 1;
  }

  let idx = 0;
  while (currentSum < targetSeconds) {
    allocated[idx % count] += 1;
    currentSum += 1;
    idx += 1;
  }

  return allocated;
}

export function normalizeBlueprintToExactDuration(
  raw:
    | (Omit<Partial<ProductionBlueprint>, 'segments'> & {
        segments?: Array<Partial<ProductionSegment>>;
      })
    | null
    | undefined,
  opts: {
    topic: string;
    mode: VideoWorkflowMode;
    format: VideoFormatType;
    cameraFraming?: CameraFramingStyle;
    aspectRatio?: VideoAspectRatio;
    targetSeconds: TargetDurationSeconds;
    shootingSetup: string;
    rawClipNotes: string;
  }
): ProductionBlueprint {
  const topic = opts.topic.trim() || 'Client Showcase';
  const cameraFraming: CameraFramingStyle =
    opts.cameraFraming && CAMERA_FRAMING_OPTIONS.includes(opts.cameraFraming)
      ? opts.cameraFraming
      : 'Static Tripod';
  const aspectRatio: VideoAspectRatio = opts.aspectRatio === '9:16' ? '9:16' : '16:9';
  const preset = getDurationPreset(opts.targetSeconds);
  const exactTarget = preset.seconds;
  const noun = preset.segmentNoun;

  const incomingRaw = Array.isArray(raw?.segments) ? raw.segments : [];

  const cleanedDrafts = incomingRaw.slice(0, preset.segmentCount).map((seg, idx) => {
    const num = idx + 1;
    const rawAny = seg as Partial<ProductionSegment> & { duration_minutes?: number };
    const candidateSec = Number(rawAny?.duration_seconds);
    const candidateMin = Number(rawAny?.duration_minutes);
    const weight =
      Number.isFinite(candidateSec) && candidateSec > 0
        ? candidateSec
        : Number.isFinite(candidateMin) && candidateMin > 0
          ? candidateMin * 60
          : exactTarget / preset.segmentCount;

    const fallback = buildFallbackSegment(
      num,
      noun,
      topic,
      opts.shootingSetup,
      cameraFraming,
      opts.rawClipNotes
    );

    return {
      segment_number: num,
      title: sanitizeAntiSludgeText(seg?.title || '') || fallback.title,
      weight,
      camera_mix: sanitizeAntiSludgeText(seg?.camera_mix || '') || fallback.camera_mix,
      realistic_video_prompt:
        sanitizeAntiSludgeText(seg?.realistic_video_prompt || '') ||
        fallback.realistic_video_prompt,
      spoken_script: sanitizeAntiSludgeText(seg?.spoken_script || '') || fallback.spoken_script,
      sharp_visual_direction:
        sanitizeAntiSludgeText(seg?.sharp_visual_direction || '') || fallback.sharp_visual_direction,
      motion_graphics_cue:
        sanitizeAntiSludgeText(seg?.motion_graphics_cue || '') || fallback.motion_graphics_cue,
      free_editor_note:
        sanitizeAntiSludgeText(seg?.free_editor_note || '') || fallback.free_editor_note,
    };
  });

  while (cleanedDrafts.length < preset.segmentCount) {
    const num = cleanedDrafts.length + 1;
    const fallback = buildFallbackSegment(
      num,
      noun,
      topic,
      opts.shootingSetup,
      cameraFraming,
      opts.rawClipNotes
    );
    cleanedDrafts.push({
      segment_number: num,
      title: fallback.title,
      weight: exactTarget / preset.segmentCount,
      camera_mix: fallback.camera_mix,
      realistic_video_prompt: fallback.realistic_video_prompt,
      spoken_script: fallback.spoken_script,
      sharp_visual_direction: fallback.sharp_visual_direction,
      motion_graphics_cue: fallback.motion_graphics_cue,
      free_editor_note: fallback.free_editor_note,
    });
  }

  const exactDurations = allocateExactSeconds(
    cleanedDrafts.map((d) => d.weight),
    exactTarget
  );

  let cursorSeconds = 0;
  const finalizedSegments: ProductionSegment[] = cleanedDrafts.map((draft, idx) => {
    const segSecs = exactDurations[idx];
    const start_time = formatSecondsToTimestamp(cursorSeconds);
    cursorSeconds += segSecs;
    const end_time = formatSecondsToTimestamp(cursorSeconds);
    return {
      segment_number: idx + 1,
      title: draft.title,
      start_time,
      end_time,
      duration_seconds: segSecs,
      duration_label: formatSegmentDurationLabel(segSecs),
      camera_mix: draft.camera_mix,
      realistic_video_prompt: draft.realistic_video_prompt,
      spoken_script: draft.spoken_script,
      sharp_visual_direction: draft.sharp_visual_direction,
      motion_graphics_cue: draft.motion_graphics_cue,
      free_editor_note: draft.free_editor_note,
    };
  });

  const total_runtime_formatted = formatSecondsToTimestamp(cursorSeconds);

  const defaultSharpness = {
    subject_focus:
      'Lock manual focus cleanly on the foreground subject or speaker eyes so details stay tack-sharp.',
    lighting_contrast:
      'Use clean directional light (window daylight or soft key at 45°) with natural skin tones and crisp contrast.',
    camera_stability:
      `Keep camera calm and steady (${cameraFraming}) at ${opts.shootingSetup} so hands and objects move naturally.`,
    sludge_banned_confirm:
      'Every frame enforces natural textures, solid real-world physics, practical lighting, crisp optical focus, and readable on-screen graphics.',
  };

  const defaultGraphics = {
    footage_blend_strategy:
      exactTarget <= 120
        ? 'Alternate briskly between realistic camera A-roll and close-up B-roll every few seconds to hold attention from 00:00 to finish.'
        : 'Alternate cleanly every 2–3 minutes between camera A-roll, zoomed screen/product B-roll, and crisp callout graphics to avoid viewer fatigue.',
    lower_third_style:
      'Clean white lower-third bar with a Royal Blue left accent and high-contrast charcoal text built in CapCut, Canva, or DaVinci Resolve.',
    callout_and_transition_rules:
      'Use clean straight cuts on spoken pauses and 0.3s J-cuts into B-roll. Keep callouts brief and easy to read.',
  };

  const checklist =
    Array.isArray(raw?.editor_assembly_checklist) && raw.editor_assembly_checklist.length >= 3
      ? raw.editor_assembly_checklist.map((item) => sanitizeAntiSludgeText(String(item)))
      : [
          `Drop your ${opts.shootingSetup} clips and realistic AI B-roll onto a free CapCut, Canva, or DaVinci Resolve timeline set to exact ${total_runtime_formatted} length.`,
          'Trim silent gaps so every transition lands cleanly at the exact timestamp listed above.',
          'Normalize spoken audio (-14 LUFS) and add clean typography lower-thirds + callout boxes.',
          'Export crisp 1080p or 4K H.264 MP4 and inspect subject sharpness and hand/object realism on every cut.',
        ];

  const masterVideoPrompt =
    sanitizeAntiSludgeText(raw?.master_video_prompt || '') ||
    buildMasterRealisticVideoPrompt({
      topic,
      format: opts.format,
      shootingSetup: opts.shootingSetup,
      cameraFraming,
      aspectRatio,
      rawClipNotes: opts.rawClipNotes,
    });

  const antiSlopStandard =
    sanitizeAntiSludgeText(raw?.anti_slop_standard || '') ||
    'Grounded realism enforced: real physical room & props, natural skin texture, normal hand/object physics, directional daylight, calm steady camera framing, and crisp subject focus.';

  return {
    title: sanitizeAntiSludgeText(raw?.title || '') || `${topic} — ${preset.label}`,
    mode: opts.mode,
    format: opts.format,
    camera_framing_style: cameraFraming,
    aspect_ratio: aspectRatio,
    target_seconds: exactTarget,
    total_seconds: cursorSeconds,
    total_runtime_formatted,
    segment_noun: noun,
    master_video_prompt: masterVideoPrompt,
    anti_slop_standard: antiSlopStandard,
    zero_dollar_summary:
      sanitizeAntiSludgeText(raw?.zero_dollar_summary || '') ||
      `Exact ${total_runtime_formatted} realistic video production plan (${cameraFraming}) combining ${opts.mode === 'camera_builder' ? 'your filmed camera clips' : 'a fresh grounded shot plan'} (${opts.shootingSetup}) with crisp B-roll and clean graphics.`,
    video_render_status: raw?.video_render_status,
    video_render_message: raw?.video_render_message,
    video_data_url: raw?.video_data_url ?? null,
    video_model_used: raw?.video_model_used ?? null,
    sharpness_rules: {
      subject_focus:
        sanitizeAntiSludgeText(raw?.sharpness_rules?.subject_focus || '') ||
        defaultSharpness.subject_focus,
      lighting_contrast:
        sanitizeAntiSludgeText(raw?.sharpness_rules?.lighting_contrast || '') ||
        defaultSharpness.lighting_contrast,
      camera_stability:
        sanitizeAntiSludgeText(raw?.sharpness_rules?.camera_stability || '') ||
        defaultSharpness.camera_stability,
      sludge_banned_confirm:
        sanitizeAntiSludgeText(raw?.sharpness_rules?.sludge_banned_confirm || '') ||
        defaultSharpness.sludge_banned_confirm,
    },
    camera_and_graphics_plan: {
      footage_blend_strategy:
        sanitizeAntiSludgeText(raw?.camera_and_graphics_plan?.footage_blend_strategy || '') ||
        defaultGraphics.footage_blend_strategy,
      lower_third_style:
        sanitizeAntiSludgeText(raw?.camera_and_graphics_plan?.lower_third_style || '') ||
        defaultGraphics.lower_third_style,
      callout_and_transition_rules:
        sanitizeAntiSludgeText(
          raw?.camera_and_graphics_plan?.callout_and_transition_rules || ''
        ) || defaultGraphics.callout_and_transition_rules,
    },
    segments: finalizedSegments,
    editor_assembly_checklist: checklist,
  };
}

export function formatChapterMarkersText(blueprint: ProductionBlueprint): string {
  return blueprint.segments.map((seg) => `${seg.start_time} ${seg.title}`).join('\n');
}

export function formatBlueprintAsProductionSheet(blueprint: ProductionBlueprint): string {
  const modeLabel =
    blueprint.mode === 'camera_builder' ? 'Camera Clip & Video Builder' : 'Fresh Concept';
  const lines: string[] = [
    `${blueprint.title}`,
    `Mode: ${modeLabel} | Format: ${blueprint.format} | Aspect Ratio: ${blueprint.aspect_ratio} | Camera Framing: ${blueprint.camera_framing_style} | Exact Runtime: ${blueprint.total_runtime_formatted} (${blueprint.segments.length} ${blueprint.segment_noun}s)`,
    '',
    `MASTER REALISTIC AI VIDEO PROMPT`,
    blueprint.master_video_prompt,
    '',
    `ANTI-SLOP REALISM STANDARD`,
    blueprint.anti_slop_standard,
    '',
    `OVERVIEW`,
    blueprint.zero_dollar_summary,
    '',
    `STRICT SHARPNESS & ANTI-BLUR RULES`,
    `- Subject Focus: ${blueprint.sharpness_rules.subject_focus}`,
    `- Lighting & Contrast: ${blueprint.sharpness_rules.lighting_contrast}`,
    `- Camera Stability: ${blueprint.sharpness_rules.camera_stability}`,
    `- Anti-Slop Standard: ${blueprint.sharpness_rules.sludge_banned_confirm}`,
    '',
    `CAMERA + B-ROLL & MOTION GRAPHICS PLAN`,
    `- Footage Blend: ${blueprint.camera_and_graphics_plan.footage_blend_strategy}`,
    `- Lower-Thirds: ${blueprint.camera_and_graphics_plan.lower_third_style}`,
    `- Callouts & Transitions: ${blueprint.camera_and_graphics_plan.callout_and_transition_rules}`,
    '',
    `TIMESTAMPS`,
    formatChapterMarkersText(blueprint),
    '',
    `SHOT-BY-SHOT VIDEO PROMPTS, SCRIPT & EDITING TIMELINE`,
  ];

  for (const seg of blueprint.segments) {
    lines.push(
      '',
      `[${seg.start_time} – ${seg.end_time}] (${seg.duration_label}) ${seg.title}`,
      `Camera Mix: ${seg.camera_mix}`,
      `Realistic AI Video Shot Prompt: ${seg.realistic_video_prompt}`,
      `Spoken Script: ${seg.spoken_script}`,
      `Sharp Visual Direction: ${seg.sharp_visual_direction}`,
      `Motion Graphics Cue: ${seg.motion_graphics_cue}`,
      `Free Editor Note: ${seg.free_editor_note}`
    );
  }

  lines.push('', `FREE EDITOR ASSEMBLY CHECKLIST`);
  blueprint.editor_assembly_checklist.forEach((item, idx) => {
    lines.push(`${idx + 1}. ${item}`);
  });

  return lines.join('\n');
}

export function buildSeedZeroDollarBlueprint(): ProductionBlueprint {
  return normalizeBlueprintToExactDuration(
    {
      title: 'Sweet Lake Bakery & Café — Fresh Morning Roast (60-Second Production Plan)',
      master_video_prompt:
        'Static Tripod eye-level real-world video at Counter / Product Close-Up in Sweet Lake Bakery & Café. Morning window daylight illuminates rich espresso pouring cleanly from a stainless portafilter into a clear glass mug beside crusty golden sourdough loaves on a solid oak counter. Natural steam rises smoothly, natural ceramic and wood grain textures, crisp optical focus on the glass rim, steady tripod framing.',
      zero_dollar_summary:
        'A crisp 60-second realistic video plan combining locked-tripod window shots, pastry counter B-roll, and clean lower-thirds built in CapCut or DaVinci Resolve.',
      segments: [
        {
          segment_number: 1,
          title: 'Hook: Morning Pour at the Window',
          start_time: '00:00',
          end_time: '00:10',
          duration_seconds: 10,
          duration_label: '10s',
          camera_mix: 'Counter Tripod B-Roll (100%)',
          realistic_video_prompt:
            'Static Tripod close-up shot on an oak café counter bathed in morning window daylight. Dark espresso streams steadily from a metal portafilter into a clear glass mug with natural crema and light rising steam, crisp foreground focus.',
          spoken_script:
            'If your morning coffee still tastes rushed before 9 AM, pull up a chair by the window at Sweet Lake.',
          sharp_visual_direction:
            'Locked tripod 45-degree shot of espresso pouring into a clear glass mug on an oak counter lit by morning window daylight—steam and crema tack-sharp.',
          motion_graphics_cue:
            'At 00:02 slide in crisp white title overlay: "Sweet Lake • Fresh Daily Brew".',
          free_editor_note: 'Cut cleanly right as the espresso stream hits the glass rim.',
        },
        {
          segment_number: 2,
          title: 'On-Camera Greeting & Fresh Pastry Tray',
          start_time: '00:10',
          end_time: '00:22',
          duration_seconds: 12,
          duration_label: '12s',
          camera_mix: 'Founder Camera A-Roll (60%) + Pastry B-Roll (40%)',
          realistic_video_prompt:
            'Locked Medium Shot of a smiling bakery owner standing behind a clean wooden pastry counter in soft morning window light, holding a stainless tray of golden croissants with natural hand posture and crisp facial focus.',
          spoken_script:
            'Every loaf of sourdough and croissant on our counter comes straight out of the oven at 6:30 sharp—never frozen, never reheated.',
          sharp_visual_direction:
            'Eye-level medium shot at café counter with manual focus locked on founder’s eyes, cutting at 00:16 to crisp close-up of flaky golden pastry crust.',
          motion_graphics_cue:
            'Lower-third at 00:11: "Baked Fresh at 6:30 AM Daily" with Royal Blue left bar.',
          free_editor_note: 'Use a clean 0.3s audio J-cut from founder voice into the pastry tray shot.',
        },
        {
          segment_number: 3,
          title: 'Quiet Seating & Lakefront Workspace',
          start_time: '00:22',
          end_time: '00:36',
          duration_seconds: 14,
          duration_label: '14s',
          camera_mix: 'Steady Gimbal Walkthrough (100%)',
          realistic_video_prompt:
            'Slow smooth dolly pan along clean wooden café tables beside tall glass windows overlooking a calm morning street, porcelain coffee cup resting steadily in the foreground, natural warm sunlight on floor tiles.',
          spoken_script:
            'Whether you are grabbing a quick flat white before work or opening your laptop by the quiet patio, we built this space around unhurried mornings.',
          sharp_visual_direction:
            'Steady slow gimbal push along clean wooden tables facing bright window daylight; foreground cup and patio doorway remain crisp and sharp.',
          motion_graphics_cue:
            'Upper-right clean callout card at 00:26: "Fast Wi-Fi • Window Seating • Patio Tables".',
          free_editor_note: 'Keep soft acoustic room tone at -26 dB underneath clean spoken voice.',
        },
        {
          segment_number: 4,
          title: 'Signature Pairing Proof Shot',
          start_time: '00:36',
          end_time: '00:48',
          duration_seconds: 12,
          duration_label: '12s',
          camera_mix: 'Overhead Table Shot (100%)',
          realistic_video_prompt:
            'Static Tripod overhead shot of a warm cinnamon brioche on stoneware beside a ceramic pour-over cup on butcher-block oak, crisp natural window light from the left, authentic bakery crumb texture.',
          spoken_script:
            'Pair a warm cinnamon brioche with our house single-origin pour-over—roasted locally every Tuesday.',
          sharp_visual_direction:
            'Overhead flat-lay locked straight down over stoneware plates on butcher-block wood with crisp side daylight.',
          motion_graphics_cue:
            'Clean pointer labels at 00:40: "House Pour-Over" & "Warm Brioche".',
          free_editor_note: 'Use crisp straight cuts synced cleanly to spoken phrases.',
        },
        {
          segment_number: 5,
          title: 'Clear Visit Invitation & Hours',
          start_time: '00:48',
          end_time: '01:00',
          duration_seconds: 12,
          duration_label: '12s',
          camera_mix: 'Founder Camera A-Roll (70%) + Storefront Sign (30%)',
          realistic_video_prompt:
            'Static Tripod eye-level shot outside Sweet Lake Bakery entrance in clear morning daylight, crisp painted wooden storefront sign and warm open doorway, steady real-world framing.',
          spoken_script:
            'Stop by Sweet Lake on Main Street any day from 7 AM to 4 PM, and mention this video at the counter for a fresh pastry tasting.',
          sharp_visual_direction:
            'Back to eye-level camera by front entrance in daylight, ending on a steady 3-second hold of the clean outdoor Sweet Lake sign.',
          motion_graphics_cue:
            'Final banner at 00:54: "Sweet Lake Café • Open Daily 7 AM – 4 PM".',
          free_editor_note: 'Export crisp 1080p H.264 MP4 at 18 Mbps in CapCut or DaVinci Resolve.',
        },
      ],
    },
    {
      topic: 'Sweet Lake Bakery & Café',
      mode: 'camera_builder',
      format: 'Business / Channel / Funnel Video',
      cameraFraming: 'Static Tripod',
      targetSeconds: 60,
      shootingSetup: 'Counter / Product Close-Up (Locked Tripod)',
      rawClipNotes:
        'Counter espresso pour + founder greeting at window + morning pastry rack + patio walk.',
    }
  );
}
