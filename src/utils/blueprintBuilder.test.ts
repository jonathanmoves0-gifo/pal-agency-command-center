import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAgenticSolutionBlueprint } from './blueprintBuilder';
import { buildSeedPitchForTrack } from './pitchPresenter';

test('buildAgenticSolutionBlueprint builds valid 4-step workflows without pricing claims or UGC', () => {
  const lead = buildSeedPitchForTrack('GLOBAL');

  const automationBlueprint = buildAgenticSolutionBlueprint({
    lead,
    customBusinessName: '',
    customDomain: '',
    customNiche: '',
    customBottleneck: '',
    focus: 'ai_automation',
    selectedChannelIds: ['web_chat_triage', 'calendar_booking'],
  });

  assert.equal(automationBlueprint.workflowSteps.length, 4);
  assert.equal(automationBlueprint.businessName, lead.business_name);
  assert.ok(!/\$|£|€|retainer|ugc|video script/i.test(automationBlueprint.softCloseMessage));

  const agenticBlueprint = buildAgenticSolutionBlueprint({
    lead: null,
    customBusinessName: 'Northstar Legal Partners',
    customDomain: 'northstarlegal.co.uk',
    customNiche: 'Legal Advisory',
    customBottleneck: 'Manual email intake slows down case qualification',
    focus: 'agentic_ai',
    selectedChannelIds: ['crm_routing'],
  });

  assert.equal(agenticBlueprint.workflowSteps.length, 4);
  assert.equal(agenticBlueprint.businessName, 'Northstar Legal Partners');
  assert.ok(agenticBlueprint.focusTitle.includes('Agentic AI'));
  assert.ok(!/\$|£|€|retainer|ugc|video script/i.test(agenticBlueprint.softCloseMessage));
});
