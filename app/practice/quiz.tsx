import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  IconBadge,
  Notice,
  ProgressBar,
  Screen,
  Skeleton,
  Text,
  TextField,
} from '@/components/ui';
import { categoryLabel } from '@/features/errors/taxonomy';
import { isCorrectAnswer, useQuiz } from '@/features/production/useQuiz';
import { strings } from '@/i18n/strings';
import { makeStyles, TINT, useTheme, withAlpha } from '@/theme';

const q = strings.quiz;

export default function QuizScreen() {
  const theme = useTheme();
  const styles = useStyles();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const quiz = useQuiz(category);
  const [typed, setTyped] = useState('');
  const title = <Stack.Screen options={{ title: category ? `${q.title} · ${categoryLabel(category)}` : q.title }} />;

  if (quiz.status === 'loading') {
    return (
      <Screen edges={[]}>
        {title}
        <Text color="textMuted">{q.preparing}</Text>
        <Skeleton height={200} radius="lg" />
      </Screen>
    );
  }
  if (quiz.status === 'empty' || quiz.status === 'needsAi') {
    return (
      <Screen edges={[]}>
        {title}
        {quiz.status === 'empty' ? (
          <EmptyState icon="target" message={q.empty} action={{ label: strings.journal.title, onPress: () => router.replace('/practice/journal') }} />
        ) : (
          <EmptyState icon="cpu" message={strings.ai.errors.notConfigured} action={{ label: strings.ai.configure, onPress: () => router.push('/settings/ai') }} />
        )}
      </Screen>
    );
  }
  if (quiz.status === 'error') {
    return (
      <Screen edges={[]}>
        {title}
        <ErrorState message={quiz.error} onRetry={quiz.restart} />
      </Screen>
    );
  }

  if (quiz.status === 'done') {
    const score = quiz.answers.filter((a) => a.correct).length;
    return (
      <Screen
        edges={['bottom']}
        footer={
          <View style={styles.footer}>
            <Button label={q.again} icon="refresh-cw" size="main" onPress={quiz.restart} />
            <Button label={q.back} variant="ghost" onPress={() => router.back()} />
          </View>
        }
      >
        {title}
        <View style={styles.hero}>
          <IconBadge icon="award" color="rateGood" size="lg" />
          <Text variant="title" align="center">
            {q.score(score, quiz.questions.length)}
          </Text>
        </View>
        {quiz.wrongCategories.length ? (
          <Card title={q.reinforce}>
            <View style={styles.chips}>
              {quiz.wrongCategories.map((c) => (
                <Chip key={c} label={categoryLabel(c)} icon="target" onPress={() => router.push(`/errors/${c}`)} />
              ))}
            </View>
          </Card>
        ) : (
          <Notice tone="success">{q.allGood}</Notice>
        )}
      </Screen>
    );
  }

  const current = quiz.current;
  if (!current) return null;
  const answered = quiz.answered;
  const options = current.options?.length ? current.options : null;

  return (
    <Screen
      edges={['bottom']}
      footer={
        answered ? (
          <Button
            label={quiz.index + 1 < quiz.questions.length ? q.next : q.finish}
            icon="arrow-right"
            size="main"
            onPress={() => {
              setTyped('');
              void quiz.next();
            }}
          />
        ) : !options ? (
          <Button label={q.check} icon="check" size="main" disabled={!typed.trim()} onPress={() => quiz.answer(typed)} />
        ) : undefined
      }
    >
      {title}
      <View style={styles.progressRow}>
        <View style={styles.flex}>
          <ProgressBar progress={quiz.index / quiz.questions.length} />
        </View>
        <Text variant="label" color="textMuted">
          {q.counter(quiz.index + 1, quiz.questions.length)}
        </Text>
      </View>

      <Card>
        <Text variant="label" color="textMuted">
          {q.types[current.type]}
        </Text>
        <Text variant="cardMain">{current.promptEn}</Text>
      </Card>

      {options ? (
        <View style={styles.options}>
          {options.map((option) => {
            const isAnswer = isCorrectAnswer(option, current.answer);
            const chosen = answered?.given === option;
            const color = answered && isAnswer ? theme.colors.rateGood : answered && chosen ? theme.colors.rateAgain : null;
            return (
              <Pressable
                key={option}
                disabled={Boolean(answered)}
                onPress={() => quiz.answer(option)}
                accessibilityRole="button"
                accessibilityState={{ selected: chosen, disabled: Boolean(answered) }}
                accessibilityLabel={option}
                style={({ pressed }) => [
                  styles.option,
                  color && { borderColor: color, backgroundColor: withAlpha(color, TINT) },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.flex}>{option}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <TextField label={q.answerPlaceholder} value={typed} onChangeText={setTyped} editable={!answered} autoCapitalize="none" />
      )}

      {answered && (
        <Notice tone={answered.correct ? 'success' : 'error'}>
          <Text variant="label">{answered.correct ? q.correct : q.wrong(current.answer)}</Text>
          {current.explanationPt ? <Text>{current.explanationPt}</Text> : null}
        </Notice>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1 },
  footer: { gap: t.spacing.sm },
  hero: { alignItems: 'center', gap: t.spacing.md, paddingTop: t.spacing.xxxl },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  options: { gap: t.spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: t.sizes.buttonHeightMain,
    paddingHorizontal: t.spacing.lg,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  pressed: { backgroundColor: t.colors.surfaceAlt },
}));
