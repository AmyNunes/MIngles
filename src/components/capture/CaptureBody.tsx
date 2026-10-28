import { View } from 'react-native';

import { Button, Notice, Skeleton } from '@/components/ui';
import type { useCapture } from '@/features/capture/useCapture';
import type { ThinkState } from '@/features/capture/useThink';
import type { CaptureMode } from '@/features/settings/schemas';
import { strings } from '@/i18n/strings';
import type { Token } from '@/lib/tokenize';
import { makeStyles } from '@/theme';

import { HowDoISayResultView } from './HowDoISayResultView';
import { SentencePicker } from './SentencePicker';
import { TermResultView } from './TermResultView';
import { ThinkResult } from './ThinkPrompt';

type Props = {
  mode: CaptureMode;
  capture: ReturnType<typeof useCapture>;
  think: ThinkState;
  sentence: string | null;
  sentenceTokens: Token[] | null;
  range: [number, number] | null;
  onRangeChange: (r: [number, number] | null) => void;
  onSave: () => void;
};

/** O que aparece abaixo do campo: carregando, erro, seletor de palavras ou resultado. */
export function CaptureBody({ mode, capture, think, sentence, sentenceTokens, range, onRangeChange, onSave }: Props) {
  const styles = useStyles();
  const { state } = capture;

  if (mode === 'think') return <ThinkResult think={think} />;

  return (
    <View style={styles.wrapper}>
      {sentenceTokens && sentence && state.status !== 'result' && (
        <SentencePicker
          tokens={sentenceTokens}
          range={range}
          onChange={onRangeChange}
          onExplain={(term) => void capture.askTerm(term, sentence)}
        />
      )}

      {state.status === 'loading' && (
        <View style={styles.loading} accessibilityLabel={strings.common.loading}>
          <Skeleton height={28} width="55%" />
          <Skeleton height={18} width="90%" />
          <Skeleton height={18} width="75%" />
          <Skeleton height={56} radius="md" />
        </View>
      )}

      {state.status === 'error' && (
        <Notice tone="error" action={<Button label={strings.common.retry} variant="secondary" icon="refresh-cw" onPress={state.retry} />}>
          {state.message}
        </Notice>
      )}

      {state.status === 'result' && state.result.kind === 'howDoISay' && (
        <HowDoISayResultView
          data={state.result.data}
          selected={state.result.selected}
          onToggle={capture.toggleOption}
          onSave={onSave}
          saving={capture.saving}
        />
      )}

      {state.status === 'result' && state.result.kind === 'term' && (
        <TermResultView data={state.result.data} cardTypes={state.result.cardTypes} onSave={onSave} saving={capture.saving} />
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { gap: t.spacing.lg },
  loading: { gap: t.spacing.md },
}));
