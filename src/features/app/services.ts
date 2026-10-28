import { registerProduction } from '@/features/production/register';
import { registerProgress } from '@/features/progress/register';
import { registerOfflineQueueService } from '@/features/reader/offlineQueue';
import { registerRehearsals } from '@/features/rehearsals/register';
import { registerNotificationService } from '@/notifications/service';
import { registerWidgetService } from '@/widget/register';

let registered = false;

/** Registra os serviços de cada fase (uma vez, na abertura do app). */
export function registerServices(): void {
  if (registered) return;
  registered = true;
  registerProduction();
  registerProgress();
  registerRehearsals();
  registerNotificationService();
  registerOfflineQueueService();
  registerWidgetService();
}
