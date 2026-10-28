import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { AIError, toAIError } from '@/ai/client';
import type { RequiredItem } from '@/ai/schemas/production';
import { markMinimalDay, markStepDone } from '@/db/activityRepo';
import { completeChallenge, type Challenge } from '@/db/productionRepo';
import { emitAppEvent } from '@/features/app/events';
import { wordCount } from '@/features/cards/lemma';
import { currentStudyDay } from '@/features/review/reviewService';
import { strings } from '@/i18n/strings';
import { showSnackbar } from '@/stores/snackbarStore';

import { getOrCreateTodayChallenge, microChallenge } from './challengeService';
import { runCorrection } from './correctionService';
import { checkRequiredItems } from './requiredItems';

type Status = 'loading' | 'ready' | 'needsAi' | 'error';

/** Desafio do dia, micro-desafio do dia mínimo ou desafio sob medida ("Criar desafio"). */
export type ChallengeMode =
  | { kind: 'daily' }
  | { kind: 'micro' }
  | { kind: 'custom'; prompt: string; items: string[] };

export function useChallenge(mode: ChallengeMode) {
  const micro = mode.kind === 'micro';
  const custom = mode.kind === 'custom' ? mode : null;
  const daily = mode.kind === 'daily';
  const [status, setStatus] = useState<Status>(custom ? 'ready' : 'loading');
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [microItem, setMicroItem] = useState<RequiredItem | null>(null);
  const [text, setText] = useState('');
  const [correcting, setCorrecting] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (mode.kind === 'custom') return;
    let alive = true;
    const load =
      mode.kind === 'micro'
        ? microChallenge().then((item) => alive && (setMicroItem(item), setStatus('ready')))
        : getOrCreateTodayChallenge().then((c) => {
            if (!alive) return;
            setChallenge(c);
            if (c.response) setText(c.response);
            setStatus('ready');
          });
    load.catch((e: unknown) => {
      if (!alive) return;
      const err = toAIError(e);
      setError(err.messagePt);
      setStatus(e instanceof AIError && e.kind === 'notConfigured' ? 'needsAi' : 'error');
    });
    return () => {
      alive = false;
    };
  }, [mode.kind, attempt]);

  const items: RequiredItem[] = custom
    ? custom.items.map((text) => ({ text, kind: 'term' as const }))
    : micro
      ? microItem
        ? [microItem]
        : []
      : (challenge?.requiredItems ?? []);
  const checks = checkRequiredItems(text, items);
  const promptPt = custom
    ? custom.prompt
    : micro
      ? microItem
        ? strings.challenge.microPrompt
        : strings.challenge.microFallback
      : (challenge?.promptPt ?? '');

  const correct = async () => {
    const content = text.trim();
    if (!content) return;
    setCorrecting(true);
    try {
      const day = currentStudyDay();
      const { id } = await runCorrection({
        text: content,
        mode: 'challenge',
        origin: 'challenge',
        originId: daily ? day : null,
        requiredItems: items,
      });
      if (micro) await markMinimalDay(day);
      if (daily) {
        await completeChallenge(day, content, id);
        await markStepDone(day, 'challenge');
      }
      emitAppEvent('challengeCompleted');
      router.push(`/practice/correction/${id}`);
    } catch (e) {
      showSnackbar(toAIError(e).messagePt);
    } finally {
      setCorrecting(false);
    }
  };

  return {
    status,
    error,
    retry: () => {
      setStatus('loading');
      setAttempt((a) => a + 1);
    },
    challenge,
    promptPt,
    items,
    checks,
    text,
    setText,
    words: wordCount(text),
    correcting,
    correct,
  };
}
