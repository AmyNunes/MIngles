import { router } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Chip, ErrorState, IconBadge, ListGroup, ListRow, Screen, ScreenHeader, Skeleton, Text } from '@/components/ui';
import { categoryLabel } from '@/features/errors/taxonomy';
import { usePracticeHub } from '@/features/production/usePracticeHub';
import { strings } from '@/i18n/strings';
import { formatDayMonth } from '@/lib/dates';
import { makeStyles } from '@/theme';

const p = strings.practice;

export default function PracticeScreen() {
  const styles = useStyles();
  const { state, reload } = usePracticeHub();
  const data = state.status === 'success' ? state.data : null;
  const challengeDone = Boolean(data?.challenge?.completedAt);

  return (
    <Screen>
      <ScreenHeader title={strings.tabs.practice} />
      {state.status === 'loading' && <Skeleton height={180} radius="lg" />}
      {state.status === 'error' && <ErrorState onRetry={reload} />}

      {data && (
        <>
          <Card>
            <View style={styles.head}>
              <IconBadge icon="edit-3" color="typeProduction" size="lg" />
              <View style={styles.flex}>
                <Text variant="heading">{p.challengeTitle}</Text>
                <Chip label={challengeDone ? p.done : p.pending} selected={challengeDone} />
              </View>
            </View>
            <Text color="textMuted">{data.challenge?.promptPt ?? p.challengeNotGenerated}</Text>
            <Button
              label={challengeDone ? p.seeCorrection : p.doNow}
              icon={challengeDone ? 'eye' : 'play'}
              size="main"
              variant={challengeDone ? 'secondary' : 'primary'}
              onPress={() =>
                challengeDone && data.challenge?.correctionId
                  ? router.push(`/practice/correction/${data.challenge.correctionId}`)
                  : router.push('/practice/challenge')
              }
            />
          </Card>

          <ListGroup>
            <ListRow
              icon="book"
              iconColor="typeCloze"
              title={p.journal}
              subtitle={data.journal ? p.journalToday(data.journal.wordCount) : p.journalEmpty}
              onPress={() => router.push('/practice/journal')}
            />
            <ListRow icon="target" iconColor="typeError" title={p.quiz} subtitle={p.quizHint} onPress={() => router.push('/practice/quiz')} />
            <ListRow
              icon="message-circle"
              iconColor="rateEasy"
              title={p.conversation}
              subtitle={p.conversationHint}
              onPress={() => router.push('/practice/conversation')}
            />
            <ListRow
              icon="users"
              iconColor="typeError"
              title={strings.rehearsals.title}
              subtitle={data.nextRehearsal ? p.nextRehearsal(data.nextRehearsal.title) : strings.rehearsals.hubHint}
              onPress={() => router.push('/practice/rehearsals')}
            />
          </ListGroup>

          <ListGroup title={p.more}>
            <ListRow
              icon="headphones"
              iconColor="typeContext"
              title={strings.podcast.title}
              subtitle={data.podcastListened ? p.podcastListened : strings.podcast.hubHint}
              onPress={() => router.push('/practice/podcast')}
            />
            <ListRow
              icon="repeat"
              iconColor="typeCloze"
              title={strings.shadowing.title}
              subtitle={strings.shadowing.hubHint}
              onPress={() => router.push('/practice/shadowing')}
            />
            <ListRow
              icon="mic"
              iconColor="rateEasy"
              title={strings.speaking.title}
              subtitle={
                data.recordedThisMonth
                  ? strings.speaking.doneThisMonth(formatDayMonth(new Date(data.recordedThisMonth.createdAt)))
                  : strings.speaking.hubHint
              }
              onPress={() => router.push('/practice/speaking')}
            />
          </ListGroup>

          <ListGroup title={p.notebook}>
            {data.notebook.length === 0 ? (
              <ListRow icon="check-circle" iconColor="rateGood" title={p.notebookEmpty} />
            ) : (
              data.notebook.slice(0, 6).map((c) => (
                <ListRow
                  key={c.category}
                  icon="alert-circle"
                  iconColor="rateAgain"
                  title={categoryLabel(c.category)}
                  value={p.times(c.n)}
                  onPress={() => router.push(`/errors/${c.category}`)}
                />
              ))
            )}
          </ListGroup>
        </>
      )}
    </Screen>
  );
}

const useStyles = makeStyles((t) => ({
  flex: { flex: 1, gap: t.spacing.xs, alignItems: 'flex-start' },
  head: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.lg },
}));
