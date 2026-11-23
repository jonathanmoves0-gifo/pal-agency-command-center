import { InferenceClient } from '@huggingface/inference';
import {
  CAMERA_FRAMING_OPTIONS,
  CLOUD_VIDEO_OPTIONS,
  DEFAULT_DURATION_SECONDS,
  getDurationPreset,
  normalizeBlueprintToExactDuration,
  VIDEO_FORMAT_OPTIONS,
  WORKFLOW_MODE_OPTIONS,
  type CameraFramingStyle,
  type CloudVideoModelId,
  type ProductionBlueprint,
  type VideoAspectRatio,
  type VideoFormatType,
  type VideoWorkflowMode,
} from '../src/utils/videoBlueprint';
import { invokeStructuredLlm } from './llmClient';

export interface VideoStudioRequestInput {
  mode: VideoWorkflowMode;
  topic: string;
  videoFormat: VideoFormatType;
  cameraFraming: CameraFramingStyle;
  aspectRatio: VideoAspectRatio;
  cloudModel: CloudVideoModelId;
  targetSeconds: number;
  shootingSetup: string;
  rawClipNotes: string;
  market: string;
}

export function parseVideoStudioRequest(body: Record<string, unknown>): VideoStudioRequestInput {
  const rawMode = String(body.mode ?? 'camera_builder').trim();
  const mode: VideoWorkflowMode = WORKFLOW_MODE_OPTIONS.some((m) => m.id === rawMode)
    ? (rawMode as VideoWorkflowMode)
    : 'camera_builder';

  const rawFormat = String(body.video_format ?? VIDEO_FORMAT_OPTIONS[0]).trim();
  const videoFormat: VideoFormatType = VIDEO_FORMAT_OPTIONS.includes(rawFormat as VideoFormatType)
    ? (rawFormat as VideoFormatType)
    : VIDEO_FORMAT_OPTIONS[0];

  const rawFraming = String(body.camera_framing ?? CAMERA_FRAMING_OPTIONS[0]).trim();
  const cameraFraming: CameraFramingStyle = CAMERA_FRAMING_OPTIONS.includes(
    rawFraming as CameraFramingStyle
  )
    ? (rawFraming as CameraFramingStyle)
    : CAMERA_FRAMING_OPTIONS[0];

  const rawAspect = String(body.aspect_ratio ?? '16:9').trim();
  const aspectRatio: VideoAspectRatio = rawAspect === '9:16' ? '9:16' : '16:9';

  const rawCloudModel = String(body.cloud_model ?? CLOUD_VIDEO_OPTIONS[0].id).trim();
  const cloudModel: CloudVideoModelId = CLOUD_VIDEO_OPTIONS.some((m) => m.id === rawCloudModel)
    ? (rawCloudModel as CloudVideoModelId)
    : CLOUD_VIDEO_OPTIONS[0].id;

  const parsedSeconds = Number(body.target_seconds);
  const preset = getDurationPreset(
    Number.isFinite(parsedSeconds) && parsedSeconds > 0 ? parsedSeconds : DEFAULT_DURATION_SECONDS
  );

  const topic = String(body.topic ?? '').trim();
  const shootingSetup =
    String(body.shooting_setup ?? 'Desk & Window Daylight (Tripod)').trim() ||
    'Desk & Window Daylight (Tripod)';
  const rawClipNotes = String(body.raw_clip_notes ?? '').trim();
  const market = String(body.market ?? 'Global Market').trim();

  return {
    mode,
    topic,
    videoFormat,
    cameraFraming,
    aspectRatio,
    cloudModel,
    targetSeconds: preset.seconds,
    shootingSetup,
    rawClipNotes,
    market,
  };
}

