import type { PipelineStreamEvent } from '../shared/types';

export async function streamSsePost<TEvent = PipelineStreamEvent>(
  url: string,
  payload: unknown,
  onEvent: (event: TEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let errMessage = `Request failed (${response.status})`;
    try {
      const json = (await response.json()) as { error?: string };
      if (json?.error) errMessage = json.error;
    } catch {
      // ignore parse error
    }
    throw new Error(errMessage);
  }

  if (!response.body) {
    throw new Error('SSE response stream is unavailable.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const processBlock = (block: string) => {
    const lines = block.split(/\r?\n/);
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }
    if (dataLines.length === 0) return;
    const rawData = dataLines.join('\n');
    try {
      const parsed = JSON.parse(rawData) as TEvent;
      onEvent(parsed);
    } catch {
      // ignore non-JSON heartbeat chunks
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split(/\r?\n\r?\n/);
    buffer = chunks.pop() ?? '';
    for (const chunk of chunks) {
      if (chunk.trim()) {
        processBlock(chunk);
      }
    }
  }

  if (buffer.trim()) {
    processBlock(buffer);
  }
}
