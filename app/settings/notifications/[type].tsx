import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { NotificationPreview } from '@/components/notifications/NotificationPreview';
import { TypeSettingsFields } from '@/components/notifications/TypeSettingsFields';
import { Button, EmptyState, ListGroup, ListRow, Notice, Screen, Toggle } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { notificationContent } from '@/notifications/content';
import { isInQuietHours } from '@/notifications/plan';
import { notificationPermission } from '@/notifications/permissions';
import { sendTestNotification } from '@/notifications/scheduler';
import { NOTIFICATION_TYPES, normalizedOrder, urlFor, type NotificationSettings, type NotificationType } from '@/notifications/types';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles } from '@/theme';

const d = strings.notifications.detail;
const c = strings.notifications.center;
const a = strings.notifications.actions;

const SAMPLE = {
  count: 24,
  items: ['though', 'get used to'],
  reviews: 132,
  topCategory: 'Preposições',
  title: 'reunião com cliente',
  tomorrow: true,
};

const ACTIONS: Record<NotificationType, string[]> = {
  review: [a.reviewNow, a.later],
  challenge: [a.doNow],
  journal: [a.write],
  think: [a.answer],
  weekly: [a.see],
  rehearsal: [a.rehearse],
  comeback: [a.start],
};

/** Horário fixo do tipo (para avisar se cai no horário silencioso). */
function fixedTime(type: NotificationType, s: NotificationSettings): string | null {
  if (type === 'review' || type === 'challenge' || type === 'journal' || type === 'weekly' || type === 'comeback') {
    return s[type].time;
  }
  return null;
}

export default function NotificationTypeScreen() {
  const styles = useStyles();
  const { type } = useLocalSearchParams<{ type: string }>();
  const settings = useSettings((s) => s.notifications);
  const update = useSettings((s) => s.update);

  if (!(NOTIFICATION_TYPES as readonly string[]).includes(type)) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="bell-off" message={strings.common.genericError} />
      </Screen>
    );
  }
  const t = type as NotificationType;
  const name = strings.notifications.types[t];
  const patchType = (patch: Record<string, unknown>) =>
    update('notifications', { [t]: { ...settings[t], ...patch } } as Partial<NotificationSettings>);

  const time = fixedTime(t, settings);
  const [h, m] = (time ?? '00:00').split(':').map(Number);
  const inQuiet = time != null && isInQuietHours(new Date(2026, 0, 1, h, m), settings.quiet);
  const preview = notificationContent(t, new Date(), SAMPLE);

  const order = normalizedOrder(settings.order);
  const index = order.indexOf(t);
  const move = (delta: number) => {
    const next = [...order];
    const target = Math.max(0, Math.min(order.length - 1, index + delta));
    next.splice(index, 1);
    next.splice(target, 0, t);
    void update('notifications', { order: next });
  };

  const sendTest = async () => {
    const permission = await notificationPermission();
    if (permission !== 'granted') {
      showSnackbar(permission === 'unsupported' ? strings.notifications.center.unsupported : d.blocked);
      return;
    }
    await sendTestNotification({ type: t, url: urlFor(t), ...preview });
    showSnackbar(d.testSent);
  };

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: name }} />
      <ListGroup>
        <ListRow
          title={d.enabled}
          right={<Toggle accessibilityLabel={name} value={settings[t].enabled} onValueChange={(enabled) => patchType({ enabled })} />}
        />
      </ListGroup>

      <TypeSettingsFields type={t} settings={settings} onChange={patchType} />
      {inQuiet && <Notice tone="warning">{d.quietWarning}</Notice>}

      <NotificationPreview title={preview.title} body={preview.body} actions={ACTIONS[t]} />
      <Button label={d.sendTest} icon="send" variant="secondary" onPress={() => void sendTest()} />

      <View style={styles.moves}>
        <Button label={c.moveUp} icon="arrow-up" variant="ghost" disabled={index === 0} onPress={() => move(-1)} />
        <Button label={c.moveDown} icon="arrow-down" variant="ghost" disabled={index === order.length - 1} onPress={() => move(1)} />
      </View>
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  moves: { flexDirection: 'row', justifyContent: 'center', gap: t.spacing.md },
}));
