import { View } from 'react-native';

import { Button, Chip, Notice, Sheet, Text, Toggle } from '@/components/ui';
import type { Edit } from '@/ai/schemas/production';
import type { EditDecision } from '@/features/production/correctionService';
import { categoryLabel, SEVERITY_LABELS } from '@/features/errors/taxonomy';
import { strings } from '@/i18n/strings';
import { makeStyles } from '@/theme';

const c = strings.correction;

type Props = {
  edit: Edit | null;
  decision: EditDecision | null;
  readOnly: boolean;
  onClose: () => void;
  onToggleSave: () => void;
  onToggleDispute: () => void;
};

/** Explicação de uma alteração: antes → depois, categoria, gravidade, "Salvar como card" e "Discordo". */
export function ChangeSheet({ edit, decision, readOnly, onClose, onToggleSave, onToggleDispute }: Props) {
  const styles = useStyles();

  return (
    <Sheet visible={edit != null} onClose={onClose} title={edit ? categoryLabel(edit.category) : ''}>
      {edit && decision && (
        <>
          <View style={styles.compare}>
            <View style={styles.side}>
              <Text variant="caption" color="textMuted">
                {c.before}
              </Text>
              <Text style={styles.before}>{edit.original || '—'}</Text>
            </View>
            <View style={styles.side}>
              <Text variant="caption" color="textMuted">
                {c.after}
              </Text>
              <Text variant="heading">{edit.corrected || '—'}</Text>
            </View>
          </View>
          <View style={styles.chips}>
            <Chip label={categoryLabel(edit.category)} icon="tag" />
            <Chip label={SEVERITY_LABELS[edit.severity]} icon="alert-circle" />
          </View>
          {edit.explanationPt ? <Text>{edit.explanationPt}</Text> : null}
          {edit.exampleEn ? (
            <Text color="textMuted" style={styles.example}>
              {edit.exampleEn}
            </Text>
          ) : null}

          {decision.disputed ? (
            <Notice icon="slash">{c.disagreed}</Notice>
          ) : (
            <View style={styles.toggleRow}>
              <Text style={styles.flex}>{c.saveAsCard}</Text>
              <Toggle accessibilityLabel={c.saveAsCard} value={decision.saveCard} onValueChange={onToggleSave} disabled={readOnly} />
            </View>
          )}
          {!readOnly && (
            <Button
              label={decision.disputed ? c.agreeAgain : c.disagree}
              icon={decision.disputed ? 'rotate-ccw' : 'slash'}
              variant="secondary"
              onPress={onToggleDispute}
            />
          )}
        </>
      )}
    </Sheet>
  );
}

const useStyles = makeStyles((t) => ({
  compare: { flexDirection: 'row', gap: t.spacing.lg },
  side: { flex: 1, gap: t.spacing.xs },
  before: { textDecorationLine: 'line-through', color: t.colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm },
  example: { fontStyle: 'italic' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md },
  flex: { flex: 1 },
}));
