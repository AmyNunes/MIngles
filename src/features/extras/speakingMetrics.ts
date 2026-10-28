/** Métricas da Gravação mensal (seção 14, Fase 8), calculadas no aparelho. */

export type SpeakingMetrics = {
  words: number;
  /** Palavras por minuto. */
  wpm: number;
  /** Palavras diferentes. */
  unique: number;
  /** Variedade: % de palavras diferentes (0–100). */
  variety: number;
};

const MIN_DURATION_MS = 1000;

export function speakingMetrics(transcript: string, durationMs: number): SpeakingMetrics {
  const words = transcript.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
  const unique = new Set(words).size;
  const minutes = durationMs / 60_000;
  return {
    words: words.length,
    wpm: durationMs >= MIN_DURATION_MS && words.length ? Math.round(words.length / minutes) : 0,
    unique,
    variety: words.length ? Math.round((unique / words.length) * 100) : 0,
  };
}

/** "2026-10" no fuso do aparelho. */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Diferença em relação à primeira gravação com texto (para "desde o início"). */
export function metricsDelta(current: SpeakingMetrics, first: SpeakingMetrics | null): { wpm: number; unique: number } | null {
  if (!first || first.words === 0 || current.words === 0) return null;
  return { wpm: current.wpm - first.wpm, unique: current.unique - first.unique };
}
