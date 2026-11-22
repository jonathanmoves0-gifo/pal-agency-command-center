import { GoogleGenAI } from '@google/genai';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { ApiHealthStatus, GroundingSource } from '../src/shared/types';
import { parseLlmJson } from '../src/utils/pipelineLogic';

export const PRIMARY_RESEARCH_MODEL = 'gemini-3.8-flash';
export const RESEARCH_FALLBACK_MODEL = 'gemini-2.5-flash-lite';
export const SCORING_MODEL = 'gemini-3.5-flash-lite';
export const OPENROUTER_FALLBACK_MODELS = [
  'openrouter/free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-ultra:free',
  'google/gemma-4-26b-a4b-it:free',
];
export const NODE_PACING_MS = 3500;
export const BATCH_COOLDOWN_MS = 4000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getOpenRouterClient(): ChatOpenAI | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new ChatOpenAI({
    apiKey,
    model: OPENROUTER_FALLBACK_MODELS[0],
    temperature: 0.2,
    configuration: {
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Pal Agency Command Center',
      },
    },
    modelKwargs: {
      models: OPENROUTER_FALLBACK_MODELS,
    },
  });
}

export function getApiHealthStatus(): ApiHealthStatus {
  return {
    gemini_configured: Boolean(getGeminiClient()),
    openrouter_configured: Boolean(getOpenRouterClient()),
    primary_research_model: PRIMARY_RESEARCH_MODEL,
    research_fallback_model: RESEARCH_FALLBACK_MODEL,
    scoring_model: SCORING_MODEL,
    openrouter_fallback_models: OPENROUTER_FALLBACK_MODELS,
    node_pacing_ms: NODE_PACING_MS,
    batch_cooldown_ms: BATCH_COOLDOWN_MS,
  };
}

export async function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) return;
  if (signal?.aborted) {
    throw new Error('Pipeline run aborted by client.');
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Pipeline run aborted by client.'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function isRateLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const status = (err as { status?: number })?.status;
  return status === 429 || /\b429\b|RESOURCE_EXHAUSTED|rate.?limit/i.test(msg);
}

function extractGroundingSources(response: unknown): GroundingSource[] {
  const res = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
  };
  const chunks = res?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const sources: GroundingSource[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const uri = chunk?.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({
      title: chunk?.web?.title?.trim() || uri,
      uri,
    });
  }
  return sources.slice(0, 6);
}

export interface LlmCallOptions {
  role: 'research' | 'scoring' | 'outreach';
  systemInstruction: string;
  prompt: string;
  useGrounding?: boolean;
  signal?: AbortSignal;
}

export interface LlmCallResult<T> {
  data: T;
  provider: string;
  groundingSources: GroundingSource[];
}

async function invokeGeminiAttempt<T>(
  ai: GoogleGenAI,
  model: string,
  systemInstruction: string,
  prompt: string,
  useGrounding: boolean,
  signal?: AbortSignal
): Promise<LlmCallResult<T>> {
  const runOnce = async () => {
    if (signal?.aborted) {
      throw new Error('Pipeline run aborted by client.');
    }
    const config: Record<string, unknown> = {
      systemInstruction,
    };
    if (useGrounding) {
      config.tools = [{ googleSearch: {} }];
    }
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config,
    });
    const text = response.text ?? '';
    if (!text.trim()) {
      throw new Error(`Empty response from ${model}`);
    }
    const parsed = parseLlmJson<T>(text);
    const groundingSources = useGrounding ? extractGroundingSources(response) : [];
    return {
      data: parsed,
      provider: useGrounding ? `${model} (grounded)` : `${model} (ungrounded)`,
      groundingSources,
    };
  };

  try {
    return await runOnce();
  } catch (err) {
    if (isRateLimitError(err)) {
      // Retry once on HTTP 429
      await sleepWithAbort(2000, signal);
      return await runOnce();
    }
    throw err;
  }
}

