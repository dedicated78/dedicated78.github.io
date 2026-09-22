/**
 * Minimal OpenAI Chat Completions client with JSON output.
 * No tools/functions are ever passed to the model, so agents have no way to act on
 * external systems — they can only return text for the app to store as drafts.
 */
export interface AgentConfig {
  name: string;
  model: string;
  temperature: number;
  top_p: number;
}

const API = 'https://api.openai.com/v1/chat/completions';

export async function chatJSON<T>(agent: AgentConfig, system: string, user: string): Promise<T> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) throw new Error('OPENAI_API_KEY is not configured on the server');
  const body: Record<string, unknown> = {
    model: Deno.env.get('OPENAI_MODEL') ?? agent.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    response_format: { type: 'json_object' },
    temperature: agent.temperature,
    top_p: agent.top_p,
  };
  let res = await call(key, body);
  // Some reasoning models accept only default sampling; retry once without temperature/top_p.
  if (res.status === 400) {
    const text = await res.clone().text();
    if (/temperature|top_p/i.test(text)) {
      delete body.temperature;
      delete body.top_p;
      res = await call(key, body);
    }
  }
  if (!res.ok) throw new Error(`${agent.name}: model request failed (${res.status})`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${agent.name}: empty response`);
  try {
    return JSON.parse(content) as T;
  } catch {
    throw new Error(`${agent.name}: response was not valid JSON`);
  }
}

function call(key: string, body: unknown) {
  return fetch(API, { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
