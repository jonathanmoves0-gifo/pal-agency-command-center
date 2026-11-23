import { useMemo, useState } from 'react';
import { Calendar, Check, CheckSquare, Copy, Download, Globe, ShieldCheck, Square } from 'lucide-react';
import type { LeadRecord } from '../shared/types';
import { WEBSITE_TEMPLATES, type IndustryTemplate } from '../utils/pitchPresenter';
import { downloadTextFile } from '../utils/storage';
import { copyTextWithFallback } from '../utils/clipboard';

interface WebsitePreviewBuilderViewProps {
  leads: LeadRecord[];
  initialLeadId?: string | null;
}

interface ConversionModule {
  id: string;
  name: string;
  turnaroundDays: number;
  scope: string;
  selected: boolean;
}

const DEFAULT_MODULES: ConversionModule[] = [
  {
    id: 'booking-triage',
    name: '24/7 Instant Booking & Calendar Flow',
    turnaroundDays: 2,
    scope: 'Interactive consultation time selector with pre-qualification questions and instant calendar sync.',
    selected: true,
  },
  {
    id: 'high-converting-hero',
    name: 'Focused High-Converting Landing Layout',
    turnaroundDays: 3,
    scope: 'Dedicated service landing page replacing cluttered multi-purpose homepages with clear calls to action.',
    selected: true,
  },
  {
    id: 'sms-recovery',
    name: '60-Second Missed-Inquiry Recovery',
    turnaroundDays: 1,
    scope: 'Automated SMS and email confirmation triggered immediately when a visitor requests a callback.',
    selected: false,
  },
  {
    id: 'trust-proof',
    name: 'Verified Client Review & Local SEO Strip',
    turnaroundDays: 1,
    scope: 'Clean client review proof section with structured local business schema for higher trust.',
    selected: false,
  },
];

const DEMO_SLOTS = ['Tomorrow · 10:00 AM', 'Tomorrow · 2:30 PM', 'Thu · 11:15 AM'];

