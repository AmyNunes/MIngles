import { router } from 'expo-router';
import { useRef, useState } from 'react';

import { toAIError } from '@/ai/client';
import { conversationTurn } from '@/ai/functions/production';
import { insertCorrection } from '@/db/correctionsRepo';
import {
  createConversation,
  endConversation,
  saveConversationMessages,
  type ConversationMessage,
} from '@/db/productionRepo';
import { addWordsWritten } from '@/db/activityRepo';
import { wordCount } from '@/features/cards/lemma';
import { currentStudyDay } from '@/features/review/reviewService';
import { strings } from '@/i18n/strings';
import { showSnackbar } from '@/stores/snackbarStore';

import { applyEdits } from './errorCards';

const c = strings.conversation;

/** Há mensagens minhas depois da última resposta da IA? */
const awaitingReply = (messages: ConversationMessage[]) => messages.at(-1)?.role === 'user';

/**
 * Conversa por texto (seção 8.5): a IA responde no meu nível e as correções não interrompem.
 * Dá para mandar mensagens enquanto a IA ainda responde: elas entram na fila e
 * a IA responde a elas logo em seguida.
 */
export function useConversation() {
  const [id, setId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [messages, setMessagesState] = useState<ConversationMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  /** Cópia sempre atual das mensagens (as respostas da IA chegam depois de outras mensagens). */
  const latest = useRef<ConversationMessage[]>([]);
  const busy = useRef(false);

  const setMessages = (next: ConversationMessage[]) => {
    latest.current = next;
    setMessagesState(next);
  };

  /** Pede respostas à IA até não sobrar mensagem minha sem resposta. */
  const replyLoop = async (conversationId: string, chosenTopic: string) => {
    if (busy.current) return;
    busy.current = true;
    setThinking(true);
    setError(null);
    try {
      do {
        const history = latest.current;
        const forAi = history.length ? history : [{ role: 'user' as const, text: c.starter, corrections: [] }];
        const result = await conversationTurn({ topic: chosenTopic, history: forAi });
        const answered = [...history];
        const last = answered.at(-1);
        if (last?.role === 'user') answered[answered.length - 1] = { ...last, corrections: result.corrections };
        answered.push({ role: 'assistant', text: result.replyEn, corrections: [] });
        // o que escrevi enquanto a IA pensava vem depois da resposta
        const next = [...answered, ...latest.current.slice(history.length)];
        setMessages(next);
        await saveConversationMessages(conversationId, next);
      } while (awaitingReply(latest.current));
    } catch (e) {
      setError(toAIError(e).messagePt);
    } finally {
      busy.current = false;
      setThinking(false);
    }
  };

  const start = async (chosenTopic: string) => {
    const newId = await createConversation(chosenTopic);
    setId(newId);
    setTopic(chosenTopic);
    setMessages([]);
    await replyLoop(newId, chosenTopic);
  };

  /** Roleplay de um ensaio: a outra pessoa já abre a conversa (sem chamar a IA). */
  const startRoleplay = async (roleplayTopic: string, opening: string) => {
    const newId = await createConversation(roleplayTopic);
    const first: ConversationMessage[] = [{ role: 'assistant', text: opening, corrections: [] }];
    setId(newId);
    setTopic(roleplayTopic);
    setMessages(first);
    await saveConversationMessages(newId, first);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || !id) return;
    setMessages([...latest.current, { role: 'user', text: content, corrections: [] }]);
    await addWordsWritten(currentStudyDay(), wordCount(content));
    if (!busy.current) await saveConversationMessages(id, latest.current);
    await replyLoop(id, topic);
  };

  const retry = () => id && void replyLoop(id, topic);

  /** "Encerrar": junta as correções numa correção e abre "O que aprendi". */
  const end = async (onEnded?: () => Promise<void>) => {
    if (!id) return;
    const mine = latest.current.filter((m) => m.role === 'user');
    if (!mine.length) {
      showSnackbar(c.noMessages);
      return;
    }
    setEnding(true);
    try {
      const original = mine.map((m) => m.text).join('\n');
      const edits = mine.flatMap((m) => m.corrections);
      const correctionId = await insertCorrection({
        origin: 'conversation',
        originId: id,
        original,
        correctedText: applyEdits(original, edits),
        naturalVersion: '',
        edits,
        usedRequiredItems: [],
      });
      await endConversation(id, correctionId);
      await onEnded?.();
      router.replace(`/practice/correction/${correctionId}?tab=learned`);
    } catch {
      showSnackbar(strings.common.genericError);
      setEnding(false);
    }
  };

  return { started: id != null, topic, messages, thinking, error, ending, start, startRoleplay, send, retry, end };
}
