import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { AIError, toAIError } from '@/ai/client';
import { cachedExplainTerm, explainTerm } from '@/ai/functions/cards';
import type { ExplainTermResult } from '@/ai/schemas/cards';
import { TermResultView } from '@/components/capture/TermResultView';
import { Button, Notice, Sheet, Skeleton } from '@/components/ui';
import { cardTypesForNew, termNoteFrom, type NoteSource } from '@/features/cards/noteService';
import { saveNotesInteractive } from '@/features/cards/saveInteractive';
import { queueExplainLater } from '@/features/reader/offlineQueue';
import { markKnown } from '@/features/reader/vocabService';
import { strings } from '@/i18n/strings';
import { showSnackbar } from '@/stores/snackbarStore';
import { makeStyles } from '@/theme';

const p = strings.reader.panel;

export type PanelTarget = { term: string; sentence: string; paragraph: number; sentenceIndex: number };

type State = (
  | { status: 'loading' }
  | { status: 'ready'; data: ExplainTermResult; fromCache: boolean }
  | { status: 'offline' }
  | { status: 'error'; message: string }
) & {
  /** Para qual palavra/frase é este resultado. */
  for: string;
};

type Props = {
  target: PanelTarget | null;
  source: NoteSource;
  onClose: () => void;
  onTranslateSentence: (target: PanelTarget) => void;
  /** Depois de salvar ou marcar "Já conheço" (para atualizar o realce). */
  onVocabChanged: () => void;
};

/** Painel da palavra (seção 8.4): significado neste contexto, Salvar card, Já conheço, Traduzir frase. */
export function WordPanel({ target, source, onClose, onTranslateSentence, onVocabChanged }: Props) {
  const styles = useStyles();
  const [result, setState] = useState<State>({ status: 'loading', for: '' });
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const term = target?.term;
  const sentence = target?.sentence;
  const key = target ? `${target.term}|${target.sentence}` : '';
  const state: State = result.for === key ? result : { status: 'loading', for: key };

  useEffect(() => {
    if (!term) return;
    let alive = true;
    explainTerm({ term, sentence })
      .then(({ data, cached }) => alive && setState({ status: 'ready', data, fromCache: cached, for: key }))
      .catch(async (error: unknown) => {
        if (error instanceof AIError && (error.kind === 'offline' || error.kind === 'timeout')) {
          const cached = await cachedExplainTerm({ term, sentence });
          if (alive) setState(cached ? { status: 'ready', data: cached, fromCache: true, for: key } : { status: 'offline', for: key });
          return;
        }
        if (alive) setState({ status: 'error', message: toAIError(error).messagePt, for: key });
      });
    return () => {
      alive = false;
    };
  }, [term, sentence, key, attempt]);

  const close = () => onClose();

  const extra = target && (
    <View style={styles.actions}>
      <Button
        label={p.known}
        icon="check"
        variant="secondary"
        onPress={async () => {
          await markKnown(target.term);
          showSnackbar(p.markedKnown);
          onVocabChanged();
          close();
        }}
      />
      <Button label={p.translateSentence} icon="globe" variant="ghost" onPress={() => onTranslateSentence(target)} />
    </View>
  );

  return (
    <Sheet visible={target != null} onClose={close} title={target?.term} snapPoints={['60%', '90%']}>
      {state.status === 'loading' && (
        <View style={styles.loading} accessibilityLabel={strings.common.loading}>
          <Skeleton height={28} width="50%" />
          <Skeleton height={18} width="85%" />
          <Skeleton height={56} radius="md" />
        </View>
      )}
      {state.status === 'ready' && target && (
        <>
          {state.fromCache && <Notice icon="wifi-off">{p.fromCache}</Notice>}
          <TermResultView
            data={state.data}
            cardTypes={cardTypesForNew(termNoteFrom(state.data, target, source))}
            saving={saving}
            onSave={async () => {
              setSaving(true);
              try {
                const saved = await saveNotesInteractive([termNoteFrom(state.data, target, source)]);
                if (saved) {
                  onVocabChanged();
                  close();
                }
              } finally {
                setSaving(false);
              }
            }}
            extraActions={extra}
          />
        </>
      )}
      {state.status === 'offline' && target && (
        <>
          <Notice icon="wifi-off">{p.offline}</Notice>
          <Button
            label={p.saveLater}
            icon="clock"
            size="main"
            onPress={async () => {
              await queueExplainLater({ term: target.term, sentence: target.sentence, source });
              showSnackbar(p.queued);
              close();
            }}
          />
          {extra}
        </>
      )}
      {state.status === 'error' && (
        <Notice
          tone="error"
          action={
            <Button
              label={strings.common.retry}
              variant="secondary"
              icon="refresh-cw"
              onPress={() => {
                setState({ status: 'loading', for: key });
                setAttempt((a) => a + 1);
              }}
            />
          }
        >
          {state.message}
        </Notice>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  loading: { gap: t.spacing.md },
  actions: { gap: t.spacing.sm },
}));
