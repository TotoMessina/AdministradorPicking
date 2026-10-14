export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** status = 0 when no HTTP error status is available (configuration/network/abort). */
export class GroqError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;

  constructor(message: string, status: number, code: string, retryAfter?: number) {
    super(message);
    this.name = 'GroqError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export interface AIAnalysis {
  summary: string;
  insights: string[];
  actions: string[];
}
