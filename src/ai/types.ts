export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/** Funções de IA do app (seção 10.5). Usadas no registro de uso e no cache. */
export type AIFeature =
  | 'testConnection'
  | 'explainTerm'
  | 'howDoISay'
  | 'explainMore'
  | 'translate'
  | 'correctText'
  | 'dailyChallenge'
  | 'errorQuiz'
  | 'conversationTurn'
  | 'weeklySummary'
  | 'avoidanceReport'
  | 'rehearsalPrep'
  | 'podcast'
  | 'photoToText'
  | 'speakingMetrics';

export type AIConfig = {
  baseUrl: string;
  apiKey: string | null;
  model: string;
  requiresKey: boolean;
  /** Enviar `response_format: json_object`? */
  jsonMode: boolean;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
  monthlyLimit: number | null;
};

export type AIUsage = { inputTokens: number; outputTokens: number; estimatedCost: number };

export type AIResult<T> = {
  data: T;
  /** Nome do modelo devolvido pelo provedor (ou o configurado). */
  model: string;
  usage: AIUsage;
};

export type CallOptions = {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  /** Conteúdo multimodal (ex.: imagem), repassado como está na última mensagem do usuário. */
  imageDataUrl?: string;
};

/** O mínimo de `Response` que o cliente usa (facilita os testes). */
export type HttpResponse = {
  ok: boolean;
  status: number;
  headers: { get(name: string): string | null };
  text(): Promise<string>;
};

export type FetchLike = (
  url: string,
  init: { method: string; headers: Record<string, string>; body?: string; signal: AbortSignal },
) => Promise<HttpResponse>;
