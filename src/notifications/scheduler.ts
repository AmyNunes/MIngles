import { getActivity } from '@/db/activityRepo';
import {
  deleteFutureNotificationLogs,
  dueTimesUntil,
  insertNotificationLog,
  lastSentOfType,
} from '@/db/notificationLogRepo';
import { DAY, studyDayKey } from '@/lib/dates';
import { newId } from '@/lib/ids';
import { useSettings } from '@/stores/settingsStore';

import { categoryId, ensureChannelsAndCategories } from './channels';
import { getNotifications } from './native';
import { HORIZON_DAYS, planNotifications, type PlanInput, type PlannedNotification } from './plan';
import { VISIBLE_NOTIFICATION_TYPES, type NotificationType } from './types';

/** Partes da entrada do planejador que outras fases fornecem (desafio, ensaios, resumo…). */
type PlanProvider = (now: Date) => Promise<Partial<PlanInput>>;
const providers: PlanProvider[] = [];
let visibleTypes: NotificationType[] = [...VISIBLE_NOTIFICATION_TYPES];

export function registerPlanProvider(provider: PlanProvider): void {
  providers.push(provider);
}

/** Cada fase libera os tipos que já têm destino no app. */
export function enableNotificationTypes(types: NotificationType[]): void {
  visibleTypes = [...new Set([...visibleTypes, ...types])];
}

export function visibleNotificationTypes(): NotificationType[] {
  return visibleTypes;
}

/** Quantos cards estarão esperando num horário: revisões vencidas + novos do dia, com os limites. */
async function reviewCounter(now: Date): Promise<(at: Date) => number> {
  const study = useSettings.getState().study;
  const until = new Date(now.getTime() + (HORIZON_DAYS + 1) * DAY).toISOString();
  const rows = await dueTimesUntil(until);
  const reviewDues = rows.filter((r) => r.state !== 0).map((r) => new Date(r.due).getTime());
  const newCount = rows.filter((r) => r.state === 0).length;
  return (at) => {
    const due = reviewDues.filter((t) => t <= at.getTime()).length;
    return Math.min(study.maxReviewsPerDay, due) + Math.min(study.newPerDay, newCount);
  };
}

async function gatherInput(now: Date): Promise<PlanInput> {
  const { notifications, study } = useSettings.getState();
  const day = studyDayKey(now, study.rolloverHour);
  const [reviewCountAt, activity, lastComeback] = await Promise.all([
    reviewCounter(now),
    getActivity(day),
    lastSentOfType('comeback', now.toISOString()),
  ]);
  let input: PlanInput = {
    now,
    settings: notifications,
    visibleTypes,
    reviewCountAt,
    doneToday: {
      review: activity.sessionSteps.review === 'done',
      challenge: activity.sessionSteps.challenge === 'done',
      journal: activity.sessionSteps.journal === 'done',
    },
    lastComebackAt: lastComeback ? new Date(lastComeback) : null,
    rehearsals: [],
  };
  for (const provider of providers) {
    try {
      const extra = await provider(now);
      const doneToday = { ...input.doneToday };
      for (const [type, done] of Object.entries(extra.doneToday ?? {})) {
        const key = type as keyof typeof doneToday;
        doneToday[key] = Boolean(doneToday[key] || done);
      }
      input = { ...input, ...extra, doneToday };
    } catch {
      // um provedor com erro não impede o resto do agendamento
    }
  }
  return input;
}

async function schedule(p: PlannedNotification): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const logId = newId();
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: p.title,
      body: p.body,
      data: { url: p.url, type: p.type, logId },
      categoryIdentifier: categoryId(p.type),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: p.at, channelId: p.type },
  });
  await insertNotificationLog({
    id: logId,
    type: p.type,
    scheduledFor: p.at.toISOString(),
    notificationId,
    openedAt: null,
  });
}

/** Cancela e reagenda os próximos 7 dias (seção 9.4). */
export async function rescheduleAll(): Promise<number> {
  const Notifications = getNotifications();
  if (!Notifications) return 0;
  const now = new Date();
  const permission = await Notifications.getPermissionsAsync();
  await Notifications.cancelAllScheduledNotificationsAsync();
  await deleteFutureNotificationLogs(now.toISOString());
  if (!permission.granted || !useSettings.getState().notifications.enabled) return 0;

  await ensureChannelsAndCategories();
  const plan = planNotifications(await gatherInput(now));
  for (const p of plan) await schedule(p);
  return plan.length;
}

let timer: ReturnType<typeof setTimeout> | null = null;
let running: Promise<unknown> = Promise.resolve();
const DEBOUNCE_MS = 800;

/** Pede um reagendamento (agrupa vários pedidos seguidos num só). */
export function requestReschedule(): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    running = running.then(() => rescheduleAll()).catch(() => 0);
  }, DEBOUNCE_MS);
}

/** "Enviar teste agora": mostra a notificação em seguida (sem entrar no histórico). */
export async function sendTestNotification(p: Omit<PlannedNotification, 'at'>): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  await ensureChannelsAndCategories();
  await Notifications.scheduleNotificationAsync({
    content: { title: p.title, body: p.body, data: { url: p.url, type: p.type }, categoryIdentifier: categoryId(p.type) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, channelId: p.type },
  });
}

/** "Mais tarde (+1 h)": agenda de novo o mesmo aviso. Funciona também em segundo plano. */
export async function snooze(content: { title?: string | null; body?: string | null; data?: Record<string, unknown> }, minutes = 60): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  const type = (content.data?.type as NotificationType | undefined) ?? 'review';
  await ensureChannelsAndCategories();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: content.title ?? '',
      body: content.body ?? '',
      data: { ...content.data, logId: undefined },
      categoryIdentifier: categoryId(type),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: Date.now() + minutes * 60_000, channelId: type },
  });
}
