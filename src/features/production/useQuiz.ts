import { useEffect, useState } from 'react';

import { AIError, toAIError } from '@/ai/client';
import { errorQuiz } from '@/ai/functions/production';
import type { QuizQuestion } from '@/ai/schemas/production';
import { sampleErrors } from '@/db/errorsRepo';
import { saveQuizSession } from '@/db/productionRepo';
import { haptics } from '@/lib/haptics';

type Status = 'loading' | 'ready' | 'empty' | 'needsAi' | 'error' | 'done';
const QUESTIONS = 8;
const SAMPLE = 16;

const normalize = (s: string) =>
  s.trim().toLowerCase().replace(/[’‘]/g, "'").replace(/[.!?,;:"]+/g, '').replace(/\s+/g, ' ');

export const isCorrectAnswer = (given: string, answer: string) => normalize(given) === normalize(answer);

/** Treino de erros (seção 8.5): 8 questões a partir do caderno, feedback imediato. */
export function useQuiz(category?: string) {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ given: string; correct: boolean }[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const sample = await sampleErrors(SAMPLE, category);
      if (!sample.length) {
        if (alive) setStatus('empty');
        return;
      }
      const qs = await errorQuiz(sample, QUESTIONS);
      if (!alive) return;
      setQuestions(qs);
      setStatus('ready');
    })().catch((e: unknown) => {
      if (!alive) return;
      setError(toAIError(e).messagePt);
      setStatus(e instanceof AIError && e.kind === 'notConfigured' ? 'needsAi' : 'error');
    });
    return () => {
      alive = false;
    };
  }, [category, attempt]);

  const current = questions[index];
  const answered = answers[index];

  const answer = (given: string) => {
    if (!current || answered) return;
    const correct = isCorrectAnswer(given, current.answer);
    if (correct) haptics.light();
    else haptics.warning();
    setAnswers((prev) => [...prev, { given, correct }]);
  };

  const next = async () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      return;
    }
    const score = answers.filter((a) => a.correct).length;
    setStatus('done');
    haptics.success();
    await saveQuizSession({ questions, answers, score }).catch(() => {});
  };

  const restart = () => {
    setQuestions([]);
    setIndex(0);
    setAnswers([]);
    setStatus('loading');
    setAttempt((a) => a + 1);
  };

  const wrongCategories = [...new Set(questions.filter((_, i) => answers[i] && !answers[i].correct).map((q) => q.category))];

  return { status, error, questions, index, current, answered, answers, answer, next, restart, wrongCategories };
}
