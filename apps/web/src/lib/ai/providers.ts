export type AIProviderName = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama';

export interface AIProviderConfig {
  provider: AIProviderName;
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  provider: AIProviderName;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
}

export interface AIProviderAdapter {
  chat(messages: ChatMessage[], config: AIProviderConfig): Promise<ChatResponse>;
}

class OpenAIAdapter implements AIProviderAdapter {
  async chat(messages: ChatMessage[], config: AIProviderConfig): Promise<ChatResponse> {
    const start = performance.now();
    const res = await fetch(`${config.baseUrl ?? 'https://api.openai.com/v1'}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? config.model,
      provider: 'openai',
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      durationMs: Math.round(performance.now() - start),
    };
  }
}

class AnthropicAdapter implements AIProviderAdapter {
  async chat(messages: ChatMessage[], config: AIProviderConfig): Promise<ChatResponse> {
    const start = performance.now();
    const system = messages.find((m) => m.role === 'system')?.content;
    const userMessages = messages.filter((m) => m.role !== 'system');

    const res = await fetch(`${config.baseUrl ?? 'https://api.anthropic.com/v1'}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': config.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 4096,
        system,
        messages: userMessages.map((m) => ({ role: m.role, content: m.content })),
      }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await res.json();
    return {
      content: data.content?.[0]?.text ?? '',
      model: data.model ?? config.model,
      provider: 'anthropic',
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      durationMs: Math.round(performance.now() - start),
    };
  }
}

class GeminiAdapter implements AIProviderAdapter {
  async chat(messages: ChatMessage[], config: AIProviderConfig): Promise<ChatResponse> {
    const start = performance.now();
    const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
        signal: AbortSignal.timeout(30000),
      },
    );
    const data = await res.json();
    return {
      content: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      model: config.model,
      provider: 'gemini',
      inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
      durationMs: Math.round(performance.now() - start),
    };
  }
}

class OpenRouterAdapter implements AIProviderAdapter {
  async chat(messages: ChatMessage[], config: AIProviderConfig): Promise<ChatResponse> {
    const start = performance.now();
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://nexus-os.app',
        'X-Title': 'NEXUS OS',
      },
      body: JSON.stringify({ model: config.model, messages }),
      signal: AbortSignal.timeout(30000),
    });
    const data = await res.json();
    return {
      content: data.choices?.[0]?.message?.content ?? '',
      model: data.model ?? config.model,
      provider: 'openrouter',
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
      durationMs: Math.round(performance.now() - start),
    };
  }
}

class OllamaAdapter implements AIProviderAdapter {
  async chat(messages: ChatMessage[], config: AIProviderConfig): Promise<ChatResponse> {
    const start = performance.now();
    const res = await fetch(`${config.baseUrl ?? 'http://localhost:11434'}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages, stream: false }),
      signal: AbortSignal.timeout(120000),
    });
    const data = await res.json();
    return {
      content: data.message?.content ?? '',
      model: config.model,
      provider: 'ollama',
      inputTokens: data.prompt_eval_count ?? 0,
      outputTokens: data.eval_count ?? 0,
      durationMs: Math.round(performance.now() - start),
    };
  }
}

const ADAPTERS: Record<AIProviderName, AIProviderAdapter> = {
  openai: new OpenAIAdapter(),
  anthropic: new AnthropicAdapter(),
  gemini: new GeminiAdapter(),
  openrouter: new OpenRouterAdapter(),
  ollama: new OllamaAdapter(),
};

export function getAIAdapter(provider: AIProviderName): AIProviderAdapter {
  return ADAPTERS[provider];
}

export function getConfiguredProvider(): AIProviderConfig | null {
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY, model: 'gpt-4o-mini' };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY, model: 'claude-sonnet-4-20250514' };
  }
  if (process.env.GEMINI_API_KEY) {
    return { provider: 'gemini', apiKey: process.env.GEMINI_API_KEY, model: 'gemini-2.0-flash' };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return { provider: 'openrouter', apiKey: process.env.OPENROUTER_API_KEY, model: 'anthropic/claude-sonnet-4-20250514' };
  }
  if (process.env.OLLAMA_BASE_URL) {
    return { provider: 'ollama', apiKey: '', model: 'llama3.2', baseUrl: process.env.OLLAMA_BASE_URL };
  }
  return null;
}

export async function chatWithProvider(messages: ChatMessage[]): Promise<ChatResponse | null> {
  const config = getConfiguredProvider();
  if (!config) return null;

  const adapter = getAIAdapter(config.provider);
  return adapter.chat(messages, config);
}
