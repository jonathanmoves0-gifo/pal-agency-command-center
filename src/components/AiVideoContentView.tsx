import { useEffect, useState } from 'react';
import { Check, Copy, Download, KeyRound, Loader2, Video } from 'lucide-react';
import {
  DEFAULT_VIDEO_MODEL_ID,
  DEFAULT_VIDEO_PROVIDER_ID,
  getVideoProviderLabel,
  VIDEO_MODEL_OPTIONS,
  VIDEO_PROVIDER_OPTIONS,
  type MarketTrack,
  type VideoModelId,
  type VideoProviderId,
} from '../utils/pitchPresenter';

type VideoType = 'Product Showcase' | 'Customer Story' | 'Before & After';

interface VideoConcept {
  title: string;
  video_prompt: string;
  hook: string;
  scenes: Array<{ label: string; visual: string; line: string }>;
  cta: string;
}

interface AiVideoContentViewProps {
  activeMarket: MarketTrack;
  hfToken: string;
  onOpenSettings: () => void;
}

const VIDEO_TYPES: VideoType[] = ['Product Showcase', 'Customer Story', 'Before & After'];

const INITIAL_CONCEPT: VideoConcept = {
  title: '60-Second Booking Transformation',
  video_prompt:
    'Warm natural light inside a modern boutique clinic reception, smooth slow push-in camera shot on a receptionist smiling and checking confirmed appointments on a clean tablet, photorealistic commercial look, crisp focus, 5 seconds.',
  hook: 'Still asking new customers to fill out a contact form and wait until tomorrow?',
  scenes: [
    {
      label: 'Scene 1 (0–5s)',
      visual: 'Phone screen showing a visitor trying to book an appointment after hours.',
      line: 'Most people look for local services in the evening—when your phone line is already closed.',
    },
    {
      label: 'Scene 2 (5–15s)',
      visual: 'Quick cut to a clean mobile booking page where they tap a time slot in two clicks.',
      line: 'With a fast online booking page, they choose their service, pick an open time, and get an instant confirmation.',
    },
    {
      label: 'Scene 3 (15–25s)',
      visual: 'Happy business owner checking a full morning calendar before opening.',
      line: 'You wake up to confirmed bookings instead of missed voicemails.',
    },
  ],
  cta: 'Want to see how this looks on your website? Reply and I will send a free mockup.',
};