export async function generateRealisticVideoPlan(
  input: VideoStudioRequestInput,
  signal?: AbortSignal
): Promise<ProductionBlueprint> {
  const preset = getDurationPreset(input.targetSeconds);
  const modeMeta = WORKFLOW_MODE_OPTIONS.find((m) => m.id === input.mode) ?? WORKFLOW_MODE_OPTIONS[0];
  const durationDescription =
    preset.seconds < 60
      ? `${preset.seconds} seconds (${preset.label})`
      : `${preset.seconds / 60} minutes (${preset.label})`;

  const aspectGuidance =
    input.aspectRatio === '9:16'
      ? '9:16 vertical mobile composition with speaker/subject centered in the upper two-thirds and clean space below for captions/lower-thirds'
      : '16:9 widescreen composition with crisp horizontal framing and clean space on the bottom-left for lower-thirds';

  const workflowGuidance =
    input.mode === 'camera_builder'
      ? 'Combine the user’s recorded camera footage, filming setup, and raw notes with grounded realistic AI B-roll, clean lower-thirds, callout cards, and steady cuts.'
      : 'Build a complete original realistic video production plan from scratch: grounded shot-by-shot AI video prompts, spoken dialogue, practical lighting setup, and clean motion graphics.';

  const result = await invokeStructuredLlm<Partial<ProductionBlueprint>>({
    role: 'scoring',
    signal,
    useGrounding: false,
    systemInstruction: `You are a practical Realistic AI Video Director building grounded, believable video prompts, spoken scripts, and free-editor timelines (CapCut, Canva, DaVinci Resolve).

STRICT REALISM & ANTI-SLOP STANDARD:
1. AFFIRMATIVE REAL-WORLD VISUALS ONLY:
   - Every "master_video_prompt" and every scene's "realistic_video_prompt" MUST describe a concrete physical location, natural or practical interior lighting direction, natural human skin texture and calm everyday body/hand posture, solid real-world object geometry, crisp subject focus, ${aspectGuidance}, and calm steady camera framing (${input.cameraFraming}).
   - Describe what IS visually present on camera in plain affirmative language. Do NOT write words like "simulated", "fake CGI", "plastic textures", "glowing overlays", "waxy skin", "melting hands", "dreamy bloom", "soft haze", "hyperrealistic", "8k", "cinematic masterpiece", or negative disclaimers repeating those terms.
2. HONOR EXACT DURATION (${durationDescription}):
   - Deliver EXACTLY ${preset.segmentCount} ${preset.segmentNoun}s whose "duration_seconds" values sum to EXACTLY ${preset.seconds} seconds.
   - Short/promo videos (30s–2m) must stay tight and brisk inside ${preset.seconds} seconds—never stretch a short promo into a long outline.
   - 60m+ training requests must cover the complete runtime across all ${preset.segmentCount} chapters with concrete spoken lines and visual cues.
3. WORKFLOW MODE (${modeMeta.label}):
   - ${workflowGuidance}
   - Write in clear, plain English with zero technical jargon.

Return ONLY valid JSON matching this schema:
{
  "title": "Clear specific video title for ${input.topic}",
  "master_video_prompt": "One cohesive, grounded 2-3 sentence realistic AI video prompt describing the real physical scene, ${aspectGuidance}, natural/practical lighting direction, solid textures, natural movement, and ${input.cameraFraming} camera framing for ${input.topic}",
  "anti_slop_standard": "Short affirmative confirmation describing the natural lighting, normal hand/object physics, and steady optical clarity used across every shot",
  "zero_dollar_summary": "1-2 clear sentences explaining how realistic shots, camera clips, and clean graphics come together for this ${durationDescription} video",
  "sharpness_rules": {
    "subject_focus": "Specific focus lock rule keeping the main subject sharp",
    "lighting_contrast": "Concrete real-world window/lamp angle and natural contrast",
    "camera_stability": "Specific ${input.cameraFraming} stability rule keeping motion calm and steady",
    "sludge_banned_confirm": "Affirmative statement of natural real-world materials, true skin tones, and readable graphics"
  },
  "camera_and_graphics_plan": {
    "footage_blend_strategy": "How camera A-roll alternates cleanly with realistic B-roll across ${durationDescription}",
    "lower_third_style": "Clean readable lower-third typography for CapCut/Canva/DaVinci",
    "callout_and_transition_rules": "Straight cuts, J-cuts, and concise callout card rules"
  },
  "segments": [
    {
      "segment_number": 1,
      "title": "Specific segment title",
      "duration_seconds": ${Math.round(preset.seconds / preset.segmentCount)},
      "camera_mix": "e.g. Camera A-Roll (60%) + Counter B-Roll (40%)",
      "realistic_video_prompt": "Ready-to-paste realistic AI video shot prompt for this exact beat: physical room, ${aspectGuidance}, practical lighting, natural hand/object motion, ${input.cameraFraming} framing",
      "spoken_script": "Actual ready-to-deliver spoken dialogue specific to ${input.topic}",
      "sharp_visual_direction": "Concrete physical environment, lighting angle, and real-world framing",
      "motion_graphics_cue": "Exact lower-third or callout text + timing inside this beat",
      "free_editor_note": "Clean cut timing, audio level cue, and free-editor assembly step"
    }
  ],
  "editor_assembly_checklist": [
    "Practical assembly step 1",
    "Practical assembly step 2",
    "Practical assembly step 3",
    "Practical assembly step 4"
  ]
}`,
    prompt: `Workflow Mode: ${modeMeta.label}
Business / Brand / Topic: ${input.topic}
Video Format: ${input.videoFormat}
Aspect Ratio: ${input.aspectRatio}
Camera Framing Style: ${input.cameraFraming}
Exact Target Length: ${preset.seconds} seconds (${preset.label}) across ${preset.segmentCount} ${preset.segmentNoun}s
Where Filmed / Physical Setup: ${input.shootingSetup}
Market Focus: ${input.market}
Camera Notes / Recorded Clips / Key Points: ${
      input.rawClipNotes || `On-camera greeting + calm, crisp real-world walkthrough for ${input.topic}.`
    }

Generate the complete ${durationDescription} realistic video plan with all ${preset.segmentCount} ${preset.segmentNoun}s summing strictly to ${preset.seconds} seconds.`,
  });

  return normalizeBlueprintToExactDuration(result.data, {
    topic: input.topic,
    mode: input.mode,
    format: input.videoFormat,
    cameraFraming: input.cameraFraming,
    aspectRatio: input.aspectRatio,
    targetSeconds: preset.seconds,
    shootingSetup: input.shootingSetup,
    rawClipNotes: input.rawClipNotes,
  });
}

