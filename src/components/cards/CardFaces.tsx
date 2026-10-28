import { View } from 'react-native';
import { Pressable as GHPressable } from 'react-native-gesture-handler';

import { Icon, Text } from '@/components/ui';
import type { CardContent } from '@/features/cards/content';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

import { DiffText } from './DiffText';
import { Segments } from './Segments';
import { TypeChip } from './TypeChip';

const c = strings.cards;
/** Mais que isto de detalhes vira "ver mais" (seção 7.3). */
const MAX_DETAIL_LINES = 4;

/** Botão de som dentro do card (do gesture-handler, para não brigar com o toque de virar). */
export function SpeakButton({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  const styles = useStyles();
  return (
    <GHPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={c.listen}
      hitSlop={theme.spacing.sm}
      style={styles.iconButton}
    >
      <Icon name="volume-2" color="textMuted" />
    </GHPressable>
  );
}

function SmallTextButton({ label, onPress, icon }: { label: string; onPress: () => void; icon?: 'zap' | 'chevron-down' }) {
  const styles = useStyles();
  const theme = useTheme();
  return (
    <GHPressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.textButton}>
      {icon && <Icon name={icon} color="primary" size={theme.sizes.iconSmall} />}
      <Text variant="label" color="primary">
        {label}
      </Text>
    </GHPressable>
  );
}

type FrontProps = {
  content: CardContent;
  sourceLabel?: string | null;
  showTapHint?: boolean;
  onSpeak?: () => void;
};

export function CardFront({ content, sourceLabel, showTapHint, onSpeak }: FrontProps) {
  const styles = useStyles();
  const { front } = content;

  return (
    <View style={styles.face}>
      <View style={styles.header}>
        <TypeChip type={content.type} />
        {front.speak && onSpeak && <SpeakButton onPress={onSpeak} />}
      </View>
      <View style={styles.center}>
        {front.prompt && (
          <Text variant="label" color="textMuted" align="center">
            {front.prompt}
          </Text>
        )}
        <Segments segments={front.main} />
        {front.hint && (
          <Text color="textMuted" align="center">
            {front.hint}
          </Text>
        )}
      </View>
      <View style={styles.footer}>
        {sourceLabel && (
          <Text variant="caption" color="textMuted" align="center" numberOfLines={1}>
            {sourceLabel}
          </Text>
        )}
        {showTapHint && (
          <Text variant="caption" color="textMuted" align="center">
            {c.tapToFlip}
          </Text>
        )}
      </View>
    </View>
  );
}

type BackProps = {
  content: CardContent;
  onSpeak?: () => void;
  /** "Explicar mais (IA)" ou, se já houver explicação salva, abrir os detalhes. */
  onExplainMore?: () => void;
  explaining?: boolean;
  hasExtra?: boolean;
  onSeeMore: () => void;
};

export function CardBack({ content, onSpeak, onExplainMore, explaining, hasExtra, onSeeMore }: BackProps) {
  const styles = useStyles();
  const { back } = content;
  const shown = back.details.slice(0, MAX_DETAIL_LINES - 1);
  const overflow = back.details.length > shown.length || back.details.some((d) => d.text.length > 140);

  return (
    <View style={styles.face}>
      <View style={styles.header}>
        <TypeChip type={content.type} />
        {back.speak && onSpeak && <SpeakButton onPress={onSpeak} />}
      </View>

      <View style={styles.answer}>
        {back.diff ? (
          <DiffText original={back.diff.original} corrected={back.diff.corrected} variant="heading" />
        ) : (
          <Segments segments={back.main} align="left" />
        )}
        {(back.ipa || back.chips?.length) && (
          <View style={styles.meta}>
            {back.ipa ? (
              <Text variant="label" color="textMuted">
                /{back.ipa.replace(/^\/|\/$/g, '')}/
              </Text>
            ) : null}
            {back.chips?.map((chip) => (
              <Text key={chip} variant="caption" color="textMuted" style={styles.metaChip}>
                {chip}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.divider} />

      <View style={styles.details}>
        {shown.map((d) => (
          <Text
            key={d.text}
            color={d.en ? 'text' : 'textMuted'}
            numberOfLines={3}
            style={d.en && styles.english}
          >
            {d.label ? `${d.label}: ` : ''}
            {d.text}
          </Text>
        ))}
      </View>

      <View style={styles.actions}>
        {overflow && <SmallTextButton label={strings.common.seeMore} icon="chevron-down" onPress={onSeeMore} />}
        {onExplainMore && (
          <SmallTextButton
            label={explaining ? c.explaining : hasExtra ? c.moreTitle : c.explainMore}
            icon="zap"
            onPress={hasExtra ? onSeeMore : onExplainMore}
          />
        )}
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  face: { flex: 1, padding: t.spacing.xxl, gap: t.spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: t.sizes.touchTarget - t.spacing.md },
  center: { flex: 1, justifyContent: 'center', gap: t.spacing.md },
  footer: { gap: t.spacing.xs },
  answer: { gap: t.spacing.sm },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: t.spacing.sm },
  metaChip: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs / 2,
    borderRadius: t.radii.sm,
    backgroundColor: t.colors.surfaceAlt,
  },
  divider: { height: 1, backgroundColor: t.colors.border },
  details: { flex: 1, gap: t.spacing.sm },
  english: { fontStyle: 'italic' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.lg },
  iconButton: {
    width: t.sizes.touchTarget,
    height: t.sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -t.spacing.md,
  },
  textButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    minHeight: t.sizes.touchTarget,
  },
}));
