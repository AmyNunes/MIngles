import { upcomingRehearsals } from '@/db/rehearsalsRepo';
import { DAY } from '@/lib/dates';
import { enableNotificationTypes, registerPlanProvider } from '@/notifications/scheduler';

let registered = false;

/** Fase 7: lembretes dos ensaios de situações (dia anterior e/ou 3 horas antes). */
export function registerRehearsals(): void {
  if (registered) return;
  registered = true;
  enableNotificationTypes(['rehearsal']);
  registerPlanProvider(async (now) => {
    // Até 8 dias à frente: o lembrete "dia anterior" de um evento no 8º dia cai dentro da janela de 7.
    const items = await upcomingRehearsals(now.toISOString(), new Date(now.getTime() + 8 * DAY).toISOString());
    return { rehearsals: items.map((r) => ({ id: r.id, title: r.title, eventAt: new Date(r.eventAt) })) };
  });
}
