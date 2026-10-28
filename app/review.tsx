import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveReview } from '@/components/review/ActiveReview';
import { SessionSummary } from '@/components/review/SessionSummary';
import { EmptyState, ErrorState, Notice, Skeleton } from '@/components/ui';
import { sessionSummary, useReviewSession } from '@/features/review/sessionStore';
import { useNextSessionStep } from '@/features/today/useNextSessionStep';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

export default function ReviewScreen() {
  const styles = useStyles();
  const { minimal, more } = useLocalSearchParams<{ minimal?: string; more?: string }>();
  const status = useReviewSession((s) => s.status);
  const returnMode = useReviewSession((s) => s.returnMode);
  const queueLength = useReviewSession((s) => s.queue.length);
  const start = useReviewSession((s) => s.start);
  const isMinimal = minimal === '1';
  const sessionNext = useNextSessionStep(status === 'done' && !isMinimal);
  // Dia mínimo: 5 cards + 1 micro-desafio de uma frase.
  const nextStep = isMinimal
    ? { label: strings.today.session.micro, onPress: () => router.replace('/practice/challenge?micro=1') }
    : sessionNext;

  useEffect(() => {
    void start({ minimal: minimal === '1', more: more === '1' });
    return () => useReviewSession.getState().reset();
  }, [minimal, more, start]);

  if (status === 'done') {
    const { history, startedAt } = useReviewSession.getState();
    return <SessionSummary minimal={minimal === '1'} nextStep={nextStep} {...sessionSummary({ history, startedAt })} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {(status === 'loading' || status === 'idle') && (
        <View style={styles.center}>
          <Skeleton height={420} radius="lg" />
        </View>
      )}
      {status === 'error' && (
        <View style={styles.center}>
          <ErrorState onRetry={() => void start({ minimal: minimal === '1' })} />
        </View>
      )}
      {status === 'empty' && (
        <View style={styles.center}>
          <EmptyState
            icon="check-circle"
            message={strings.review.empty.message}
            action={{ label: strings.review.empty.action, onPress: () => router.back() }}
          />
        </View>
      )}
      {status === 'active' && (
        <>
          {returnMode && (
            <View style={styles.banner}>
              <Notice icon="coffee">{strings.today.returnBanner(queueLength)}</Notice>
            </View>
          )}
          <ActiveReview />
        </>
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  safe: { flex: 1, backgroundColor: t.colors.bg },
  center: { flex: 1, justifyContent: 'center', padding: t.spacing.screen },
  banner: { paddingHorizontal: t.spacing.screen, paddingTop: t.spacing.sm },
}));
