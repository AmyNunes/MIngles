import { router, Stack } from 'expo-router';

import { ListGroup, ListRow, Screen } from '@/components/ui';
import { useSettingsSummary } from '@/features/settings/useSettingsSummary';
import { strings } from '@/i18n/strings';

const s = strings.settings;

export default function SettingsScreen() {
  const summary = useSettingsSummary();

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: s.title }} />
      <ListGroup>
        <ListRow
          icon="bell"
          iconColor="rateHard"
          title={s.rows.notifications}
          onPress={() => router.push('/settings/notifications')}
        />
      </ListGroup>
      <ListGroup>
        <ListRow icon="cpu" title={s.rows.ai} value={summary.ai} onPress={() => router.push('/settings/ai')} />
        <ListRow
          icon="user"
          iconColor="typeProduction"
          title={s.rows.profile}
          value={summary.profile}
          onPress={() => router.push('/settings/profile')}
        />
        <ListRow icon="book" iconColor="typeCloze" title={s.rows.study} onPress={() => router.push('/settings/study')} />
      </ListGroup>
      <ListGroup>
        <ListRow icon="move" iconColor="typeError" title={s.rows.gestures} onPress={() => router.push('/settings/gestures')} />
        <ListRow icon="volume-2" iconColor="rateGood" title={s.rows.voice} onPress={() => router.push('/settings/voice')} />
        <ListRow
          icon="moon"
          iconColor="rateEasy"
          title={s.rows.appearance}
          value={summary.appearance}
          onPress={() => router.push('/settings/appearance')}
        />
      </ListGroup>
      <ListGroup>
        <ListRow icon="database" iconColor="typeContext" title={s.rows.data} onPress={() => router.push('/settings/data')} />
      </ListGroup>
    </Screen>
  );
}
