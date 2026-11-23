import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  CalibrationContext,
  PipelineStreamEvent,
  ProspectInput,
} from './src/shared/types';
import { parseBatchLines } from './src/utils/pipelineLogic';
import {
  attemptCloudVideoRender,
  generateRealisticVideoPlan,
  parseVideoStudioRequest,
} from './server/videoStudio';
import type { VideoStudioStreamEvent } from './src/utils/videoBlueprint';
import {
  BATCH_COOLDOWN_MS,
  getApiHealthStatus,
  sleepWithAbort,
} from './server/llmClient';
import { buildScoutGraph, buildSignalHunterGraph } from './server/signalGraph';
import type { AuditedBusinessData } from './server/webCrawler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initSse<T = PipelineStreamEvent>(res: Response): (event: T) => void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  return (event: T) => {
    if (res.writableEnded) return;
    const typeName =
      event && typeof event === 'object' && 'type' in event ? String(event.type) : 'message';
    res.write(`event: ${typeName}\ndata: ${JSON.stringify(event)}\n\n`);
  };
}

function normalizeCalibration(input: unknown): CalibrationContext {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<CalibrationContext>;
  return {
    top_winners: Array.isArray(raw.top_winners) ? raw.top_winners.slice(0, 3) : [],
    top_penalized: Array.isArray(raw.top_penalized) ? raw.top_penalized.slice(0, 2) : [],
  };
}

function attachAbortController(req: Request, res: Response): AbortController {
  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  });
  req.on('aborted', () => {
    controller.abort();
  });
  return controller;
}

