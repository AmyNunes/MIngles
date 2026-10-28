import { Stack } from 'expo-router';

import { Button, Card, Screen, Segmented, Stepper } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { speak } from '@/lib/speech';
import { useSettings } from '@/stores/settingsStore';

const v = strings.settings.voice;

const ACCENTS = [
  { value: 'en-US', label: v.accentUs },
  { value: 'en-GB', label: v.accentUk },
] as const;

export default function VoiceSettingsScreen() {
  const voice = useSettings((s) => s.voice);
  const update = useSettings((s) => s.update);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: v.title }} />
      <Card title={v.rate}>
        <Stepper
          accessibilityLabel={v.rate}
          value={voice.rate}
          min={0.5}
          max={1.25}
          step={0.05}
          format={(r) => `${r.toFixed(2).replace('.', ',')}×`}
          onChange={(rate) => update('voice', { rate })}
        />
      </Card>
      <Card title={v.accent}>
        <Segmented accessibilityLabel={v.accent} options={ACCENTS} value={voice.accent} onChange={(accent) => update('voice', { accent })} />
      </Card>
      <Button label={v.test} icon="volume-2" variant="secondary" onPress={() => speak(v.sample)} />
    </Screen>
  );
}
