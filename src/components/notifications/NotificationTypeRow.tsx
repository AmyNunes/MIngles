import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { IconBadge, Text, Toggle } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { TYPE_ICONS, typeSummary } from '@/notifications/summary';
import type { NotificationSettings, NotificationType } from '@/notifications/types';
import { makeStyles } from '@/theme';

type Props = {
  type: NotificationType;
  settings: NotificationSettings;
  handle: ReactNode;
  onToggle: (enabled: boolean) => void;
};

/** "≡ 📚 Revisão do dia   08:30 · S T Q Q S S D   [●]" — toque abre o detalhe. */
export function NotificationTypeRow({ type, settings, handle, onToggle }: Props) {
  const styles = useStyles();
  const name = strings.notifications.types[type];
  const meta = TYPE_ICONS[type];

  return (
    <View style={styles.row}>
      {handle}
      <Pressable
        onPress={() => router.push(`/settings/notifications/${type}`)}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${typeSummary(type, settings)}`}
        accessibilityHint={strings.notifications.center.openDetail}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}
      >
        <IconBadge icon={meta.icon} color={meta.color} size="sm" />
        <View style={styles.texts}>
          <Text numberOfLines={1}>{name}</Text>
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {typeSummary(type, settings)}
          </Text>
        </View>
      </Pressable>
      <Toggle accessibilityLabel={name} value={settings[type].enabled} onValueChange={onToggle} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: t.spacing.md },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, alignSelf: 'stretch' },
  pressed: { opacity: t.opacity.pressed },
  texts: { flex: 1 },
}));