async function runSequentialProspects(opts: {
  prospects: Array<{ prospect: ProspectInput; preAuditedData?: AuditedBusinessData }>;
  calibration: CalibrationContext;
  send: (event: PipelineStreamEvent) => void;
  signal: AbortSignal;
  cooldownMs: number;
}) {
  const { prospects, calibration, send, signal, cooldownMs } = opts;
  const total = prospects.length;

  for (let i = 0; i < total; i++) {
    if (signal.aborted) break;
    const item = prospects[i];
    const prospect = item.prospect;

    send({
      type: 'prospect_started',
      prospect_index: i + 1,
      prospect_total: total,
      business_name: prospect.business_name,
      domain: prospect.domain,
      message: `Processing qualified business ${i + 1}/${total}: ${prospect.business_name}`,
      timestamp: new Date().toISOString(),
    });

    try {
      const graph = buildSignalHunterGraph((nodeEvt) => {
        send({
          type: nodeEvt.phase,
          node: nodeEvt.node,
          prospect_index: i + 1,
          prospect_total: total,
          business_name: prospect.business_name,
          domain: prospect.domain,
          provider: nodeEvt.provider,
          message: nodeEvt.message,
          data: nodeEvt.data,
          timestamp: new Date().toISOString(),
        });
      }, signal);

      const finalState = await graph.invoke({
        prospect,
        calibration,
        pre_audited_data: item.preAuditedData,
      });

      if (finalState.lead_record) {
        send({
          type: 'lead_completed',
          prospect_index: i + 1,
          prospect_total: total,
          business_name: prospect.business_name,
          domain: prospect.domain,
          lead: finalState.lead_record,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      if (signal.aborted) break;
      const msg = err instanceof Error ? err.message : String(err);
      send({
        type: 'prospect_error',
        prospect_index: i + 1,
        prospect_total: total,
        business_name: prospect.business_name,
        domain: prospect.domain,
        message: msg,
        timestamp: new Date().toISOString(),
      });
    }

    if (i < total - 1 && !signal.aborted && cooldownMs > 0) {
      send({
        type: 'node_pacing',
        prospect_index: i + 1,
        prospect_total: total,
        message: `Batch pacing cooldown (${cooldownMs / 1000}s) before next prospect...`,
        timestamp: new Date().toISOString(),
      });
      await sleepWithAbort(cooldownMs, signal);
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Health & API readiness endpoint (booleans + model names only, never secrets)
  app.get('/api/health', (_req, res) => {
    res.json(getApiHealthStatus());
  });

  // 1. Single Prospect SSE endpoint
  app.post('/api/pipeline/run', async (req, res) => {
    const body = req.body ?? {};
    const businessName = String(body.business_name ?? '').trim();
    const domain = String(body.domain ?? '').trim();
    const niche = String(body.niche ?? '').trim();
    const marketRaw = String(body.market ?? '').trim().toUpperCase();
    const discoveryNotes = String(body.discovery_notes ?? '').trim();

    if (!businessName || !domain || !niche || (marketRaw !== 'US' && marketRaw !== 'UK')) {
      res.status(400).json({
        error: 'business_name, domain, niche, and market (US or UK) are required.',
      });
      return;
    }

    const send = initSse(res);
    const controller = attachAbortController(req, res);
    const calibration = normalizeCalibration(body.calibration);

    send({
      type: 'run_started',
      prospect_total: 1,
      message: `Initialized LangGraph Signal Hunter for ${businessName}`,
      timestamp: new Date().toISOString(),
    });

    try {
      await runSequentialProspects({
        prospects: [
          {
            prospect: {
              business_name: businessName,
              domain,
              niche,
              market: marketRaw,
              discovery_notes: discoveryNotes,
              intake_mode: 'single',
            },
          },
        ],
        calibration,
        send,
        signal: controller.signal,
        cooldownMs: 0,
      });

      send({
        type: 'run_completed',
        message: 'Single prospect pipeline completed.',
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      res.end();
    }
  });

  // 2. Autonomous Niche Scout SSE endpoint
  app.post('/api/pipeline/scout', async (req, res) => {
    const body = req.body ?? {};
    const niche = String(body.niche ?? '').trim();
    const region = String(body.region ?? '').trim();
    const existingLeads = Array.isArray(body.existingLeads)
      ? body.existingLeads
          .filter((x: unknown) => x && typeof x === 'object')
          .map((x: { business_name?: unknown; domain?: unknown }) => ({
            business_name: String(x.business_name ?? ''),
            domain: String(x.domain ?? ''),
          }))
      : [];

    if (!niche || !region) {
      res.status(400).json({
        error: 'Industry niche and target city/region are required.',
      });
      return;
    }

    const send = initSse(res);
    const controller = attachAbortController(req, res);
    const calibration = normalizeCalibration(body.calibration);

    send({
      type: 'run_started',
      message: `Searching live business directories for ${niche} in ${region}...`,
      timestamp: new Date().toISOString(),
    });

    try {
      const scoutGraph = buildScoutGraph((nodeEvt) => {
        send({
          type: nodeEvt.phase,
          node: nodeEvt.node,
          provider: nodeEvt.provider,
          message: nodeEvt.message,
          data: nodeEvt.data,
          timestamp: new Date().toISOString(),
        });
      }, controller.signal);

      const scoutResult = await scoutGraph.invoke({
        niche,
        region,
        existingLeads,
      });

      const qualified = scoutResult.qualifiedProspects ?? [];
      const rawFound = scoutResult.rawFoundCount ?? qualified.length;
      const filteredOut = scoutResult.filteredOutCount ?? 0;

      send({
        type: 'scout_completed',
        prospect_total: qualified.length,
        provider: scoutResult.providerUsed,
        message:
          rawFound > 0
            ? `Found ${rawFound} businesses → Kept ${qualified.length} with verified WhatsApp + Decision Maker (${filteredOut} filtered out)`
            : 'No live public businesses matched this search right now.',
        data: {
          raw_found_count: rawFound,
          qualified_count: qualified.length,
          filtered_out_count: filteredOut,
          missing_phone_count: scoutResult.missingPhoneCount ?? 0,
          missing_decision_maker_count: scoutResult.missingDecisionMakerCount ?? 0,
          prospects: qualified.map((item) => ({
            business_name: item.prospect.business_name,
            domain: item.prospect.domain,
            decision_maker_name: item.crawlData.decisionMakers[0]?.name,
          })),
        },
        timestamp: new Date().toISOString(),
      });

      if (qualified.length > 0) {
        await runSequentialProspects({
          prospects: qualified.map((item) => ({
            prospect: item.prospect,
            preAuditedData: item.crawlData,
          })),
          calibration,
          send,
          signal: controller.signal,
          cooldownMs: BATCH_COOLDOWN_MS,
        });
      }

      send({
        type: 'run_completed',
        message: `Live search finished: ${qualified.length} verified leads added (${filteredOut} filtered out without WhatsApp + decision maker).`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      res.end();
    }
  });

  // 3. Batch Queue SSE endpoint (up to 10 lines with 4-second pacing cooldown)
  app.post('/api/pipeline/batch', async (req, res) => {
    const body = req.body ?? {};
    const rawBatch = String(body.batch_text ?? '');
    const { items, errors } = parseBatchLines(rawBatch);

    if (errors.length > 0 || items.length === 0) {
      res.status(400).json({
        error: errors[0] || 'Invalid batch input.',
        errors,
      });
      return;
    }

    const send = initSse(res);
    const controller = attachAbortController(req, res);
    const calibration = normalizeCalibration(body.calibration);

    send({
      type: 'run_started',
      prospect_total: items.length,
      message: `Initialized Batch Queue (${items.length} prospects, ${BATCH_COOLDOWN_MS / 1000}s cooldown)...`,
      timestamp: new Date().toISOString(),
    });

    try {
      await runSequentialProspects({
        prospects: items.map((prospect) => ({ prospect })),
        calibration,
        send,
        signal: controller.signal,
        cooldownMs: BATCH_COOLDOWN_MS,
      });

      send({
        type: 'run_completed',
        message: `Batch queue completed (${items.length} prospects processed).`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        send({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      res.end();
    }
  });

  // 4. Live Video Studio SSE Generation Pipeline (3-stage progress + Realistic Anti-Slop Video Plan + Render Attempt)
  app.post('/api/video-studio/generate', async (req, res) => {
    const input = parseVideoStudioRequest((req.body ?? {}) as Record<string, unknown>);
    if (!input.topic) {
      res.status(400).json({ error: 'Please enter a Business, Brand, or Video Topic first.' });
      return;
    }

    const send = initSse<VideoStudioStreamEvent>(res);
    const controller = attachAbortController(req, res);

    try {
      // Stage 1: Structuring Realistic Scene
      send({
        type: 'stage_started',
        step: 1,
        message: `Structuring realistic scene for ${input.topic} (${input.cameraFraming})...`,
        timestamp: new Date().toISOString(),
      });
      await sleepWithAbort(220, controller.signal);
      send({
        type: 'stage_completed',
        step: 1,
        message: 'Scene structure and exact duration beats locked.',
        timestamp: new Date().toISOString(),
      });

      // Stage 2: Applying Anti-Slop Camera & Lighting Rules
      send({
        type: 'stage_started',
        step: 2,
        message: 'Applying realistic camera, lighting, and anti-slop physics rules...',
        timestamp: new Date().toISOString(),
      });

      const blueprint = await generateRealisticVideoPlan(input, controller.signal);

      send({
        type: 'stage_completed',
        step: 2,
        message: 'Realistic video prompts, spoken script, and motion graphics prepared.',
        blueprint,
        timestamp: new Date().toISOString(),
      });

      // Stage 3: Attempting Live Video Generation & Building Final Timeline
      send({
        type: 'stage_started',
        step: 3,
        message: 'Connecting video generator and finalizing timeline...',
        timestamp: new Date().toISOString(),
      });

      const renderOutcome = await attemptCloudVideoRender(
        blueprint.master_video_prompt,
        input.cloudModel,
        controller.signal
      );

      const finalBlueprint = {
        ...blueprint,
        video_render_status: renderOutcome.status,
        video_render_message: renderOutcome.message,
        video_data_url: renderOutcome.videoDataUrl,
        video_model_used: renderOutcome.modelUsed,
      };

      send({
        type: 'stage_completed',
        step: 3,
        message:
          renderOutcome.status === 'ready'
            ? 'Realistic AI video clip rendered and ready.'
            : 'Prompts & timeline built; cloud render needs attention.',
        timestamp: new Date().toISOString(),
      });

      send({
        type: 'studio_completed',
        blueprint: finalBlueprint,
        message: renderOutcome.message,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      if (!controller.signal.aborted) {
        send({
          type: 'error',
          message:
            err instanceof Error
              ? err.message
              : 'Video studio generation could not finish right now. Please try again.',
          timestamp: new Date().toISOString(),
        });
      }
    } finally {
      res.end();
    }
  });

  // 5. Realistic Video Production Blueprint JSON endpoint
  app.post('/api/video-blueprint', async (req, res) => {
    const input = parseVideoStudioRequest((req.body ?? {}) as Record<string, unknown>);
    if (!input.topic) {
      res.status(400).json({ error: 'Please enter a Business, Brand, or Video Topic first.' });
      return;
    }

    try {
      const normalized = await generateRealisticVideoPlan(input);
      res.json(normalized);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : 'Could not build the video production plan.',
      });
    }
  });

  // Mount Vite middleware in development, or serve dist/ in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pal Agency Command Center running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