export function WebsitePreviewBuilderView({
  leads,
  initialLeadId,
}: WebsitePreviewBuilderViewProps) {
  const [sourceMode, setSourceMode] = useState<'pipeline' | 'custom'>(
    leads.length > 0 ? 'pipeline' : 'custom'
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    initialLeadId || leads[0]?.id || ''
  );
  const [customBusiness, setCustomBusiness] = useState('Harborview Dental Partners');
  const [customDomain, setCustomDomain] = useState('harborviewdental.com');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(WEBSITE_TEMPLATES[0].id);
  const [platform, setPlatform] = useState<'Webflow' | 'WordPress' | 'Custom React / Next.js'>(
    'Custom React / Next.js'
  );
  const [modules, setModules] = useState<ConversionModule[]>(DEFAULT_MODULES);
  const [selectedPreviewSlot, setSelectedPreviewSlot] = useState<string>(DEMO_SLOTS[0]);
  const [previewBooked, setPreviewBooked] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedLeadId) ?? leads[0] ?? null,
    [leads, selectedLeadId]
  );

  const activeTemplate: IndustryTemplate =
    WEBSITE_TEMPLATES.find((t) => t.id === selectedTemplateId) ?? WEBSITE_TEMPLATES[0];

  const activeBusinessName =
    sourceMode === 'pipeline' && selectedLead
      ? selectedLead.business_name
      : customBusiness.trim() || 'Target Client Website';
  const activeDomain =
    sourceMode === 'pipeline' && selectedLead
      ? selectedLead.domain
      : customDomain.trim() || 'clientwebsite.com';
  const activeLeaks =
    sourceMode === 'pipeline' && selectedLead && selectedLead.missed_capture_leaks.length > 0
      ? selectedLead.missed_capture_leaks
      : [activeTemplate.defaultIssue];

  const activeModules = modules.filter((m) => m.selected);
  const totalDays = activeModules.reduce((acc, m) => acc + m.turnaroundDays, 0);

  const toggleModule = (id: string) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m)));
  };

  const buildProposalNotes = () => {
    return [
      `Website Redesign & Conversion Preview — ${activeBusinessName} (${activeDomain})`,
      `Recommended Platform: ${platform} · Estimated Build Time: ${totalDays} business days`,
      `Layout Focus: ${activeTemplate.name}`,
      '',
      `Primary Gaps Addressed:`,
      ...activeLeaks.map((leak) => `- ${leak}`),
      '',
      `Included Modules:`,
      ...activeModules.map((m) => `- ${m.name} (${m.scope})`),
      '',
      `Soft-Close Note: We put together an interactive homepage & booking flow mockup specifically for ${activeDomain}. Happy to send the preview link over so you can click through it.`,
    ].join('\n');
  };

  const handleCopyNotes = async () => {
    const ok = await copyTextWithFallback(buildProposalNotes());
    if (ok) {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 1500);
    }
  };

  const handleDownloadBlueprint = () => {
    const payload = {
      type: 'Pal Agency — Website Preview Blueprint',
      exported_at: new Date().toISOString(),
      business_name: activeBusinessName,
      domain: activeDomain,
      industry_layout: activeTemplate.name,
      target_platform: platform,
      estimated_delivery_days: totalDays,
      gaps_addressed: activeLeaks,
      enabled_modules: activeModules,
      headline: activeTemplate.previewHeadline,
      cta_label: activeTemplate.previewCta,
    };
    const slug = activeBusinessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadTextFile(
      `website-preview-${slug}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-5">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">Website Preview Builder</h1>
          <p className="mt-1 text-xs text-[#475569] leading-relaxed">
            Configure a high-converting website redesign and live booking preview tailored to any pipeline prospect before pitching.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyNotes}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer whitespace-nowrap"
          >
            {copiedSummary ? (
              <Check className="h-3.5 w-3.5 text-[#059669]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[#475569]" />
            )}
            <span>{copiedSummary ? 'Copied Notes' : 'Copy Preview Summary'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBlueprint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1E40AF] cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Blueprint</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Configuration Column */}
        <section className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 space-y-5">
          <div>
            <h2 className="text-sm font-semibold text-[#0F172A]">1. Target Client &amp; Layout</h2>
            <div className="mt-2.5 grid grid-cols-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1 gap-1">
              <button
                type="button"
                onClick={() => setSourceMode('pipeline')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  sourceMode === 'pipeline'
                    ? 'bg-[#FFFFFF] text-[#1D4ED8] shadow-xs border border-[#E2E8F0]'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                From Client Pipeline
              </button>
              <button
                type="button"
                onClick={() => setSourceMode('custom')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  sourceMode === 'custom'
                    ? 'bg-[#FFFFFF] text-[#1D4ED8] shadow-xs border border-[#E2E8F0]'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                Custom Business Brief
              </button>
            </div>
          </div>

          {sourceMode === 'pipeline' ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="website-lead-select" className="text-xs font-medium text-[#0F172A]">
                Select Business from Pipeline
              </label>
              <select
                id="website-lead-select"
                value={selectedLead?.id ?? ''}
                onChange={(e) => {
                  setSelectedLeadId(e.target.value);
                  setPreviewBooked(false);
                }}
                className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
              >
                {leads.length === 0 ? (
                  <option value="">No businesses saved yet</option>
                ) : (
                  leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.business_name} · {l.domain}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="custom-web-biz" className="text-xs font-medium text-[#0F172A]">
                  Business Name
                </label>
                <input
                  id="custom-web-biz"
                  type="text"
                  value={customBusiness}
                  onChange={(e) => setCustomBusiness(e.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="custom-web-domain" className="text-xs font-medium text-[#0F172A]">
                  Website Domain
                </label>
                <input
                  id="custom-web-domain"
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Industry Layout Picker */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="industry-layout-select" className="text-xs font-medium text-[#0F172A]">
              Industry Website Template
            </label>
            <select
              id="industry-layout-select"
              value={selectedTemplateId}
              onChange={(e) => {
                setSelectedTemplateId(e.target.value);
                setPreviewBooked(false);
              }}
              className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
            >
              {WEBSITE_TEMPLATES.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} — {tpl.recommendedService}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Picker */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#0F172A]">Target Website Stack</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Webflow', 'WordPress', 'Custom React / Next.js'] as const).map((stk) => (
                <button
                  key={stk}
                  type="button"
                  onClick={() => setPlatform(stk)}
                  className={`rounded-lg border px-2 py-2 text-[11px] font-medium cursor-pointer transition-colors ${
                    platform === stk
                      ? 'border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]'
                      : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  {stk}
                </button>
              ))}
            </div>
          </div>

          {/* Modules */}
          <div className="space-y-2.5 border-t border-[#E2E8F0] pt-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#0F172A]">2. Conversion Modules</span>
              <span className="text-[#475569] tabular-nums">
                {activeModules.length} selected · {totalDays} days build
              </span>
            </div>

            <div className="space-y-2">
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => toggleModule(mod.id)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                    mod.selected
                      ? 'border-[#BFDBFE] bg-[#EFF6FF]'
                      : 'border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {mod.selected ? (
                    <CheckSquare className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                  ) : (
                    <Square className="h-4 w-4 text-[#94A3B8] shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#0F172A]">{mod.name}</span>
                      <span className="text-[11px] font-medium text-[#475569] tabular-nums shrink-0">
                        +{mod.turnaroundDays}d
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#475569] leading-relaxed">{mod.scope}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Interactive Live Website Preview */}
        <section className="lg:col-span-7 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-[#0F172A]">
                Interactive Client Website Preview
              </h2>
              <p className="text-xs text-[#475569] mt-0.5">
                Tailored mockup for {activeBusinessName} · Platform: {platform}
              </p>
            </div>
            <span className="rounded-md border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-semibold text-[#065F46]">
              Ready to Share
            </span>
          </div>

          {/* Browser Mockup Frame */}
          <div className="rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden flex-1 flex flex-col">
            {/* Mock Browser Chrome */}
            <div className="flex items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#FFFFFF] px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-[#475569]">
                <Globe className="h-3.5 w-3.5 text-[#1D4ED8]" />
                <span className="font-medium text-[#0F172A]">https://{activeDomain}</span>
              </div>
              <span className="text-[11px] text-[#64748B]">Redesigned Conversion Preview</span>
            </div>

            {/* Mock Website Canvas */}
            <div className="p-6 space-y-6 bg-[#FFFFFF] flex-1">
              {/* Mock Site Nav */}
              <div className="flex items-center justify-between gap-4 border-b border-[#F1F5F9] pb-4">
                <span className="text-sm font-bold text-[#0F172A]">{activeBusinessName}</span>
                <div className="hidden sm:flex items-center gap-4 text-xs text-[#475569]">
                  <span>Services</span>
                  <span>Client Results</span>
                  <span>Book Online</span>
                </div>
              </div>

              {/* Hero + Interactive Booking Preview */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-12 items-start">
                <div className="md:col-span-7 space-y-3">
                  <p className="text-xs font-semibold text-[#1D4ED8]">
                    {activeTemplate.industry}
                  </p>
                  <h3 className="text-xl font-bold text-[#0F172A] leading-snug">
                    {activeTemplate.previewHeadline}
                  </h3>
                  <p className="text-xs text-[#475569] leading-relaxed">
                    {activeTemplate.previewSubheadline}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {activeTemplate.trustHighlights.map((item) => (
                      <span
                        key={item}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-[#065F46]"
                      >
                        <ShieldCheck className="h-3.5 w-3.5 text-[#059669]" />
                        <span>{item}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Live Interactive Slot Widget inside Mockup */}
                <div className="md:col-span-5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                    <Calendar className="h-4 w-4 text-[#1D4ED8]" />
                    <span>Instant Slot Selection</span>
                  </div>

                  <div className="space-y-1.5">
                    {DEMO_SLOTS.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setSelectedPreviewSlot(slot);
                          setPreviewBooked(false);
                        }}
                        className={`w-full rounded-lg border px-3 py-1.5 text-left text-xs font-medium cursor-pointer transition-colors ${
                          selectedPreviewSlot === slot
                            ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8]'
                            : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A] hover:bg-[#F1F5F9]'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => setPreviewBooked(true)}
                    className="w-full rounded-lg bg-[#1D4ED8] px-3 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1E40AF] cursor-pointer"
                  >
                    {previewBooked ? `Confirmed: ${selectedPreviewSlot}` : activeTemplate.previewCta}
                  </button>
                </div>
              </div>

              {/* Active Modules & Gaps Resolved Strip */}
              <div className="border-t border-[#E2E8F0] pt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="text-xs font-semibold text-[#92400E] mb-1.5">
                    Website Gaps Resolved
                  </div>
                  <ul className="space-y-1 text-xs text-[#475569] list-disc pl-4">
                    {activeLeaks.slice(0, 3).map((leak, idx) => (
                      <li key={idx}>{leak}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-xs font-semibold text-[#065F46] mb-1.5">
                    Enabled Conversion Sections
                  </div>
                  <ul className="space-y-1 text-xs text-[#475569] list-disc pl-4">
                    {(activeModules.length > 0
                      ? activeModules.map((m) => m.name)
                      : activeTemplate.previewSections
                    ).map((sec, idx) => (
                      <li key={idx}>{sec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
