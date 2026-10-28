import { Pressable, View } from 'react-native';

import { SpeakButton } from '@/components/cards/CardFaces';
import { Button, Icon, Text } from '@/components/ui';
import type { HowDoISayResult } from '@/ai/schemas/cards';
import { registerLabel } from '@/features/cards/content';
import { strings } from '@/i18n/strings';
import { speak } from '@/lib/speech';
import { makeStyles, TINT, useTheme, withAlpha } from '@/theme';

const c = strings.capture;

type Props = {
  data: HowDoISayResult;
  selected: number[];
  onToggle: (index: number) => void;
  onSave: () => void;
  saving: boolean;
};

/** "Como eu digo?": 2–3 opções com registro e observação; cada uma com "Salvar como card". */
export function HowDoISayResultView({ data, selected, onToggle, onSave, saving }: Props) {
  const theme = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.wrapper}>
      {data.options.map((option, i) => {
        const checked = selected.includes(i);
        return (
          <View key={option.en} style={[styles.option, checked && styles.optionChecked]}>
            <View style={styles.top}>
              <View style={styles.tags}>
                {i === data.bestIndex && (
                  <View style={[styles.tag, { backgroundColor: withAlpha(theme.colors.rateGood, TINT) }]}>
                    <Icon name="star" color="rateGood" size={theme.sizes.iconSmall} />
                    <Text variant="caption">{c.mostNatural}</Text>
                  </View>
                )}
                <View style={styles.tag}>
                  <Text variant="caption" color="textMuted">
                    {registerLabel(option.register)}
                  </Text>
                </View>
              </View>
              <SpeakButton onPress={() => speak(option.en)} />
            </View>
            <Text variant="heading">{option.en}</Text>
            {option.notePt ? <Text color="textMuted">{option.notePt}</Text> : null}
            <Pressable
              onPress={() => onToggle(i)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={`${c.saveAsCard}: ${option.en}`}
              style={styles.check}
            >
              <View style={[styles.box, checked && styles.boxChecked]}>
                {checked && <Icon name="check" color="onPrimary" size={theme.sizes.iconSmall} />}
              </View>
              <Text variant="label">{c.saveAsCard}</Text>
            </Pressable>
          </View>
        );
      })}
      <Button
        label={c.saveCards(selected.length)}
        icon="bookmark"
        size="main"
        onPress={onSave}
        loading={saving}
        disabled={selected.length === 0}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  wrapper: { gap: t.spacing.md },
  option: {
    gap: t.spacing.sm,
    padding: t.spacing.lg,
    borderRadius: t.radii.md,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  optionChecked: { borderColor: t.colors.primary },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, flex: 1 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs / 2,
    borderRadius: t.radii.sm,
    backgroundColor: t.colors.surfaceAlt,
  },
  check: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.md, minHeight: t.sizes.touchTarget },
  box: {
    width: t.sizes.iconSmall + t.spacing.sm,
    height: t.sizes.iconSmall + t.spacing.sm,
    borderRadius: t.radii.sm,
    borderWidth: 2,
    borderColor: t.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
}));
