import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Icon, IconBadge, Text, type IconName } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

const t = strings.today.firstUse;

type Props = {
  aiConfigured: boolean;
  hasNotes: boolean;
  hasReviewed: boolean;
};

type Step = { done: boolean; title: string; hint?: string; action: { label: string; icon: IconName; href: string } };

/** Primeiro uso: guia de 3 passos no lugar da sessão do dia (seção 8.1). */
export function FirstUseGuide({ aiConfigured, hasNotes, hasReviewed }: Props) {
  const th = useTheme();
  const styles = useStyles();
  const steps: Step[] = [
    {
      done: aiConfigured,
      title: t.configureAi,
      hint: t.configureAiHint,
      action: { label: t.configureAiAction, icon: 'cpu', href: '/settings/ai' },
    },
    {
      done: hasNotes,
      title: t.firstWord,
      hint: t.firstWordHint,
      action: { label: t.saveWordAction, icon: 'plus', href: '/capture' },
    },
    {
      done: hasReviewed,
      title: t.firstReview,
      action: { label: t.startReviewAction, icon: 'play', href: '/review' },
    },
  ];
  const current = steps.find((s) => !s.done);

  return (
    <Card>
      <View style={styles.head}>
        <IconBadge icon="compass" size="lg" />
        <View style={styles.headText}>
          <Text variant="heading">{t.title}</Text>
          <Text color="textMuted">{t.subtitle}</Text>
        </View>
      </View>

      <View style={styles.steps}>
        {steps.map((step, i) => (
          <View key={step.title} style={styles.step}>
            <View style={[styles.number, step.done && styles.numberDone, step === current && styles.numberCurrent]}>
              {step.done ? (
                <Icon name="check" color="onPrimary" size={th.sizes.iconSmall} />
              ) : (
                <Text variant="label" color={step === current ? 'primary' : 'textMuted'}>
                  {String(i + 1)}
                </Text>
              )}
            </View>
            <View style={styles.stepText}>
              <Text color={step.done ? 'textMuted' : 'text'}>{step.title}</Text>
              {step.hint && step === current && (
                <Text variant="caption" color="textMuted">
                  {step.hint}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {current && (
        <Button
          label={current.action.label}
          icon={current.action.icon}
          size="main"
          onPress={() => router.push(current.action.href)}
        />
      )}
    </Card>
  );
}

const useStyles = makeStyles((th) => ({
  head: { flexDirection: 'row', alignItems: 'center', gap: th.spacing.lg },
  headText: { flex: 1, gap: th.spacing.xs / 2 },
  steps: { gap: th.spacing.md },
  step: { flexDirection: 'row', alignItems: 'center', gap: th.spacing.md },
  number: {
    width: th.sizes.badge.sm,
    height: th.sizes.badge.sm,
    borderRadius: th.radii.full,
    borderWidth: 1,
    borderColor: th.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberCurrent: { borderColor: th.colors.primary, borderWidth: 2 },
  numberDone: { backgroundColor: th.colors.rateGood, borderColor: th.colors.rateGood },
  stepText: { flex: 1 },
}));
