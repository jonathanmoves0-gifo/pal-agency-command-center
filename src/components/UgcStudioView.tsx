import { useMemo, useState } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import type { LeadRecord } from '../shared/types';
import { downloadTextFile } from '../utils/storage';

interface UgcStudioViewProps {
  leads: LeadRecord[];
}

interface UgcBeat {
  id: string;
  timecode: string;
  visual: string;
  spoken: string;
}

export function UgcStudioView({ leads }: UgcStudioViewProps) {
  const eligibleLeads = useMemo(
    () => leads.filter((l) => l.status === 'APPROVED_FOR_OUTREACH' || l.status === 'NEEDS_REVIEW'),
    [leads]
  );

  const [selectedLeadId, setSelectedLeadId] = useState<string>(eligibleLeads[0]?.id ?? '');
  const selectedLead = eligibleLeads.find((l) => l.id === selectedLeadId) ?? eligibleLeads[0] ?? null;

  const [creatorPersona, setCreatorPersona] = useState('Local Clinic Patient / First-Time Client');
  const [formatRatio, setFormatRatio] = useState<'9:16 Vertical' | '4:5 Feed' | '16:9 Case Cut'>('9:16 Vertical');
  const [primaryHook, setPrimaryHook] = useState(
    selectedLead
      ? `Why waiting 14 hours for a callback on ${selectedLead.domain} made me book elsewhere`
      : 'Why static enquiry forms lose 30% of after-hours clinic bookings'
  );

  const [beats, setBeats] = useState<UgcBeat[]>([
    {
      id: 'beat-1',
      timecode: '00:00–00:04',
      visual: 'Selfie-cam handheld screen-recording showing mobile enquiry friction',
      spoken: 'If you run ads to a contact form that says "we will call you back", watch this.',
    },
    {
      id: 'beat-2',
      timecode: '00:04–00:14',
      visual: 'Split screen: manual form vs instant 2-tap calendar slot confirmation',
      spoken: 'Most high-intent patients search after 6pm. When nobody answers, they bounce to the next clinic.',
    },
    {
      id: 'beat-3',
      timecode: '00:14–00:25',
      visual: 'Live SMS booking confirmation + calendar invite arriving in 8 seconds',
      spoken: 'We plugged in an instant triage widget and recovered booked consults the same week.',
    },
  ]);

  const handleSelectLead = (id: string) => {
    setSelectedLeadId(id);
    const found = eligibleLeads.find((l) => l.id === id);
    if (found) {
      setPrimaryHook(
        `How ${found.business_name} eliminates "${found.missed_capture_leaks[0] || found.bottleneck_diagnosis}"`
      );
    }
  };

  const addBeat = () => {
    setBeats((prev) => [
      ...prev,
      {
        id: `beat-${Date.now()}`,
        timecode: `00:${prev.length * 8 + 15}–00:${prev.length * 8 + 23}`,
        visual: 'B-roll proof overlay',
        spoken: 'Direct call to action pointing to instant booking link.',
      },
    ]);
  };

  const updateBeat = (id: string, field: keyof UgcBeat, value: string) => {
    setBeats((prev) => prev.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const removeBeat = (id: string) => {
    setBeats((prev) => prev.filter((b) => b.id !== id));
  };

  const exportBriefJson = () => {
    const payload = {
      module: 'Phase 4 — UGC Studio Brief',
      exported_at: new Date().toISOString(),
      target_lead: selectedLead
        ? {
            id: selectedLead.id,
            business_name: selectedLead.business_name,
            domain: selectedLead.domain,
            niche: selectedLead.niche,
            bottleneck_diagnosis: selectedLead.bottleneck_diagnosis,
          }
        : null,
      creator_persona: creatorPersona,
      format_ratio: formatRatio,
      primary_hook: primaryHook,
      script_beats: beats,
    };
    const slug = (selectedLead?.business_name || 'custom-brief')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    downloadTextFile(`ugc-brief-${slug}.json`, JSON.stringify(payload, null, 2), 'application/json');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border border-[#242830] bg-[#12151A] px-5 py-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-base font-semibold text-[#ECEFF4]">UGC Studio</h1>
            <span className="border border-[#242830] bg-[#0D0F12] px-2 py-0.5 font-mono text-[10px] text-[#8B949E]">
              PHASE 4 MODULE
            </span>
          </div>
          <p className="mt-1 text-xs text-[#8B949E]">
            Convert qualified Signal Hunter bottlenecks into creator-ready UGC creative briefs and shot-by-shot scripts.
          </p>
        </div>
        <button
          type="button"
          onClick={exportBriefJson}
          className="flex items-center gap-2 border border-[#22C55E] bg-[#22C55E] px-4 py-2 text-xs font-semibold text-[#0A0D0F] hover:bg-[#16A34A] cursor-pointer whitespace-nowrap"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export Brief JSON</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Configuration */}
        <section className="lg:col-span-4 border border-[#242830] bg-[#12151A] p-4 space-y-4">
          <h2 className="text-sm font-semibold text-[#ECEFF4]">Brief Target & Parameters</h2>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ugc-lead-select" className="text-xs font-medium text-[#C9D1D9]">
              Source Pipeline Lead
            </label>
            <select
              id="ugc-lead-select"
              value={selectedLead?.id ?? ''}
              onChange={(e) => handleSelectLead(e.target.value)}
              className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#22C55E] focus:outline-none"
            >
              {eligibleLeads.length === 0 ? (
                <option value="">No qualified leads yet</option>
              ) : (
                eligibleLeads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.business_name} ({l.total_score}/100 · {l.market})
                  </option>
                ))
              )}
            </select>
          </div>

          {selectedLead && (
            <div className="border border-[#242830] bg-[#0D0F12] p-3 space-y-1.5 text-xs">
              <div className="font-mono text-[11px] text-[#8B949E]">DIAGNOSED BOTTLENECK</div>
              <p className="text-[#C9D1D9] leading-relaxed">{selectedLead.bottleneck_diagnosis}</p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ugc-persona" className="text-xs font-medium text-[#C9D1D9]">
              Creator Persona
            </label>
            <input
              id="ugc-persona"
              type="text"
              value={creatorPersona}
              onChange={(e) => setCreatorPersona(e.target.value)}
              className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#22C55E] focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-[#C9D1D9]">Delivery Aspect Ratio</span>
            <div className="grid grid-cols-3 border border-[#242830] bg-[#0D0F12]">
              {(['9:16 Vertical', '4:5 Feed', '16:9 Case Cut'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setFormatRatio(ratio)}
                  className={`px-2 py-2 font-mono text-[11px] border-r last:border-r-0 border-[#242830] cursor-pointer ${
                    formatRatio === ratio
                      ? 'bg-[#1D222B] text-[#ECEFF4]'
                      : 'text-[#8B949E] hover:text-[#ECEFF4]'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ugc-hook" className="text-xs font-medium text-[#C9D1D9]">
              Opening 3-Second Hook
            </label>
            <textarea
              id="ugc-hook"
              rows={3}
              value={primaryHook}
              onChange={(e) => setPrimaryHook(e.target.value)}
              className="w-full border border-[#242830] bg-[#0D0F12] px-3 py-2 text-xs text-[#ECEFF4] focus:border-[#22C55E] focus:outline-none"
            />
          </div>
        </section>

        {/* Right Shot-by-Shot Storyboard */}
        <section className="lg:col-span-8 border border-[#242830] bg-[#12151A] p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#ECEFF4]">Storyboard Script Beats</h2>
              <p className="text-xs text-[#8B949E] mt-0.5">
                {formatRatio} · {beats.length} scenes queued
              </p>
            </div>
            <button
              type="button"
              onClick={addBeat}
              className="flex items-center gap-1.5 border border-[#242830] bg-[#0D0F12] px-3 py-1.5 text-xs font-medium text-[#ECEFF4] hover:border-[#3A414E] cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Beat</span>
            </button>
          </div>

          <div className="space-y-3">
            {beats.map((beat, idx) => (
              <div
                key={beat.id}
                className="border border-[#242830] bg-[#0D0F12] p-3 grid grid-cols-1 gap-3 sm:grid-cols-12 items-start"
              >
                <div className="sm:col-span-3 space-y-1">
                  <div className="font-mono text-[10px] text-[#8B949E]">SCENE 0{idx + 1}</div>
                  <input
                    type="text"
                    aria-label={`Timecode for scene ${idx + 1}`}
                    value={beat.timecode}
                    onChange={(e) => updateBeat(beat.id, 'timecode', e.target.value)}
                    className="w-full border border-[#242830] bg-[#12151A] px-2 py-1 font-mono text-xs text-[#ECEFF4]"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <div className="font-mono text-[10px] text-[#8B949E]">VISUAL DIRECTION</div>
                  <textarea
                    rows={2}
                    aria-label={`Visual direction for scene ${idx + 1}`}
                    value={beat.visual}
                    onChange={(e) => updateBeat(beat.id, 'visual', e.target.value)}
                    className="w-full border border-[#242830] bg-[#12151A] px-2 py-1 text-xs text-[#C9D1D9]"
                  />
                </div>
                <div className="sm:col-span-4 space-y-1">
                  <div className="font-mono text-[10px] text-[#8B949E]">SPOKEN LINE</div>
                  <textarea
                    rows={2}
                    aria-label={`Spoken line for scene ${idx + 1}`}
                    value={beat.spoken}
                    onChange={(e) => updateBeat(beat.id, 'spoken', e.target.value)}
                    className="w-full border border-[#242830] bg-[#12151A] px-2 py-1 text-xs text-[#ECEFF4]"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => removeBeat(beat.id)}
                    aria-label={`Remove scene ${idx + 1}`}
                    className="p-1.5 text-[#6E7681] hover:text-[#FCA5A5] cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
