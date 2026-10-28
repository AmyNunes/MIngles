import { Text } from '@/components/ui';
import { computeDiff } from '@/features/production/diff';
import { makeStyles, TINT, useTheme, withAlpha, type TypographyVariant } from '@/theme';

type Props = {
  original: string;
  corrected: string;
  variant?: TypographyVariant;
  /** Mostra um número discreto em cada alteração (tela de correção). */
  numbered?: boolean;
  /** Toque numa alteração (pelo número). */
  onPressChange?: (index: number) => void;
  /** Segurar uma alteração ("Discordo"). */
  onLongPressChange?: (index: number) => void;
  /** Alterações marcadas com "Discordo" ficam apagadas. */
  dimmed?: Set<number>;
};

export { computeDiff };

/**
 * Diff palavra a palavra calculado no aparelho (seção 10.5):
 * removido riscado, adicionado em destaque, com as cores do diff como fundo suave.
 */
export function DiffText({ original, corrected, variant = 'body', numbered, onPressChange, onLongPressChange, dimmed }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const parts = computeDiff(original, corrected);
  // O número fica menor, mas com a mesma altura de linha do parágrafo: no Android, alturas
  // de linha diferentes dentro do mesmo texto fazem a última linha ser cortada.
  const numberSize = { fontSize: theme.typography.caption.fontSize };

  return (
    <Text variant={variant}>
      {parts.map((p, i) => {
        if (p.type === 'same' || p.change == null) return p.text;
        const change = p.change;
        return (
          <Text
            key={i}
            variant={variant}
            style={[p.type === 'removed' ? styles.removed : styles.added, dimmed?.has(change) && styles.dimmed]}
            onPress={onPressChange ? () => onPressChange(change) : undefined}
            onLongPress={onLongPressChange ? () => onLongPressChange(change) : undefined}
            accessibilityRole={onPressChange ? 'button' : undefined}
            accessibilityLabel={`${p.type === 'removed' ? '−' : '+'} ${p.text}`}
          >
            {numbered && p.first ? (
              <Text variant={variant} style={[styles.number, numberSize]}>
                {`${change}`}
              </Text>
            ) : null}
            {p.text}
          </Text>
        );
      })}
    </Text>
  );
}

const useStyles = makeStyles((t) => ({
  // Cor do diff como fundo suave: o texto fica legível (AA) e riscado/negrito reforçam.
  removed: {
    color: t.colors.textMuted,
    textDecorationLine: 'line-through',
    backgroundColor: withAlpha(t.colors.diffRemove, TINT),
  },
  added: {
    color: t.colors.text,
    fontWeight: t.typography.heading.fontWeight,
    backgroundColor: withAlpha(t.colors.diffAdd, TINT * 1.5),
  },
  dimmed: { opacity: t.opacity.disabled },
  number: { color: t.colors.textMuted },
}));
