import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button, Card, Icon, IconBadge, Text } from '@/components/ui';
import type { SessionStepInfo } from '@/features/today/sessionSteps';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

const s = strings.today.session;

type Props = { steps: SessionStepInfo[] };

/** "Sua sessão de hoje": etapas, Começar e "Só tenho 2 minutos" (seção 8.1). */
export function SessionCard({ steps }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const pending = steps.filter((step) => !step.done);
  const allDone = pending.length === 0;
  const started = steps.some((step) => step.done);

  if (allDone) {
    return (
      <Card>
        <View style={styles.doneRow}>
          <IconBadge icon="moon" color="rateGood" size="lg" />
          <Text variant="heading" style={styles.flex}>
            {s.allDone}
          </Text>
        </View>
        <Button label={s.reviewMore} variant="ghost" icon="plus" onPress={() => router.push('/review?more=1')} />
      </Card>
    );
  }

  return (
    <Card title={s.title}>
      <View style={styles.steps}>
        {steps.map((step) => (
          <Pressable
            key={step.key}
            onPress={() => router.push(step.href)}
            accessibilityRole="button"
            accessibilityLabel={`${step.label}, ${step.done ? s.stepDone : step.meta}`}
            style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          >
            <View style={[styles.circle, step.done && styles.circleDone]}>
              {step.done && <Icon name="check" color="onPrimary" size={theme.sizes.iconSmall} />}
            </View>
            <Text color={step.done ? 'textMuted' : 'text'} style={styles.flex}>
              {step.label}
            </Text>
            <Text variant="caption" color="textMuted">
              {step.meta}
            </Text>
          </Pressable>
        ))}
      </View>
      <Button
        label={started ? s.continue : s.start}
        icon="play"
        size="main"
        onPress={() => router.push(pending[0].href)}
      />
      <Button label={s.minimal} variant="ghost" icon="clock" onPress={() => router.push('/review?minimal=1')} />
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.lg },
  steps: { gap: t.spacing.xs },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    minHeight: t.sizes.touchTarget,
    borderRadius: t.radii.md,
    marginHorizontal: -t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
  circle: {
    width: t.sizes.badge.sm - t.spacing.sm,
    height: t.sizes.badge.sm - t.spacing.sm,
    borderRadius: t.radii.full,
    borderWidth: 2,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleDone: { backgroundColor: t.colors.rateGood, borderColor: t.colors.rateGood },
}));