export function AiVideoContentView({
  activeMarket,
  hfToken,
  onOpenSettings,
}: AiVideoContentViewProps) {
  const [businessOrProduct, setBusinessOrProduct] = useState('');
  const [videoType, setVideoType] = useState<VideoType>('Product Showcase');
  const [selectedModelId, setSelectedModelId] = useState<VideoModelId>(DEFAULT_VIDEO_MODEL_ID);
  const [selectedProviderId, setSelectedProviderId] = useState<VideoProviderId>(
    DEFAULT_VIDEO_PROVIDER_ID
  );

  const [concept, setConcept] = useState<VideoConcept>(INITIAL_CONCEPT);
  const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
  const [generatedProviderLabel, setGeneratedProviderLabel] = useState<string | null>(null);
  const [stageMessage, setStageMessage] = useState<string | null>(null);
  const [tokenNotice, setTokenNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (videoObjectUrl) {
        URL.revokeObjectURL(videoObjectUrl);
      }
    };
  }, [videoObjectUrl]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTokenNotice(null);
    setGeneratedProviderLabel(null);
    if (videoObjectUrl) {
      URL.revokeObjectURL(videoObjectUrl);
      setVideoObjectUrl(null);
    }

    if (!businessOrProduct.trim()) {
      setError('Please enter a Business or Product Name first.');
      return;
    }

    setIsGenerating(true);
    setStageMessage('Step 1: Writing your 5-second commercial prompt and script...');

    try {
      // Step 1: Gemini creates the 5-second commercial prompt + companion script/storyboard
      const conceptRes = await fetch('/api/video-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessOrProduct.trim(),
          video_type: videoType,
          market: activeMarket === 'LOCAL' ? 'Local Market' : 'Global Market',
        }),
      });
      const conceptData = await conceptRes.json();
      if (!conceptRes.ok) {
        throw new Error(conceptData?.error || 'Could not create the video prompt.');
      }

      const generatedPrompt =
        String(conceptData.video_prompt || '').trim() ||
        `Realistic 5-second commercial video showcasing ${businessOrProduct.trim()} in a ${videoType.toLowerCase()} style, bright natural studio lighting, smooth camera push-in.`;

      const nextConcept: VideoConcept = {
        title: conceptData.title || `${videoType} for ${businessOrProduct.trim()}`,
        video_prompt: generatedPrompt,
        hook: conceptData.hook || '',
        scenes: Array.isArray(conceptData.scenes) ? conceptData.scenes : [],
        cta: conceptData.cta || '',
      };
      setConcept(nextConcept);

      // No Hugging Face token saved yet -> keep generated script/prompt visible and prompt Settings
      if (!hfToken.trim()) {
        setTokenNotice(
          'Add your Hugging Face token in API Settings to render a playable video clip. Your generated video script and 5-second prompt are ready below.'
        );
        return;
      }

      // Step 2: Send prompt to Hugging Face Inference Providers via server proxy
      const selectedModelOption = VIDEO_MODEL_OPTIONS.find((o) => o.modelId === selectedModelId);
      const providerDisplay =
        selectedProviderId === 'auto'
          ? 'active Hugging Face provider'
          : getVideoProviderLabel(selectedProviderId);

      setStageMessage(
        `Step 2: Rendering video with ${selectedModelOption?.label || selectedModelId} via ${providerDisplay}...`
      );

      const videoRes = await fetch('/api/video-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hf-token': hfToken.trim(),
        },
        body: JSON.stringify({
          prompt: generatedPrompt,
          model_id: selectedModelId,
          provider: selectedProviderId,
        }),
      });

      if (!videoRes.ok) {
        let errMsg =
          'Video rendering could not finish right now. Your generated script and prompt are ready below.';
        try {
          const errJson = (await videoRes.json()) as { error?: string };
          if (errJson?.error) errMsg = errJson.error;
        } catch {
          // ignore parse failure
        }
        setTokenNotice(errMsg);
        return;
      }

      const usedProviderId = videoRes.headers.get('x-hf-provider-used');
      setGeneratedProviderLabel(
        usedProviderId ? getVideoProviderLabel(usedProviderId) : providerDisplay
      );

      const mp4Blob = await videoRes.blob();
      const nextUrl = URL.createObjectURL(mp4Blob);
      setVideoObjectUrl(nextUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate video.');
    } finally {
      setIsGenerating(false);
      setStageMessage(null);
    }
  };

  const handleCopyScript = async () => {
    const text = [
      `${concept.title}`,
      `5-Second Video Prompt: ${concept.video_prompt}`,
      `Hook: ${concept.hook}`,
      '',
      ...concept.scenes.map((s) => `${s.label}\nVisual: ${s.visual}\nLine: ${s.line}`),
      '',
      `Closing CTA: ${concept.cta}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked
    }
  };

  const downloadFilename = `${(businessOrProduct.trim() || 'pal-agency-video')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}.mp4`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* Left: Video Request Card */}
      <section className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
        <div className="border-b border-[#E2E8F0] pb-4">
          <h1 className="text-base font-bold text-[#0F172A]">AI Video &amp; Content</h1>
          <p className="mt-0.5 text-xs text-[#475569]">
            Turn any business and video style into a playable 5-second commercial clip and script.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="video-business-name" className="block text-xs font-semibold text-[#475569]">
              Business or Product Name
            </label>
            <input
              id="video-business-name"
              type="text"
              value={businessOrProduct}
              onChange={(e) => setBusinessOrProduct(e.target.value)}
              placeholder="e.g., Savannah Safari Lodges or Smile Clinic"
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-[#475569]">Video Type</span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {VIDEO_TYPES.map((type) => {
                const active = videoType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVideoType(type)}
                    className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                        : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#475569] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="video-model-select" className="block text-xs font-semibold text-[#475569]">
                Video Model
              </label>
              <select
                id="video-model-select"
                value={selectedModelId}
                onChange={(e) => setSelectedModelId(e.target.value as VideoModelId)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer"
              >
                {VIDEO_MODEL_OPTIONS.map((option) => (
                  <option key={option.modelId} value={option.modelId}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="video-provider-select"
                className="block text-xs font-semibold text-[#475569]"
              >
                Video Provider
              </label>
              <select
                id="video-provider-select"
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value as VideoProviderId)}
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2.5 text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none cursor-pointer"
              >
                {VIDEO_PROVIDER_OPTIONS.map((option) => (
                  <option key={option.providerId} value={option.providerId}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!hfToken.trim() && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#F59E0B]/40 bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#92400E]">
              <span>Save your Hugging Face token in API Settings to render MP4 clips.</span>
              <button
                type="button"
                onClick={onOpenSettings}
                className="shrink-0 font-semibold text-[#B45309] underline cursor-pointer"
              >
                Open API Settings
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-[#F59E0B]/50 bg-[#FFFBEB] px-3.5 py-2.5 text-xs font-medium text-[#92400E]"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isGenerating}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-3 text-sm font-semibold text-[#FFFFFF] hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Video...</span>
              </>
            ) : (
              <>
                <Video className="h-4 w-4" />
                <span>Generate Video</span>
              </>
            )}
          </button>

          {stageMessage && (
            <p className="text-center text-xs font-medium text-[#2563EB]">{stageMessage}</p>
          )}
        </form>
      </section>

      {/* Right: Clean Preview Box (MP4 Player + Download + Storyboard Fallback) */}
      <section className="lg:col-span-7 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
              Video Preview
            </span>
            <h2 className="mt-0.5 text-base font-bold text-[#0F172A]">{concept.title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {videoObjectUrl && (
              <a
                href={videoObjectUrl}
                download={downloadFilename}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1D4ED8] transition-colors whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download MP4</span>
              </a>
            )}

            <button
              type="button"
              onClick={handleCopyScript}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#10B981] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#059669] transition-colors cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Script</span>
                </>
              )}
            </button>
          </div>
        </div>

        {tokenNotice && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#F59E0B] bg-[#FFFBEB] px-4 py-3 text-xs font-medium text-[#92400E]"
          >
            <span>{tokenNotice}</span>
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#F59E0B] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#92400E] hover:bg-[#FEF3C7] cursor-pointer whitespace-nowrap"
            >
              <KeyRound className="h-3.5 w-3.5" />
              <span>API Settings</span>
            </button>
          </div>
        )}

        {/* Playable MP4 Clip Player when generated */}
        {videoObjectUrl && (
          <div className="rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#10B981] bg-[#F8FAFC] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#059669]">
                Generated MP4 Clip Ready
              </span>
              <span className="text-xs font-medium text-[#475569]">
                {generatedProviderLabel ? `Rendered via ${generatedProviderLabel}` : '5-second commercial cut'}
              </span>
            </div>
            <video
              src={videoObjectUrl}
              controls
              autoPlay
              loop
              playsInline
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF]"
            />
          </div>
        )}

        {/* 5-Second Commercial Prompt */}
        <div className="rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#2563EB] bg-[#F8FAFC] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
            5-Second Commercial Video Prompt
          </div>
          <p className="mt-1 text-sm leading-relaxed text-[#0F172A]">{concept.video_prompt}</p>
        </div>

        {/* Fallback / Companion Script & Storyboard */}
        <div className="rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#F59E0B] bg-[#FFFBEB]/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#D97706]">
            Opening 3-Second Hook
          </div>
          <p className="mt-1 text-sm font-semibold text-[#0F172A]">&ldquo;{concept.hook}&rdquo;</p>
        </div>

        <div className="space-y-3">
          {concept.scenes.map((scene, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1.5"
            >
              <div className="text-xs font-bold text-[#2563EB]">{scene.label}</div>
              <p className="text-xs text-[#475569]">
                <span className="font-semibold text-[#0F172A]">Visual:</span> {scene.visual}
              </p>
              <p className="text-sm text-[#0F172A]">
                <span className="font-semibold">Line:</span> &ldquo;{scene.line}&rdquo;
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#10B981] bg-[#ECFDF5]/40 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[#059669]">
            Closing Call to Action
          </div>
          <p className="mt-1 text-sm text-[#0F172A]">{concept.cta}</p>
        </div>
      </section>
    </div>
  );
}
