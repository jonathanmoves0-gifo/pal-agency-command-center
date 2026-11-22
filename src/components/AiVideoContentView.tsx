import { useState } from 'react';
import { Check, Copy, Loader2, Video } from 'lucide-react';
import type { MarketTrack } from '../utils/pitchPresenter';

type VideoType = 'Product Showcase' | 'Customer Story' | 'Before & After';

interface VideoConcept {
  title: string;
  hook: string;
  scenes: Array<{ label: string; visual: string; line: string }>;
  cta: string;
}

interface AiVideoContentViewProps {
  activeMarket: MarketTrack;
}

const VIDEO_TYPES: VideoType[] = ['Product Showcase', 'Customer Story', 'Before & After'];

const INITIAL_CONCEPT: VideoConcept = {
  title: '60-Second Booking Transformation',
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

export function AiVideoContentView({ activeMarket }: AiVideoContentViewProps) {
  const [businessOrProduct, setBusinessOrProduct] = useState('');
  const [videoType, setVideoType] = useState<VideoType>('Product Showcase');
  const [concept, setConcept] = useState<VideoConcept>(INITIAL_CONCEPT);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessOrProduct.trim()) {
      setError('Please enter a Business or Product Name first.');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/video-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_name: businessOrProduct.trim(),
          video_type: videoType,
          market: activeMarket === 'LOCAL' ? 'Local Market' : 'Global Market',
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Could not generate video concept.');
      }
      setConcept({
        title: data.title || `${videoType} for ${businessOrProduct.trim()}`,
        hook: data.hook || '',
        scenes: Array.isArray(data.scenes) ? data.scenes : [],
        cta: data.cta || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not generate video concept.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyScript = async () => {
    const text = [
      `${concept.title}`,
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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
      {/* Left: Video Request Card */}
      <section className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6">
        <div className="border-b border-[#E2E8F0] pb-4">
          <h1 className="text-base font-bold text-[#0F172A]">AI Video &amp; Content</h1>
          <p className="mt-0.5 text-xs text-[#475569]">
            Create a simple, ready-to-film short video concept for any client or product.
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
                <span>Generating Video Concept...</span>
              </>
            ) : (
              <>
                <Video className="h-4 w-4" />
                <span>Generate Video Concept</span>
              </>
            )}
          </button>
        </form>
      </section>

      {/* Right: Clean Preview Box */}
      <section className="lg:col-span-7 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
              Video Concept Preview
            </span>
            <h2 className="mt-0.5 text-base font-bold text-[#0F172A]">{concept.title}</h2>
          </div>

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
