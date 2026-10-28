import { Stack } from 'expo-router';

import { ListGroup, ListRow, Screen, Text, type IconName } from '@/components/ui';
import { strings } from '@/i18n/strings';

const m = strings.settings.gestureMap;

/** Versão visual da seção 6: cada gesto e seu equivalente visível. */
export default function GestureMapScreen() {
  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: m.title }} />
      <Text color="textMuted">{m.intro}</Text>
      {m.sections.map((section) => (
        <ListGroup key={section.title} title={section.title}>
          {section.items.map((item) => (
            <ListRow
              key={item.gesture}
              icon={item.icon as IconName}
              title={`${item.gesture} → ${item.action}`}
              subtitle={item.alt ? m.alternative(item.alt) : undefined}
            />
          ))}
        </ListGroup>
      ))}
    </Screen>
  );
}
