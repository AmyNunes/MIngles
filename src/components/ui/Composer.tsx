import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { strings } from '@/i18n/strings';
import { makeStyles, useTheme } from '@/theme';

import { IconButton } from './IconButton';

type Props = {
  placeholder: string;
  onSend: (text: string) => void;
  disabled?: boolean;
  /** Botão extra à esquerda do enviar (ex.: microfone). */
  accessory?: React.ReactNode;
};

/** Barra de mensagem (conversa, ensaio): campo de várias linhas + enviar. */
export function Composer({ placeholder, onSend, disabled, accessory }: Props) {
  const theme = useTheme();
  const styles = useStyles();
  const [draft, setDraft] = useState('');

  const send = () => {
    if (!draft.trim() || disabled) return;
    onSend(draft.trim());
    setDraft('');
  };

  return (
    <View style={styles.bar}>
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        selectionColor={theme.colors.primary}
        maxFontSizeMultiplier={theme.maxFontScale}
        accessibilityLabel={placeholder}
        multiline
        style={styles.input}
      />
      {accessory}
      <IconButton icon="send" color="primary" accessibilityLabel={strings.common.send} disabled={!draft.trim() || disabled} onPress={send} />
    </View>
  );
}

/** Para quem precisa preencher o campo por fora (ex.: ditado por voz). */
export type ComposerProps = Props;

const useStyles = makeStyles((t) => ({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: t.spacing.xs,
    padding: t.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  input: {
    ...t.typography.body,
    flex: 1,
    maxHeight: t.sizes.multilineHeight,
    minHeight: t.sizes.touchTarget,
    color: t.colors.text,
    backgroundColor: t.colors.surfaceAlt,
    borderRadius: t.radii.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
  },
}));
