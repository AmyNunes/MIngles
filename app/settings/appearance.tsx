import { Stack } from 'expo-router';

import { Card, Screen, Segmented, Text } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { useSettings } from '@/stores/settingsStore';
import type { ThemePreference } from '@/theme';

const a = strings.settings.appearance;

const THEME_OPTIONS = [
  { value: 'system', label: a.themeSystem },
  { value: 'light', label: a.themeLight },
  { value: 'dark', label: a.themeDark },
] as const satisfies readonly { value: ThemePreference; label: string }[];

const SIZE_OPTIONS = [
  { value: 'sm', label: a.sizeSmall },
  { value: 'md', label: a.sizeMedium },
  { value: 'lg', label: a.sizeLarge },
] as const;

export default function AppearanceScreen() {
  const appearance = useSettings((s) => s.appearance);
  const update = useSettings((s) => s.update);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: a.title }} />
      <Card title={a.theme}>
        <Segmented
          accessibilityLabel={a.theme}
          options={THEME_OPTIONS}
          value={appearance.themePreference}
          onChange={(themePreference) => update('appearance', { themePreference })}
        />
        <Text variant="caption" color="textMuted">
          {a.themeHint}
        </Text>
      </Card>
      <Card title={a.cardText}>
        <Segmented
          accessibilityLabel={a.cardText}
          options={SIZE_OPTIONS}
          value={appearance.cardTextSize}
          onChange={(cardTextSize) => update('appearance', { cardTextSize })}
        />
      </Card>
    </Screen>
  );
}
