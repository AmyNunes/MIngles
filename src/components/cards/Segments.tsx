import { useState } from 'react';
import type { TextStyle } from 'react-native';

import { Text } from '@/components/ui';
import type { Segment } from '@/features/cards/content';
import { makeStyles, TINT, useTheme, withAlpha } from '@/theme';
import { useSettings } from '@/stores/settingsStore';

type Props = {
  segments: Segment[];
  /** `main` = conteúdo principal do card; `body` = texto comum. */
  size?: 'main' | 'body';
  align?: 'left' | 'center';
};

const SCALE = { sm: 0.85, md: 1, lg: 1.15 } as const;
const SHRINK_AFTER_LINES = 3;

/**
 * Frase do card com o termo realçado (em `primary`) ou a lacuna "____".
 * No tamanho principal, se passar de 3 linhas, reduz para 20/28 (seção 7.3).
 */
export function Segments({ segments, size = 'main', align = 'center' }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const cardSize = useSettings((s) => s.appearance.cardTextSize);
  const [shrink, setShrink] = useState(false);

  const base: TextStyle =
    size === 'main'
      ? {
          fontSize: theme.typography[shrink ? 'cardMainSmall' : 'cardMain'].fontSize * SCALE[cardSize],
          lineHeight: theme.typography[shrink ? 'cardMainSmall' : 'cardMain'].lineHeight * SCALE[cardSize],
          fontWeight: theme.typography.cardMain.fontWeight,
        }
      : {};

  return (
    <Text
      variant={size === 'main' ? 'cardMain' : 'body'}
      align={align}
      style={base}
      onTextLayout={(e) => {
        if (size === 'main' && !shrink && e.nativeEvent.lines.length > SHRINK_AFTER_LINES) setShrink(true);
      }}
    >
      {segments.map((s, i) =>
        s.kind === 'highlight' ? (
          <Text key={i} variant={size === 'main' ? 'cardMain' : 'body'} style={[base, styles.highlight]}>
            {s.text}
          </Text>
        ) : s.kind === 'blank' ? (
          <Text
            key={i}
            variant={size === 'main' ? 'cardMain' : 'body'}
            style={[base, styles.blank, { backgroundColor: withAlpha(theme.colors.typeCloze, TINT) }]}
          >
            {` ${s.text} `}
          </Text>
        ) : (
          s.text
        ),
      )}
    </Text>
  );
}

const useStyles = makeStyles((t) => ({
  highlight: { color: t.colors.primary },
  blank: { color: t.colors.text, letterSpacing: t.tracking.caps },
}));
