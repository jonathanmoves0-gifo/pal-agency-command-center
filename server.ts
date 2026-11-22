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
  BATCH_COOLDOWN_MS,
  getApiHealthStatus,
  sleepWithAbort,
} from './server/llmClient';
import { buildScoutGraph, buildSignalHunterGraph } from './server/signalGraph';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function initSse(res: Response): (event: PipelineStreamEvent) => void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  return (event: PipelineStreamEvent) => {
    if (res.writableEnded) return;
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
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
  prospects: ProspectInput[];
  calibration: CalibrationContext;
  send: (event: PipelineStreamEvent) => void;
  signal: AbortSignal;
  cooldownMs: number;
}) {
  const { prospects, calibration, send, signal, cooldownMs } = opts;
  const total = prospects.length;

  for (let i = 0; i < total; i++) {
    if (signal.aborted) break;
    const prospect = prospects[i];

    send({
      type: 'prospect_started',
      prospect_index: i + 1,
      prospect_total: total,
      business_name: prospect.business_name,
      domain: prospect.domain,
      message: `Processing prospect ${i + 1}/${total}: ${prospect.business_name}`,
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
            business_name: businessName,
            domain,
            niche,
            market: marketRaw,
            discovery_notes: discoveryNotes,
            intake_mode: 'single',
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
      message: `Launching Autonomous Niche Scout for "${niche}" in "${region}"...`,
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

      const prospects = scoutResult.discoveredProspects ?? [];
      send({
        type: 'scout_completed',
        prospect_total: prospects.length,
        provider: scoutResult.providerUsed,
        message:
          prospects.length > 0
            ? `Scout found ${prospects.length} net-new prospects. Feeding sequentially into Signal Hunter...`
            : 'No net-new businesses found outside existing localStorage leads.',
        data: {
          prospects: prospects.map((p) => ({
            business_name: p.business_name,
            domain: p.domain,
          })),
        },
        timestamp: new Date().toISOString(),
      });

      if (prospects.length > 0) {
        await runSequentialProspects({
          prospects,
          calibration,
          send,
          signal: controller.signal,
          cooldownMs: BATCH_COOLDOWN_MS,
        });
      }

      send({
        type: 'run_completed',
        message: `Autonomous Niche Scout completed (${prospects.length} prospects processed).`,
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
        prospects: items,
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
