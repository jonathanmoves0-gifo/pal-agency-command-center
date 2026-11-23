import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadProofAsset, type ProofBuilderInput } from './proofBuilder';

test('buildLeadProofAsset builds complete responsive HTML/CSS/JS redesign preview for Website Design pillar', () => {
  const lead: ProofBuilderInput = {
    id: 'lead_web_1',
    business_name: 'Kampala Horizon Dental',
    domain: 'kampalahorizondental.ug',
    niche: 'Architecture & Design',
    market: 'UK',
    address: 'Plot 14 Kololo Hill Drive, Kampala, Uganda',
    discovery_notes: 'Slow legacy site with no mobile viewport',
    bottleneck_diagnosis: 'Dated website layout drops mobile visitors',
    missed_capture_leaks: ['Missing mobile viewport tag', 'No clear booking CTA above fold'],
    ai_web_opportunities: ['Modern mobile-first website redesign'],
    website_audit: {
      reachable: true,
      has_ssl: false,
      has_mobile_viewport: false,
      has_booking_tool: false,
      booking_tools_found: [],
      has_live_chat: false,
      chat_tools_found: [],
      cta_count: 1,
      page_title: 'Home',
      homepage_excerpt: 'Interior design and commercial architecture.',
      checked_urls: ['http://kampalahorizondental.ug'],
      audited_at: '2026-11-23T00:00:00Z',
    },
    contact_phones: ['+256772111222'],
    contact_emails: ['hello@kampalahorizondental.ug'],
  };

  const proof = buildLeadProofAsset(lead);
  assert.equal(proof.pillar, 'website_design');
  assert.equal(proof.pillar_label, 'Professional Website Design');
  assert.ok(proof.website_preview);
  assert.ok(proof.website_preview.html_document.includes('<!DOCTYPE html>'));
  assert.ok(proof.website_preview.html_document.includes('Kampala Horizon Dental'));
  assert.ok(proof.website_preview.html_document.includes('<meta name="viewport"'));
  assert.ok(proof.website_preview.html_document.includes('<script>'));
  assert.ok(proof.proof_summary_text.includes('Kampala Horizon Dental'));
});

test('buildLeadProofAsset escapes HTML entities inside business_name and flaws safely', () => {
  const lead: ProofBuilderInput = {
    id: 'lead_xss_1',
    business_name: 'A&B <script>alert(1)</script> Studio',
    domain: 'abstudio.co.uk',
    niche: 'Real Estate',
    market: 'UK',
    address: 'London, UK',
    discovery_notes: 'No mobile viewport',
    bottleneck_diagnosis: 'Static site',
    missed_capture_leaks: ['<img src=x onerror=alert(1)>'],
    ai_web_opportunities: [],
    website_audit: {
      reachable: true,
      has_ssl: true,
      has_mobile_viewport: false,
      has_booking_tool: false,
      booking_tools_found: [],
      has_live_chat: false,
      chat_tools_found: [],
      cta_count: 0,
      page_title: '',
      homepage_excerpt: '',
      checked_urls: [],
      audited_at: '2026-11-23T00:00:00Z',
    },
    contact_phones: [],
    contact_emails: [],
  };

  const proof = buildLeadProofAsset(lead);
  assert.ok(proof.website_preview);
  assert.ok(!proof.website_preview.html_document.includes('<script>alert(1)</script>'));
  assert.ok(proof.website_preview.html_document.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(!proof.website_preview.html_document.includes('<img src=x onerror=alert(1)>'));
});

test('buildLeadProofAsset builds interactive AI Blueprint & simulation prompts for AI Automation & Agentic AI', () => {
  const automationLead: ProofBuilderInput = {
    id: 'lead_auto_1',
    business_name: 'Cavendish Dental Studio',
    domain: 'cavendishdental.co.uk',
    niche: 'Dental Clinics',
    market: 'UK',
    address: '42 Cavendish Square, London',
    discovery_notes: 'Static callback form with no live booking',
    bottleneck_diagnosis: 'Patients wait for manual callback after hours',
    missed_capture_leaks: ['No 24/7 online booking slot picker'],
    ai_web_opportunities: ['24/7 AI booking assistant'],
    website_audit: {
      reachable: true,
      has_ssl: true,
      has_mobile_viewport: true,
      has_booking_tool: false,
      booking_tools_found: [],
      has_live_chat: false,
      chat_tools_found: [],
      cta_count: 2,
      page_title: 'Cavendish Dental',
      homepage_excerpt: 'Cosmetic dentistry and Invisalign in London.',
      checked_urls: ['https://cavendishdental.co.uk'],
      audited_at: '2026-11-23T00:00:00Z',
    },
    contact_phones: ['+447700900821'],
    contact_emails: ['reception@cavendishdental.co.uk'],
  };

  const proof = buildLeadProofAsset(automationLead);
  assert.equal(proof.pillar, 'ai_automation');
  assert.equal(proof.pillar_label, 'AI Business Automation');
  assert.ok(proof.ai_blueprint);
  assert.equal(proof.ai_blueprint.workflow_steps.length, 4);
  assert.equal(proof.ai_blueprint.roi_metrics.length, 3);
  assert.equal(proof.ai_blueprint.simulation_prompts.length, 3);
  assert.ok(proof.ai_blueprint.simulation_greeting.includes('Cavendish Dental Studio'));

  const agenticLead: ProofBuilderInput = {
    ...automationLead,
    id: 'lead_agentic_1',
    business_name: 'Meridian Advisory Partners',
    domain: 'meridianadvisory.com',
    niche: 'B2B Legal & Consulting',
    discovery_notes: 'Multi-step client qualification and CRM routing bottleneck',
    bottleneck_diagnosis: 'Partners manually research and qualify every inbound RFP',
  };
  const agenticProof = buildLeadProofAsset(agenticLead);
  assert.equal(agenticProof.pillar, 'agentic_ai');
  assert.equal(agenticProof.pillar_label, 'Custom Agentic AI Systems');
  assert.ok(agenticProof.ai_blueprint);
});