function toPlainEnglishVideoRenderError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/abort|timed?\s*out/i.test(raw)) {
    return 'Live cloud video rendering took longer than expected and was stopped so the studio stays responsive. Your Realistic AI Video prompt, spoken script, Live Shot Preview, and edit timeline below are ready to use.';
  }
  if (/402|payment|credit|billing|depleted|balance/i.test(raw)) {
    return 'Live cloud MP4 rendering could not finish because the connected cloud video provider has reached its credit or billing limit. Your Realistic AI Video prompt, Live Shot Preview, spoken script, and motion-graphic edit plan below are ready to copy or assemble.';
  }
  if (/429|rate|quota|exhausted|too many requests/i.test(raw)) {
    return 'Live cloud MP4 rendering hit a temporary service rate limit. Wait a moment and try again, or use the ready-to-paste Realistic AI Video prompts, Live Shot Preview, and edit plan below right away.';
  }
  if (/401|403|unauthorized|forbidden|token|auth/i.test(raw)) {
    return 'Live cloud MP4 rendering could not verify the server video token. Your Realistic AI Video prompt, Live Shot Preview, spoken script, and motion-graphic edit plan are ready below.';
  }
  return 'Live cloud MP4 rendering could not complete right now due to video service limits. Your Realistic AI Video prompt, Live Shot Preview, spoken script, and motion-graphic edit plan are complete and ready below.';
}

export async function attemptCloudVideoRender(
  masterPrompt: string,
  preferredModel: CloudVideoModelId = CLOUD_VIDEO_OPTIONS[0].id,
  signal?: AbortSignal
): Promise<{
  status: 'ready' | 'needs_attention';
  message: string;
  videoDataUrl: string | null;
  modelUsed: string | null;
}> {
  const hfToken = process.env.HF_TOKEN?.trim();
  if (!hfToken) {
    return {
      status: 'needs_attention',
      message:
        'Live cloud MP4 video rendering is not active in this environment because no cloud video render token is configured on the server. Your grounded Realistic AI Video Master Prompt, Live Shot & Lower-Third Preview, shot-by-shot prompts, and edit plan are ready below—and you can also preview your own camera clip right inside this studio.',
      videoDataUrl: null,
      modelUsed: null,
    };
  }

  const candidateModels: CloudVideoModelId[] = [
    preferredModel,
    ...CLOUD_VIDEO_OPTIONS.map((m) => m.id).filter((id) => id !== preferredModel),
  ];

  let lastError: unknown = null;
  let lastAttemptedModel: CloudVideoModelId = preferredModel;

  for (const modelId of candidateModels) {
    if (signal?.aborted) {
      throw new Error('Video generation cancelled by user.');
    }

    lastAttemptedModel = modelId;
    const controller = new AbortController();
    const onParentAbort = () => controller.abort();
    signal?.addEventListener('abort', onParentAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(), 35000);

    try {
      const client = new InferenceClient(hfToken);
      const blob = await client.textToVideo(
        {
          provider: 'auto',
          model: modelId,
          inputs: masterPrompt,
        },
        { signal: controller.signal }
      );

      const buf = Buffer.from(await blob.arrayBuffer());
      const mime = blob.type && blob.type.startsWith('video/') ? blob.type : 'video/mp4';
      const videoDataUrl = `data:${mime};base64,${buf.toString('base64')}`;

      return {
        status: 'ready',
        message:
          'Your realistic AI video clip finished rendering and is ready to play or download alongside your complete shot list and edit timeline.',
        videoDataUrl,
        modelUsed: modelId,
      };
    } catch (err) {
      if (signal?.aborted) {
        throw new Error('Video generation cancelled by user.');
      }
      lastError = err;
      const errText = err instanceof Error ? err.message : String(err);
      // Do not retry secondary model if credentials or billing limits clearly blocked the account
      if (/401|402|403|unauthorized|forbidden|payment|credit|billing|depleted|balance/i.test(errText)) {
        break;
      }
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onParentAbort);
    }
  }

  return {
    status: 'needs_attention',
    message: toPlainEnglishVideoRenderError(lastError),
    videoDataUrl: null,
    modelUsed: lastAttemptedModel,
  };
}
