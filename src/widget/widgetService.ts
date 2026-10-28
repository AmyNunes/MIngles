import { Platform, TurboModuleRegistry } from 'react-native';
import { z } from 'zod';

import { getCardsWithNotes } from '@/db/cardsRepo';
import { readSetting, writeSetting } from '@/db/settingsRepo';
import { computeTodayQueue, recordRating } from '@/features/review/reviewService';
import { parseJsonWith } from '@/lib/json';
import { previewRatings } from '@/srs/fsrs';
import { useSettings } from '@/stores/settingsStore';

import { EMPTY_WIDGET_STATE, pickWidgetCard, widgetViewOf, type WidgetState, type WidgetView } from './widgetModel';

export const WIDGET_NAME = 'ReviewWidget';
const STATE_KEY = 'widgetState';

/** O módulo nativo do widget só existe no app instalado (development build/APK), não no Expo Go. */
export function isWidgetAvailable(): boolean {
  return Platform.OS === 'android' && TurboModuleRegistry.get('AndroidWidget') != null;
}

const stateSchema = z.object({
  cardId: z.string().nullable().catch(null),
  flipped: z.boolean().catch(false),
  lastRatedId: z.string().nullable().catch(null),
});

async function readState(): Promise<WidgetState> {
  return parseJsonWith(await readSetting(STATE_KEY), stateSchema, EMPTY_WIDGET_STATE);
}

/** O widget pode rodar com o app fechado: carrega as configurações se ainda não carregou. */
async function ensureSettings(): Promise<void> {
  if (!useSettings.getState().loaded) await useSettings.getState().load();
}

/** Card atual do widget (o mesmo de antes, se ainda estiver na fila de hoje). */
export async function loadWidgetView(): Promise<WidgetView> {
  await ensureSettings();
  const queue = await computeTodayQueue();
  const ids = queue.cards.map((c) => c.id);
  const state = pickWidgetCard(ids, await readState());
  await writeSetting(STATE_KEY, state);
  const [card] = state.cardId ? await getCardsWithNotes([state.cardId]) : [];
  return widgetViewOf(card ?? null, state.flipped, ids.length);
}

export async function flipWidgetCard(cardId: string): Promise<void> {
  const state = await readState();
  if (state.cardId === cardId) await writeSetting(STATE_KEY, { ...state, flipped: true });
}

/** Errei/Bom no widget: grava como uma revisão normal e passa para o próximo card. */
export async function rateWidgetCard(cardId: string, rating: 'again' | 'good'): Promise<void> {
  await ensureSettings();
  const [card] = await getCardsWithNotes([cardId]);
  if (!card) return;
  const now = new Date();
  const preview = previewRatings(card, now, useSettings.getState().study.retention);
  await recordRating(card, rating, preview[rating].next, now, 0);
  await writeSetting(STATE_KEY, { cardId: null, flipped: false, lastRatedId: cardId });
}
