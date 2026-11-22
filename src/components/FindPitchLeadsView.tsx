import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, Loader2 } from 'lucide-react';
import type { LeadRecord } from '../shared/types';
import {
  buildPitchPresentation,
  QUICK_ISSUE_TAGS,
  type MarketTrack,
} from '../utils/pitchPresenter';

export type PitchStepStatus = 'pending' | 'active' | 'done';

export interface PitchProgress {
  step1: PitchStepStatus;
  step2: PitchStepStatus;
  step3: PitchStepStatus;
}

interface FindPitchLeadsViewProps {
  activeMarket: MarketTrack;
  activeLead: LeadRecord | null;
  savedLeads: LeadRecord[];
  isRunning: boolean;
  progress: PitchProgress;
  errorMessage: string | null;
  prefillDraft: {
    industry: string;
    issue: string;
    nonce: number;
  } | null;
  onBuildPitch: (input: {
    businessName: string;
    websiteLink: string;
    industry: string;
    mainIssue: string;
  }) => void;
  onCancelRun: () => void;
  onSelectSavedLead: (lead: LeadRecord) => void;
}

export function FindPitchLeadsView({
  activeMarket,
  activeLead,
  savedLeads,
  isRunning,
  progress,
  errorMessage,
  prefillDraft,
  onBuildPitch,
  onCancelRun,
  onSelectSavedLead,
}: FindPitchLeadsViewProps) {
  const [businessName, setBusinessName] = useState('');
  const [websiteLink, setWebsiteLink] = useState('');
  const [industry, setIndustry] = useState('');
  const [mainIssue, setMainIssue] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!prefillDraft) return;
    setIndustry(prefillDraft.industry);
    setMainIssue(prefillDraft.issue);
    setValidationError(null);
  }, [prefillDraft]);

  const handleTagClick = (tag: string) => {
    const parts = mainIssue
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.includes(tag)) {
      setMainIssue(parts.filter((p) => p !== tag).join(', '));
    } else {
      setMainIssue([...parts, tag].join(', '));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!businessName.trim() || !websiteLink.trim() || !industry.trim()) {
      setValidationError('Please enter Business Name, Website Link, and Industry.');
      return;
    }

    onBuildPitch({
      businessName: businessName.trim(),
      websiteLink: websiteLink.trim(),
      industry: industry.trim(),
      mainIssue: mainIssue.trim() || 'No online booking',
    });
  };

  const presentation = activeLead ? buildPitchPresentation(activeLead) : null;

  const handleCopyMessage = async () => {
    if (!presentation) return;
    const fullText = `Subject: ${presentation.messageSubject}\n\n${presentation.messageBody}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked
    }
  };

  const steps: Array<{ key: keyof PitchProgress; label: string }> = [
    { key: 'step1', label: 'Step 1: Check Website' },
    { key: 'step2', label: 'Step 2: Build Free Sample' },
    { key: 'step3', label: 'Step 3: Write Message' },
  ];

  return (
    <div className="space-y-6">
      {/* Focused 2-column workspace */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Card: 1. Client Details */}
        <section
          aria-label="1. Client Details"
          className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6"
        >
          <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <h1 className="text-base font-bold text-[#0F172A]">1. Client Details</h1>
              <p className="mt-0.5 text-xs text-[#475569]">
                {activeMarket === 'LOCAL'
                  ? 'Local Market client profile'
                  : 'Global Market client profile'}
              </p>
            </div>
            <span className="rounded-md border border-[#10B981]/30 bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-semibold text-[#047857] whitespace-nowrap">
              {activeMarket === 'LOCAL' ? 'Local Market' : 'Global Market'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="client-business-name" className="block text-xs font-semibold text-[#475569]">
                Business Name
              </label>
              <input
                id="client-business-name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder={
                  activeMarket === 'LOCAL' ? 'e.g., Kilimani Care Dental' : 'e.g., Cavendish Dental Studio'
                }
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="client-website-link" className="block text-xs font-semibold text-[#475569]">
                Website Link
              </label>
              <input
                id="client-website-link"
                type="text"
                value={websiteLink}
                onChange={(e) => setWebsiteLink(e.target.value)}
                placeholder={
                  activeMarket === 'LOCAL' ? 'e.g., kilimanicaredental.co.ke' : 'e.g., cavendishdental.co.uk'
                }
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="client-industry" className="block text-xs font-semibold text-[#475569]">
                Industry
              </label>
              <input
                id="client-industry"
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g., Dental Clinic, Real Estate, Safari Tours"
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2.5 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="client-main-issue" className="block text-xs font-semibold text-[#475569]">
                Main Issue on Their Website
              </label>
              <textarea
                id="client-main-issue"
                rows={2}
                value={mainIssue}
                onChange={(e) => setMainIssue(e.target.value)}
                placeholder="Describe what is holding back customers, or pick a quick tag below"
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2 text-sm text-[#0F172A] placeholder-[#94A3B8] focus:border-[#2563EB] focus:outline-none resize-y"
              />

              <div className="flex flex-wrap gap-2 pt-0.5">
                {QUICK_ISSUE_TAGS.map((tag) => {
                  const selected = mainIssue.toLowerCase().includes(tag.toLowerCase());
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleTagClick(tag)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        selected
                          ? 'border-[#F59E0B] bg-[#FEF3C7] text-[#92400E]'
                          : 'border-[#F59E0B]/40 bg-[#FFFBEB] text-[#B45309] hover:bg-[#FEF3C7]'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {validationError && (
              <div
                role="alert"
                className="rounded-lg border border-[#F59E0B]/50 bg-[#FFFBEB] px-3.5 py-2.5 text-xs font-medium text-[#92400E]"
              >
                {validationError}
              </div>
            )}

            <div className="pt-1 flex items-center gap-2">
              <button
                type="submit"
                disabled={isRunning}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-3 text-sm font-semibold text-[#FFFFFF] hover:bg-[#1D4ED8] disabled:opacity-60 transition-colors cursor-pointer whitespace-nowrap"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Building Client Pitch...</span>
                  </>
                ) : (
                  <span>Build Client Pitch</span>
                )}
              </button>

              {isRunning && (
                <button
                  type="button"
                  onClick={onCancelRun}
                  className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-4 py-3 text-sm font-semibold text-[#475569] hover:bg-[#F8FAFC] cursor-pointer whitespace-nowrap"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Saved pitches switcher for current market */}
          {savedLeads.length > 0 && (
            <div className="mt-6 border-t border-[#E2E8F0] pt-4">
              <div className="text-xs font-semibold text-[#475569] mb-2">
                Recent {activeMarket === 'LOCAL' ? 'Local' : 'Global'} Client Pitches
              </div>
              <div className="flex flex-wrap gap-1.5">
                {savedLeads.slice(0, 6).map((lead) => {
                  const isCurrent = activeLead?.id === lead.id;
                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => onSelectSavedLead(lead)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        isCurrent
                          ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                          : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A]'
                      }`}
                    >
                      {lead.business_name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Right Card: 2. What You Actually Need */}
        <section
          aria-label="2. What You Actually Need"
          className="lg:col-span-7 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#0F172A]">2. What You Actually Need</h2>
              <p className="mt-0.5 text-xs text-[#475569]">
                {activeLead
                  ? `Showing tailored pitch for ${activeLead.business_name} (${activeLead.domain})`
                  : 'Enter client details on the left to build a complete pitch'}
              </p>
            </div>
            {activeLead && !isRunning && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[#10B981]/30 bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#047857]">
                <Check className="h-3.5 w-3.5" />
                Ready to Send
              </span>
            )}
          </div>

          {/* Simple 3-step horizontal progress bar */}
          <div
            aria-label="Pitch creation progress"
            className="grid grid-cols-1 gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 sm:grid-cols-3"
          >
            {steps.map((st, index) => {
              const status = progress[st.key];
              return (
                <div key={st.key} className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      status === 'done'
                        ? 'bg-[#10B981] text-white'
                        : status === 'active'
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-[#E2E8F0] text-[#475569]'
                    }`}
                  >
                    {status === 'done' ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : status === 'active' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      status === 'done'
                        ? 'text-[#047857]'
                        : status === 'active'
                          ? 'text-[#2563EB]'
                          : 'text-[#475569]'
                    }`}
                  >
                    {st.label}
                  </span>
                  {index < steps.length - 1 && (
                    <ArrowRight className="ml-auto hidden h-3.5 w-3.5 text-[#CBD5E1] sm:block" />
                  )}
                </div>
              );
            })}
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-[#F59E0B] bg-[#FFFBEB] px-4 py-3 text-xs font-medium text-[#92400E]"
            >
              {errorMessage}
            </div>
          )}

          {!presentation ? (
            <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-10 text-center">
              <p className="text-sm font-semibold text-[#0F172A]">No client pitch built yet</p>
              <p className="mt-1 text-xs text-[#475569]">
                Fill out Client Details and click &ldquo;Build Client Pitch&rdquo; to generate the service match, free sample, and ready-to-send message.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Card 1: Recommended Service (Royal Blue top border) */}
              <div className="rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#2563EB] bg-[#FFFFFF] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#2563EB]">
                    Recommended Service
                  </span>
                  <span className="rounded-md bg-[#EFF6FF] px-2.5 py-1 text-xs font-bold text-[#1D4ED8]">
                    {presentation.service}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#0F172A]">
                  {presentation.serviceReason}
                </p>
              </div>

              {/* Card 2: Free Sample to Show Them (Amber top border) */}
              <div className="rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#F59E0B] bg-[#FFFFFF] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#D97706]">
                    Free Sample to Show Them
                  </span>
                  <span className="rounded-md bg-[#FFFBEB] px-2.5 py-1 text-xs font-semibold text-[#B45309]">
                    Needs Attention
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-[#0F172A]">{presentation.sampleTitle}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[#475569]">
                    {presentation.sampleSummary}
                  </p>
                </div>

                {presentation.sampleHighlights.length > 0 && (
                  <ul className="space-y-1.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 text-xs text-[#0F172A]">
                    {presentation.sampleHighlights.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Card 3: Ready-to-Send Message (Emerald Green top border) */}
              <div className="rounded-xl border border-[#E2E8F0] border-t-4 border-t-[#10B981] bg-[#FFFFFF] p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-[#059669]">
                      Ready-to-Send Message
                    </span>
                    <div className="mt-0.5 text-xs font-medium text-[#475569]">
                      Subject: <span className="text-[#0F172A]">{presentation.messageSubject}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyMessage}
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
                        <span>Copy Message</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="whitespace-pre-wrap rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 font-sans text-sm leading-relaxed text-[#0F172A]">
                  {presentation.messageBody}
                </pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
