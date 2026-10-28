import { router, Stack } from 'expo-router';

import { Card, ListGroup, ListRow, Screen, Segmented, Text, Toggle } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { useSettings } from '@/stores/settingsStore';
import { showSnackbar } from '@/stores/snackbarStore';

const g = strings.settings.gestures;

const SENSITIVITY = [
  { value: 'low', label: g.sensitivityLow },
  { value: 'medium', label: g.sensitivityMedium },
  { value: 'high', label: g.sensitivityHigh },
] as const;

export default function GestureSettingsScreen() {
  const gestures = useSettings((s) => s.gestures);
  const update = useSettings((s) => s.update);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: g.title }} />

      <ListGroup>
        <ListRow
          icon="move"
          title={g.enabled}
          subtitle={g.enabledHint}
          right={<Toggle accessibilityLabel={g.enabled} value={gestures.enabled} onValueChange={(enabled) => update('gestures', { enabled })} />}
        />
        <ListRow
          icon="repeat"
          iconColor="typeProduction"
          title={g.leftHanded}
          subtitle={g.leftHandedHint}
          right={<Toggle accessibilityLabel={g.leftHanded} value={gestures.leftHanded} onValueChange={(leftHanded) => update('gestures', { leftHanded })} />}
        />
        <ListRow
          icon="smartphone"
          iconColor="rateEasy"
          title={g.haptics}
          subtitle={g.hapticsHint}
          right={<Toggle accessibilityLabel={g.haptics} value={gestures.haptics} onValueChange={(haptics) => update('gestures', { haptics })} />}
        />
      </ListGroup>

      <Card title={g.sensitivity}>
        <Segmented
          accessibilityLabel={g.sensitivity}
          options={SENSITIVITY}
          value={gestures.sensitivity}
          onChange={(sensitivity) => update('gestures', { sensitivity })}
        />
        <Text variant="caption" color="textMuted">
          {g.sensitivityHint}
        </Text>
      </Card>

      <ListGroup>
        <ListRow icon="map" iconColor="typeCloze" title={g.map} onPress={() => router.push('/settings/gesture-map')} />
        <ListRow
          icon="help-circle"
          iconColor="typeError"
          title={g.seeGuides}
          onPress={() => {
            void update('gestures', { coachMarksSeen: [] });
            showSnackbar(g.guidesReset);
          }}
        />
      </ListGroup>
    </Screen>
  );
}
