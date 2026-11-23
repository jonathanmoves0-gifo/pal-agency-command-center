import { useMemo, useState } from 'react';
import { ArrowDown, Bot, Check, CheckSquare, Copy, Download, Square, Workflow } from 'lucide-react';
import type { LeadRecord } from '../shared/types';
import {
  BLUEPRINT_CHANNELS,
  buildAgenticSolutionBlueprint,
  type SolutionFocus,
} from '../utils/blueprintBuilder';
import { copyTextWithFallback } from '../utils/clipboard';
import { downloadTextFile } from '../utils/storage';

interface AgenticBlueprintsViewProps {
  leads: LeadRecord[];
  initialLeadId?: string | null;
}

export function AgenticBlueprintsView({
  leads,
  initialLeadId,
}: AgenticBlueprintsViewProps) {
  const [sourceMode, setSourceMode] = useState<'pipeline' | 'custom'>(
    leads.length > 0 ? 'pipeline' : 'custom'
  );
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    initialLeadId || leads[0]?.id || ''
  );

  const [focus, setFocus] = useState<SolutionFocus>('ai_automation');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([
    'web_chat_triage',
    'calendar_booking',
    'missed_call_sms',
  ]);

  const [customBusinessName, setCustomBusinessName] = useState('Apex Consulting Group');
  const [customDomain, setCustomDomain] = useState('apexconsulting.co.uk');
  const [customNiche, setCustomNiche] = useState('B2B Advisory');
  const [customBottleneck, setCustomBottleneck] = useState(
    'Inbound consultation inquiries wait 12–24 hours for manual review and scheduling'
  );
  const [copiedMessage, setCopiedMessage] = useState(false);

  const selectedLead = useMemo(
    () =>
      sourceMode === 'pipeline'
        ? leads.find((l) => l.id === selectedLeadId) ?? leads[0] ?? null
        : null,
    [sourceMode, leads, selectedLeadId]
  );

  const blueprint = useMemo(
    () =>
      buildAgenticSolutionBlueprint({
        lead: selectedLead,
        customBusinessName,
        customDomain,
        customNiche,
        customBottleneck,
        focus,
        selectedChannelIds: selectedChannels,
      }),
    [selectedLead, customBusinessName, customDomain, customNiche, customBottleneck, focus, selectedChannels]
  );

  const toggleChannel = (id: string) => {
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCopyMessage = async () => {
    const fullText = `Subject: ${blueprint.softCloseSubject}\n\n${blueprint.softCloseMessage}`;
    const ok = await copyTextWithFallback(fullText);
    if (ok) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 1500);
    }
  };

  const handleDownloadBlueprint = () => {
    const lines = [
      `${blueprint.focusTitle} — ${blueprint.businessName} (${blueprint.domain})`,
      `Industry: ${blueprint.niche}`,
      '',
      'Executive Summary:',
      blueprint.executiveSummary,
      '',
      'Step-by-Step Workflow Architecture:',
      ...blueprint.workflowSteps.map(
        (step) => `${step.stepNumber}. [${step.stage}] ${step.title}: ${step.detail}`
      ),
      '',
      'Expected Operational Outcomes:',
      ...blueprint.operationalOutcomes.map((o) => `- ${o}`),
      '',
      'Soft-Close Outreach Draft:',
      `Subject: ${blueprint.softCloseSubject}`,
      blueprint.softCloseMessage,
    ].join('\n');

    const slug = blueprint.businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadTextFile(`ai-solution-blueprint-${slug}.txt`, lines, 'text/plain');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-6 py-5">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A]">
            AI &amp; Agentic Solution Blueprints
          </h1>
          <p className="mt-1 text-xs text-[#475569] leading-relaxed">
            Design client-ready AI Business Automation or Custom Agentic AI workflows with clear visual steps and zero-pricing soft-close outreach.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer whitespace-nowrap"
          >
            {copiedMessage ? (
              <Check className="h-3.5 w-3.5 text-[#059669]" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-[#475569]" />
            )}
            <span>{copiedMessage ? 'Copied Message' : 'Copy Outreach Message'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadBlueprint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1E40AF] cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Blueprint (.txt)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Configuration Column */}
        <section className="lg:col-span-5 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 space-y-5">
          {/* Solution Pillar Selector */}
          <div>
            <h2 className="text-sm font-semibold text-[#0F172A]">1. Choose AI Solution Pillar</h2>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                aria-pressed={focus === 'ai_automation'}
                onClick={() => setFocus('ai_automation')}
                className={`rounded-lg border p-3 text-left cursor-pointer ${
                  focus === 'ai_automation'
                    ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                    : 'border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                  <Bot className="h-4 w-4 text-[#1D4ED8]" />
                  <span>AI Business Automation</span>
                </div>
                <p className="mt-1 text-[11px] text-[#475569] leading-snug">
                  24/7 reception, instant SMS recovery &amp; calendar booking.
                </p>
              </button>

              <button
                type="button"
                aria-pressed={focus === 'agentic_ai'}
                onClick={() => setFocus('agentic_ai')}
                className={`rounded-lg border p-3 text-left cursor-pointer ${
                  focus === 'agentic_ai'
                    ? 'border-[#1D4ED8] bg-[#EFF6FF]'
                    : 'border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                  <Workflow className="h-4 w-4 text-[#1D4ED8]" />
                  <span>Custom Agentic AI</span>
                </div>
                <p className="mt-1 text-[11px] text-[#475569] leading-snug">
                  Autonomous multi-step research, qualification &amp; CRM routing.
                </p>
              </button>
            </div>
          </div>

          {/* Client Selection */}
          <div className="border-t border-[#E2E8F0] pt-4 space-y-3">
            <h2 className="text-sm font-semibold text-[#0F172A]">2. Target Business</h2>
            <div className="grid grid-cols-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-1 gap-1">
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
                Custom Brief
              </button>
            </div>

            {sourceMode === 'pipeline' ? (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="agentic-lead-select" className="text-xs font-medium text-[#0F172A]">
                  Select Pipeline Business
                </label>
                <select
                  id="agentic-lead-select"
                  value={selectedLead?.id ?? ''}
                  onChange={(e) => setSelectedLeadId(e.target.value)}
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
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="bp-biz" className="text-xs font-medium text-[#0F172A]">
                      Business Name
                    </label>
                    <input
                      id="bp-biz"
                      type="text"
                      value={customBusinessName}
                      onChange={(e) => setCustomBusinessName(e.target.value)}
                      className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="bp-domain" className="text-xs font-medium text-[#0F172A]">
                      Website
                    </label>
                    <input
                      id="bp-domain"
                      type="text"
                      value={customDomain}
                      onChange={(e) => setCustomDomain(e.target.value)}
                      className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bp-niche" className="text-xs font-medium text-[#0F172A]">
                    Industry
                  </label>
                  <input
                    id="bp-niche"
                    type="text"
                    value={customNiche}
                    onChange={(e) => setCustomNiche(e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="bp-bottleneck" className="text-xs font-medium text-[#0F172A]">
                    Main Manual Bottleneck
                  </label>
                  <textarea
                    id="bp-bottleneck"
                    rows={2}
                    value={customBottleneck}
                    onChange={(e) => setCustomBottleneck(e.target.value)}
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] focus:border-[#1D4ED8] focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Workflow Channels */}
          <div className="border-t border-[#E2E8F0] pt-4 space-y-2.5">
            <span className="text-xs font-semibold text-[#0F172A]">
              3. Included Automation Channels
            </span>
            <div className="space-y-2">
              {BLUEPRINT_CHANNELS.map((ch) => {
                const active = selectedChannels.includes(ch.id);
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => toggleChannel(ch.id)}
                    className={`w-full rounded-lg border p-3 text-left cursor-pointer flex items-start gap-2.5 transition-colors ${
                      active
                        ? 'border-[#BFDBFE] bg-[#EFF6FF]'
                        : 'border-[#E2E8F0] bg-[#FFFFFF] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {active ? (
                      <CheckSquare className="h-4 w-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                    ) : (
                      <Square className="h-4 w-4 text-[#94A3B8] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-[#0F172A]">{ch.label}</div>
                      <p className="text-[11px] text-[#475569] mt-0.5 leading-snug">
                        {ch.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Proposal & Visual Workflow Map */}
        <section className="lg:col-span-7 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-6 space-y-6">
          <div className="border-b border-[#E2E8F0] pb-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-0.5 text-xs font-semibold text-[#1D4ED8]">
                {blueprint.focusTitle}
              </span>
              <span className="text-xs text-[#475569]">
                {blueprint.businessName} · {blueprint.domain}
              </span>
            </div>
            <p className="mt-3 text-sm text-[#0F172A] leading-relaxed">
              {blueprint.executiveSummary}
            </p>
          </div>

          {/* Visual Workflow Map */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-[#0F172A]">
              Visual End-to-End Workflow Map
            </h2>
            <div className="space-y-2.5">
              {blueprint.workflowSteps.map((step, idx) => (
                <div key={step.stepNumber} className="space-y-2.5">
                  <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 flex items-start gap-3.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1D4ED8] text-xs font-bold text-[#FFFFFF] shrink-0 tabular-nums">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#0F172A]">{step.title}</span>
                        <span className="text-[11px] font-medium text-[#1D4ED8]">
                          · {step.stage}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#475569] leading-relaxed">{step.detail}</p>
                    </div>
                  </div>
                  {idx < blueprint.workflowSteps.length - 1 && (
                    <div className="flex justify-center" aria-hidden="true">
                      <ArrowDown className="h-4 w-4 text-[#94A3B8]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Operational Outcomes */}
          <div className="rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] p-4 space-y-2">
            <h3 className="text-xs font-semibold text-[#065F46]">
              Operational Benefits for {blueprint.businessName}
            </h3>
            <ul className="space-y-1 text-xs text-[#065F46] list-disc pl-4 leading-relaxed">
              {blueprint.operationalOutcomes.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>

          {/* Zero-Pricing Soft Close Proposal */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#0F172A]">
                Zero-Pricing Soft-Close Outreach Draft
              </span>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 rounded-md border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-1 text-xs font-medium text-[#1D4ED8] hover:bg-[#EFF6FF] cursor-pointer"
              >
                {copiedMessage ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copiedMessage ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-xs font-semibold text-[#0F172A]">
              Subject: {blueprint.softCloseSubject}
            </div>
            <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-[#334155]">
              {blueprint.softCloseMessage}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}
