import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { forwardRef } from 'react';
import { Pressable, View, type TextInput } from 'react-native';

import { Icon } from '@/components/ui';
import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  multiline?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
  /** Teclado em inglês × português afeta autocorreção. */
  autoCorrect?: boolean;
  /** Botão extra antes do enviar (ex.: microfone). */
  accessory?: React.ReactNode;
};

/** Campo da Captura (dentro do bottom sheet) com botão de enviar redondo. */
export const CaptureInput = forwardRef<TextInput, Props>(function CaptureInput(
  { value, onChangeText, onSubmit, placeholder, multiline, autoFocus, disabled, autoCorrect = true, accessory },
  ref,
) {
  const theme = useTheme();
  const styles = useStyles();
  const canSend = value.trim().length > 0 && !disabled;

  return (
    <View style={styles.row}>
      <BottomSheetTextInput
        ref={ref as never}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        maxFontSizeMultiplier={theme.maxFontScale}
        accessibilityLabel={placeholder}
        autoFocus={autoFocus}
        autoCorrect={autoCorrect}
        multiline={multiline}
        submitBehavior={multiline ? 'newline' : 'submit'}
        returnKeyType="send"
        onSubmitEditing={() => canSend && onSubmit()}
        style={[styles.input, multiline && styles.multiline]}
      />
      {accessory}
      <Pressable
        onPress={onSubmit}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel={strings.common.send}
        accessibilityState={{ disabled: !canSend }}
        style={({ pressed }) => [styles.send, !canSend && styles.sendDisabled, pressed && styles.pressed]}
      >
        <Icon name="arrow-up" color="onPrimary" />
      </Pressable>
    </View>
  );
});

const useStyles = makeStyles((t) => ({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: t.spacing.sm },
  input: {
    ...t.typography.body,
    flex: 1,
    minHeight: t.sizes.touchTarget,
    maxHeight: t.sizes.multilineHeight * 1.5,
    color: t.colors.text,
    backgroundColor: t.colors.surfaceAlt,
    borderRadius: t.radii.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
  multiline: { textAlignVertical: 'top' },
  send: {
    width: t.sizes.touchTarget,
    height: t.sizes.touchTarget,
    borderRadius: t.radii.full,
    backgroundColor: t.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: t.opacity.disabled },
  pressed: { opacity: t.opacity.pressed },
}));
