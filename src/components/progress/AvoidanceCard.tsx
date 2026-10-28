import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { toAIError } from '@/ai/client';
import { Button, Card, Chip, Notice, Text } from '@/components/ui';
import { AVOIDANCE_MIN_WORDS, generateAvoidance, type loadAvoidance } from '@/features/progress/progressService';
import { strings } from '@/i18n/strings';
import { formatDayMonth } from '@/lib/dates';
import { makeStyles } from '@/theme';

const a = strings.progress.avoidance;

type Stored = Awaited<ReturnType<typeof loadAvoidance>>;

/** Abre um desafio feito sob medida (sem ocupar o Desafio do dia). */
function openCustomChallenge(prompt: string, items: string[]) {
  router.push({ pathname: '/practice/challenge', params: { custom: JSON.stringify({ prompt, items }) } });
}

/** "Palavras que você evita" (Fase 6): aparece depois de 1.000 palavras escritas. */
export function AvoidanceCard({ words, stored, onUpdated }: { words: number; stored: Stored; onUpdated: () => void }) {
  const styles = useStyles();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await generateAvoidance();
      onUpdated();
    } catch (e) {
      setError(toAIError(e).messagePt);
    } finally {
      setBusy(false);
    }
  };

  if (words < AVOIDANCE_MIN_WORDS) {
    return (
      <Card title={a.title}>
        <Text color="textMuted">{a.locked(words)}</Text>
      </Card>
    );
  }

  return (
    <Card title={a.title}>
      {error && <Notice tone="error">{error}</Notice>}
      {!stored ? (
        <Button label={busy ? a.generating : a.generate} icon="search" loading={busy} onPress={() => void run()} />
      ) : (
        <>
          {stored.report.overused.length > 0 && (
            <View style={styles.block}>
              <Text variant="label" color="textMuted">
                {a.overused}
              </Text>
              {stored.report.overused.map((o) => (
                <View key={o.word} style={styles.item}>
                  <Text variant="heading">{`${o.word} · ${strings.practice.times(o.count)}`}</Text>
                  <View style={styles.chips}>
                    {o.alternatives.map((alt) => (
                      <Chip key={alt} label={alt} />
                    ))}
                  </View>
                  <Button
                    label={a.createChallenge}
                    icon="edit-3"
                    variant="ghost"
                    onPress={() => openCustomChallenge(`${a.challengeOverused(o.word)}`, o.alternatives.slice(0, 2))}
                  />
                </View>
              ))}
            </View>
          )}
          {stored.report.avoidedStructures.length > 0 && (
            <View style={styles.block}>
              <Text variant="label" color="textMuted">
                {a.structures}
              </Text>
              {stored.report.avoidedStructures.map((s) => (
                <View key={s.structure} style={styles.item}>
                  <Text variant="heading">{s.structure}</Text>
                  {s.explanationPt ? <Text color="textMuted">{s.explanationPt}</Text> : null}
                  {s.example ? <Text style={styles.italic}>{s.example}</Text> : null}
                  <Button
                    label={a.createChallenge}
                    icon="edit-3"
                    variant="ghost"
                    onPress={() => openCustomChallenge(a.challengeStructure(s.structure), [s.structure])}
                  />
                </View>
              ))}
            </View>
          )}
          <Text variant="caption" color="textMuted">
            {a.generatedAt(formatDayMonth(new Date(stored.createdAt)))}
          </Text>
          <Button label={busy ? a.generating : a.refresh} icon="refresh-cw" variant="secondary" loading={busy} onPress={() => void run()} />
        </>
      )}
    </Card>
  );
}

const useStyles = makeStyles((t) => ({
  block: { gap: t.spacing.md },
  item: { gap: t.spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  italic: { fontStyle: 'italic' },
}));