async function invokeOpenRouterAttempt<T>(
  client: ChatOpenAI,
  systemInstruction: string,
  prompt: string,
  signal?: AbortSignal
): Promise<LlmCallResult<T>> {
  const runOnce = async () => {
    if (signal?.aborted) {
      throw new Error('Pipeline run aborted by client.');
    }
    const response = await client.invoke(
      [new SystemMessage(systemInstruction), new HumanMessage(prompt)],
      { signal }
    );
    const content =
      typeof response.content === 'string'
        ? response.content
        : Array.isArray(response.content)
          ? response.content
              .map((part) => (typeof part === 'string' ? part : (part as { text?: string }).text ?? ''))
              .join('\n')
          : '';
    if (!content.trim()) {
      throw new Error('Empty response from OpenRouter');
    }
    const parsed = parseLlmJson<T>(content);
    const modelUsed =
      (response.response_metadata?.model_name as string | undefined) ||
      OPENROUTER_FALLBACK_MODELS[0];
    return {
      data: parsed,
      provider: `openrouter:${modelUsed}`,
      groundingSources: [],
    };
  };

  try {
    return await runOnce();
  } catch (err) {
    if (isRateLimitError(err)) {
      await sleepWithAbort(2000, signal);
      return await runOnce();
    }
    throw err;
  }
}

export async function invokeStructuredLlm<T>(options: LlmCallOptions): Promise<LlmCallResult<T>> {
  const ai = getGeminiClient();
  const openRouter = getOpenRouterClient();
  const errors: string[] = [];

  if (!ai && !openRouter) {
    throw new Error(
      'No LLM provider configured. Add GEMINI_API_KEY (or OPENROUTER_API_KEY) in Settings > Secrets.'
    );
  }

  if (ai) {
    const attempts: Array<{ model: string; grounded: boolean }> =
      options.role === 'research'
        ? [
            { model: PRIMARY_RESEARCH_MODEL, grounded: Boolean(options.useGrounding) },
            { model: PRIMARY_RESEARCH_MODEL, grounded: false },
            { model: RESEARCH_FALLBACK_MODEL, grounded: false },
            { model: SCORING_MODEL, grounded: false },
            { model: 'gemini-3.1-flash-lite', grounded: false },
            { model: 'gemini-4-hydrogen', grounded: Boolean(options.useGrounding) },
            { model: 'gemini-4-hydrogen', grounded: false },
          ]
        : options.role === 'scoring'
          ? [
              { model: SCORING_MODEL, grounded: false },
              { model: RESEARCH_FALLBACK_MODEL, grounded: false },
              { model: 'gemini-3.1-flash-lite', grounded: false },
              { model: 'gemini-4-hydrogen', grounded: false },
            ]
          : [
              { model: PRIMARY_RESEARCH_MODEL, grounded: false },
              { model: RESEARCH_FALLBACK_MODEL, grounded: false },
              { model: SCORING_MODEL, grounded: false },
              { model: 'gemini-3.1-flash-lite', grounded: false },
              { model: 'gemini-4-hydrogen', grounded: false },
            ];

    // Deduplicate identical (model, grounded) attempts
    const seenAttempts = new Set<string>();
    for (const attempt of attempts) {
      const key = `${attempt.model}:${attempt.grounded}`;
      if (seenAttempts.has(key)) continue;
      seenAttempts.add(key);

      try {
        return await invokeGeminiAttempt<T>(
          ai,
          attempt.model,
          options.systemInstruction,
          options.prompt,
          attempt.grounded,
          options.signal
        );
      } catch (err) {
        if (options.signal?.aborted) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${attempt.model}${attempt.grounded ? '[search]' : ''}: ${msg}`);
      }
    }
  }

  if (openRouter) {
    try {
      return await invokeOpenRouterAttempt<T>(
        openRouter,
        options.systemInstruction,
        options.prompt,
        options.signal
      );
    } catch (err) {
      if (options.signal?.aborted) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`openrouter: ${msg}`);
    }
  }

  throw new Error(`All LLM fallbacks failed. Details: ${errors.slice(0, 3).join(' | ')}`);
}
