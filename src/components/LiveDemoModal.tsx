import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Check,
  Copy,
  Download,
  Monitor,
  Send,
  Smartphone,
  Sparkles,
  Workflow,
  X,
} from 'lucide-react';
import type { LeadRecord } from '../shared/types';
import { copyTextWithFallback } from '../utils/clipboard';
import { buildLeadProofAsset } from '../utils/proofBuilder';
import { downloadTextFile } from '../utils/storage';

interface LiveDemoModalProps {
  lead: LeadRecord | null;
  onClose: () => void;
  onOpenWebsiteBuilder: (lead: LeadRecord) => void;
  onOpenAgenticBlueprint: (lead: LeadRecord) => void;
}

interface SimChatMessage {
  sender: 'agent' | 'visitor';
  text: string;
  systemAction?: string;
}

export function LiveDemoModal({
  lead,
  onClose,
  onOpenWebsiteBuilder,
  onOpenAgenticBlueprint,
}: LiveDemoModalProps) {
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [chatHistory, setChatHistory] = useState<SimChatMessage[]>([]);

  const proof = lead ? lead.proof_asset || buildLeadProofAsset(lead) : null;

  useEffect(() => {
    if (!proof?.ai_blueprint) {
      setChatHistory([]);
      return;
    }
    setChatHistory([
      {
        sender: 'agent',
        text: proof.ai_blueprint.simulation_greeting,
        systemAction: '24/7 Assistant initialized for live website visitor session',
      },
    ]);
  }, [lead?.id, proof?.id]);

  useEffect(() => {
    if (!lead) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lead, onClose]);

  if (!lead || !proof) return null;

  const handleCopySummary = async () => {
    const ok = await copyTextWithFallback(proof.proof_summary_text);
    if (ok) {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 1500);
    }
  };

  const handleDownloadHtml = () => {
    if (!proof.website_preview) return;
    const slug = lead.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    downloadTextFile(
      `${slug}-redesign-preview.html`,
      proof.website_preview.html_document,
      'text/html;charset=utf-8'
    );
  };

  const handleRunScenario = (scenario: {
    user_message: string;
    agent_reply: string;
    system_action: string;
  }) => {
    setChatHistory((prev) => [
      ...prev,
      { sender: 'visitor', text: scenario.user_message },
      {
        sender: 'agent',
        text: scenario.agent_reply,
        systemAction: scenario.system_action,
      },
    ]);
  };

  const handleCustomChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customInput.trim();
    if (!trimmed || !proof.ai_blueprint) return;

    const services = lead.niche || 'consultation';
    const isBookingIntent = /(book|slot|time|tomorrow|appointment|schedule|available|price|cost)/i.test(
      trimmed
    );
    const reply = isBookingIntent
      ? `Happy to help with that at ${lead.business_name}! We have open ${services} windows Tomorrow at 10:00 AM and 2:30 PM. Reply with your preferred time and email or phone to lock it in right away.`
      : `Thanks for reaching out to ${lead.business_name}! Our team specializes in ${services} — share your preferred time or question and I will route a complete summary straight to our specialist and reserve your slot.`;

    const action = isBookingIntent
      ? `Checked open ${lead.business_name} calendar slots · Ready to lock instant confirmation`
      : `Qualified visitor intent for ${lead.business_name} · Prepared CRM handoff note`;

    setChatHistory((prev) => [
      ...prev,
      { sender: 'visitor', text: trimmed },
      { sender: 'agent', text: reply, systemAction: action },
    ]);
    setCustomInput('');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Live Demo and Proof for ${lead.business_name}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0F172A]/50 p-3 sm:p-6"
    >
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-xl">
        {/* Top Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] bg-[#FFFFFF] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-semibold text-[#1D4ED8]">
                <Sparkles className="h-3 w-3" />
                <span>{proof.pillar_label}</span>
              </span>
              <h3 className="text-sm sm:text-base font-bold text-[#0F172A] truncate">
                {proof.title}
              </h3>
            </div>
            <p className="mt-1 text-xs text-[#475569]">{proof.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#EFF6FF] hover:text-[#1D4ED8] cursor-pointer whitespace-nowrap"
            >
              {copiedSummary ? (
                <Check className="h-3.5 w-3.5 text-[#059669]" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-[#475569]" />
              )}
              <span>{copiedSummary ? 'Copied Proof Summary' : 'Copy Demo / Proof Summary'}</span>
            </button>

            {proof.website_preview ? (
              <>
                <button
                  type="button"
                  onClick={handleDownloadHtml}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#0F172A] hover:bg-[#F8FAFC] cursor-pointer whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5 text-[#475569]" />
                  <span>Download HTML</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenWebsiteBuilder(lead)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1E40AF] cursor-pointer whitespace-nowrap"
                >
                  <span>Customize in Builder</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAgenticBlueprint(lead)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3 py-1.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1E40AF] cursor-pointer whitespace-nowrap"
              >
                <span>Open Full Blueprint Tab</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close live demo preview"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:text-[#0F172A] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Flaws Resolved Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] bg-[#F8FAFC] px-5 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[#0F172A]">Live Audit Gaps Resolved:</span>
            {proof.flaws_addressed.slice(0, 3).map((flaw, idx) => (
              <span
                key={idx}
                className="rounded-md border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-medium text-[#065F46]"
              >
                ✓ {flaw}
              </span>
            ))}
          </div>

          {proof.website_preview && (
            <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] p-0.5">
              <button
                type="button"
                onClick={() => setViewportMode('desktop')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
                  viewportMode === 'desktop'
                    ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <Monitor className="h-3 w-3" />
                <span>Desktop</span>
              </button>
              <button
                type="button"
                onClick={() => setViewportMode('mobile')}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
                  viewportMode === 'mobile'
                    ? 'bg-[#EFF6FF] text-[#1D4ED8]'
                    : 'text-[#475569] hover:text-[#0F172A]'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                <span>Mobile</span>
              </button>
            </div>
          )}
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-5">
          {proof.website_preview ? (
            <div className="flex justify-center">
              <div
                className={`overflow-hidden rounded-xl border border-[#CBD5E1] bg-[#FFFFFF] shadow-sm transition-all ${
                  viewportMode === 'mobile' ? 'w-[390px] max-w-full' : 'w-full'
                }`}
              >
                <iframe
                  title={`Tailored Website Redesign Preview for ${lead.business_name}`}
                  sandbox="allow-scripts"
                  srcDoc={proof.website_preview.html_document}
                  className="h-[62vh] min-h-[460px] w-full border-0 bg-[#FFFFFF]"
                />
              </div>
            </div>
          ) : proof.ai_blueprint ? (
            <div className="space-y-5">
              {/* ROI / Time Saved Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {proof.ai_blueprint.roi_metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-4"
                  >
                    <div className="text-[11px] font-semibold text-[#475569]">{metric.label}</div>
                    <div className="mt-1 text-xl font-bold text-[#1D4ED8] tabular-nums">
                      {metric.value}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#64748B]">{metric.note}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* 4-Step Workflow Blueprint */}
                <div className="lg:col-span-6 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                    <Workflow className="h-4 w-4 text-[#1D4ED8]" />
                    <span>Tailored {proof.ai_blueprint.architecture_type} Architecture</span>
                  </div>

                  <div className="space-y-2.5">
                    {proof.ai_blueprint.workflow_steps.map((step) => (
                      <div
                        key={step.step}
                        className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 flex items-start gap-3"
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#1D4ED8] text-xs font-bold text-[#FFFFFF] shrink-0 tabular-nums">
                          {step.step}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="font-bold text-[#0F172A]">{step.title}</span>
                            <span className="font-medium text-[#1D4ED8]">· {step.stage}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-[#475569] leading-relaxed">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive Sample Chat / Booking Simulation */}
                <div className="lg:col-span-6 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
                        <Bot className="h-4 w-4 text-[#1D4ED8]" />
                        <span>Interactive Client Chat &amp; Booking Simulation</span>
                      </div>
                      <span className="rounded border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 text-[10px] font-semibold text-[#065F46]">
                        Live Demo
                      </span>
                    </div>

                    {/* Quick Test Scenario Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {proof.ai_blueprint.simulation_prompts.map((sc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleRunScenario(sc)}
                          className="rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-2.5 py-1 text-left text-[11px] font-medium text-[#1D4ED8] hover:bg-[#DBEAFE] cursor-pointer"
                        >
                          Test Prompt #{idx + 1}: {sc.user_message.slice(0, 42)}...
                        </button>
                      ))}
                    </div>

                    {/* Simulated Transcript */}
                    <div
                      data-testid="proof-simulation-transcript"
                      className="h-64 overflow-y-auto rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 space-y-2.5"
                    >
                      {chatHistory.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex flex-col ${
                            msg.sender === 'visitor' ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div
                            className={`max-w-[88%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                              msg.sender === 'visitor'
                                ? 'bg-[#1D4ED8] text-[#FFFFFF]'
                                : 'border border-[#E2E8F0] bg-[#FFFFFF] text-[#0F172A]'
                            }`}
                          >
                            {msg.text}
                          </div>
                          {msg.systemAction && (
                            <span className="mt-1 text-[10px] font-medium text-[#065F46]">
                              ⚡ {msg.systemAction}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Message Test Input */}
                  <form onSubmit={handleCustomChatSubmit} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customInput}
                      onChange={(e) => setCustomInput(e.target.value)}
                      placeholder={`Ask ${lead.business_name}'s demo assistant a question...`}
                      aria-label="Test message for interactive AI simulation"
                      className="flex-1 rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:border-[#1D4ED8] focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-3.5 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#1E40AF] cursor-pointer shrink-0"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Test</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
