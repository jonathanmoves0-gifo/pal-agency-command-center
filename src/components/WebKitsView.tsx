import { useMemo, useState } from 'react';
import { CheckSquare, Download, Square } from 'lucide-react';
import type { LeadRecord } from '../shared/types';
import { downloadTextFile } from '../utils/storage';

interface WebKitsViewProps {
  leads: LeadRecord[];
}

interface KitModule {
  id: string;
  name: string;
  turnaroundDays: number;
  scope: string;
  selected: boolean;
}

const DEFAULT_MODULES: KitModule[] = [
  {
    id: 'booking-triage',
    name: '24/7 Instant Booking Triage Widget',
    turnaroundDays: 2,
    scope: 'Embeddable slot selector with treatment pre-qualification and calendar webhook sync.',
    selected: true,
  },
  {
    id: 'sms-recovery',
    name: '60-Second Missed-Call & Form SMS Bridge',
    turnaroundDays: 1,
    scope: 'Automated two-way SMS recovery sequence triggered on form submission or missed inbound calls.',
    selected: true,
  },
  {
    id: 'ppc-landing',
    name: 'High-Intent Ad Landing Page Kit',
    turnaroundDays: 3,
    scope: 'Dedicated service-specific landing template replacing generic homepage PPC destinations.',
    selected: false,
  },
  {
    id: 'schema-local',
    name: 'Local SEO & Review Proof Layer',
    turnaroundDays: 1,
    scope: 'Verified Google review strip + structured JSON-LD clinic/service schema.',
    selected: false,
  },
];

export function WebKitsView({ leads }: WebKitsViewProps) {
  const eligibleLeads = useMemo(
    () => leads.filter((l) => l.status === 'APPROVED_FOR_OUTREACH' || l.status === 'NEEDS_REVIEW'),
    [leads]
  );

  const [selectedLeadId, setSelectedLeadId] = useState<string>(eligibleLeads[0]?.id ?? '');
  const selectedLead = eligibleLeads.find((l) => l.id === selectedLeadId) ?? eligibleLeads[0] ?? null;

  const [modules, setModules] = useState<KitModule[]>(DEFAULT_MODULES);
  const [targetStack, setTargetStack] = useState<'Next.js Edge' | 'Webflow Embed' | 'WordPress Plugin'>('Webflow Embed');

  const toggleModule = (id: string) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, selected: !m.selected } : m)));
  };

  const activeModules = modules.filter((m) => m.selected);
  const totalDays = activeModules.reduce((acc, m) => acc + m.turnaroundDays, 0);

  const exportKitSpec = () => {
    const spec = {
      module: 'Phase 4 — Rapid Web Kit Blueprint',
      exported_at: new Date().toISOString(),
      target_stack: targetStack,
      estimated_delivery_days: totalDays,
      client: selectedLead
        ? {
            id: selectedLead.id,
            business_name: selectedLead.business_name,
            domain: selectedLead.domain,
            missed_capture_leaks: selectedLead.missed_capture_leaks,
            ai_web_opportunities: selectedLead.ai_web_opportunities,
          }
        : null,
      enabled_kit_modules: activeModules,
    };
    const slug = (selectedLead?.business_name || 'web-kit')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    downloadTextFile(`web-kit-spec-${slug}.json`, JSON.stringify(spec, null, 2), 'application/json');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#242830] bg-[#12151A] px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold text-[#ECEFF4]">Web Kits</h1>
            <span className="border border-[#242830] bg-[#0D0F12] px-2 py-0.5 font-mono text-[10px] text-[#8B949E]">
              PHASE 4 MODULE
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8B949E]">
            Assemble deployment-ready conversion widgets and booking-gap fixes directly from Signal Hunter lead diagnostics.
          </p>
        </div>
        <button
          type="button"
          onClick={exportKitSpec}
          className="flex items-center gap-2 border border-[#22C55E] bg-[#22C55E] px-4 py-2 text-xs font-semibold text-[#0A0D0F] hover:bg-[#16A34A] cursor-pointer whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Kit Spec</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Lead Diagnostic */}
        <section className="lg:col-span-5 border border-[#242830] bg-[#12151A] p-4 space-y-4">
          <h2 className="text-sm font-semibold text-[#ECEFF4]">Target Account Diagnostics</h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="webkit-lead-select" className="text-xs font-medium text-[#C9D1D9]">
              Select Pipeline Lead
            </label>
            <select
              id="webkit-lead-select"
              value={selectedLead?.id ?? ''}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#22C55E] focus:outline-none"
            >
              {eligibleLeads.length === 0 ? (
                <option value="">No qualified leads yet</option>
              ) : (
                eligibleLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.business_name} · {l.domain}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#C9D1D9]">Deployment Target Stack</span>
            <div className="grid grid-cols-3 border border-[#242830] bg-[#0D0F12]">
              {(['Webflow Embed', 'WordPress Plugin', 'Next.js Edge'] as const).map((stk) => (
                <button
                  key={stk}
                  type="button"
                  onClick={() => setTargetStack(stk)}
                  className={`px-2 py-2 font-mono text-[11px] border-r last:border-r-0 border-[#242830] cursor-pointer ${
                    targetStack === stk
                      ? 'bg-[#1D222B] text-[#ECEFF4]'
                      : 'text-[#8B949E] hover:text-[#ECEFF4]'
                  }`}
                >
                  {stk}
                </button>
              ))}
            </div>
          </div>

          {selectedLead && (
            <div className="space-y-3 border-t border-[#242830] pt-3 text-xs">
              <div>
                <div className="font-mono text-[11px] text-[#F59E0B] mb-1.5">
                  MISSED CAPTURE LEAKS TO PATCH
                </div>
                <ul className="space-y-1 text-[#C9D1D9] list-disc pl-4">
                  {selectedLead.missed_capture_leaks.map((leak, idx) => (
                    <li key={idx}>{leak}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-mono text-[11px] text-[#22C55E] mb-1.5">
                  RECOMMENDED AI / WEB OPPORTUNITIES
                </div>
                <ul className="space-y-1 text-[#C9D1D9] list-disc pl-4">
                  {selectedLead.ai_web_opportunities.map((opp, idx) => (
                    <li key={idx}>{opp}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* Right Kit Module Checklist */}
        <section className="lg:col-span-7 border border-[#242830] bg-[#12151A] p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#ECEFF4]">Kit Module Assembly</h2>
              <p className="text-xs text-[#8B949E] mt-0.5">
                {activeModules.length} modules selected · {totalDays} business days estimated build
              </p>
            </div>
            <span className="font-mono text-xs text-[#ECEFF4] border border-[#242830] bg-[#0D0F12] px-2.5 py-1">
              STACK: {targetStack}
            </span>
          </div>

          <div className="space-y-2.5">
            {modules.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => toggleModule(mod.id)}
                className={`w-full text-left border p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                  mod.selected
                    ? 'border-[#22C55E]/70 bg-[#161B22]'
                    : 'border-[#242830] bg-[#0D0F12] hover:border-[#343B48]'
                }`}
              >
                {mod.selected ? (
                  <CheckSquare className="h-4 w-4 text-[#22C55E] shrink-0 mt-0.5" />
                ) : (
                  <Square className="h-4 w-4 text-[#6E7681] shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#ECEFF4]">{mod.name}</span>
                    <span className="font-mono text-[11px] text-[#8B949E] shrink-0">
                      +{mod.turnaroundDays}D
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[#8B949E] leading-relaxed">{mod.scope}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
